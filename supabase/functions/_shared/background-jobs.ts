import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Logger } from './monitoring.ts';

/**
 * Background job system для долгих операций
 * Использует Supabase как job queue
 */

export enum JobType {
  TERRA_BACKFILL = 'terra_backfill',
  APPLE_HEALTH_IMPORT = 'apple_health_import',
  INBODY_ANALYSIS = 'inbody_analysis',
  CONFIDENCE_CALCULATION = 'confidence_calculation',
  DATA_EXPORT = 'data_export',
  WEBHOOK_PROCESSING = 'webhook_processing',
}

export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export interface Job {
  id: string;
  type: JobType;
  status: JobStatus;
  payload: any;
  result?: any;
  error?: string;
  attempts: number;
  max_attempts: number;
  scheduled_at?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export class JobQueue {
  private supabase;
  private logger: Logger;

  constructor() {
    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    this.logger = new Logger('job-queue');
  }

  /**
   * Enqueue a new job
   */
  async enqueue(
    type: JobType,
    payload: any,
    options?: {
      maxAttempts?: number;
      scheduledAt?: Date;
    }
  ): Promise<Job> {
    const { data, error } = await this.supabase
      .from('background_jobs')
      .insert({
        type,
        payload,
        status: 'pending',
        attempts: 0,
        max_attempts: options?.maxAttempts || 3,
        scheduled_at: (options?.scheduledAt || new Date()).toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    await this.logger.info('Job enqueued', {
      jobId: data.id,
      type,
    });

    return data;
  }

  /**
   * Dequeue next pending job
   */
  async dequeue(type?: JobType): Promise<Job | null> {
    const now = new Date().toISOString();

    // Find next job (include NULL scheduled_at)
    let query = this.supabase
      .from('background_jobs')
      .select('*')
      .eq('status', JobStatus.PENDING)
      .or(`scheduled_at.is.null,scheduled_at.lte.${now}`)
      .order('created_at', { ascending: true })
      .limit(1);

    if (type) {
      query = query.eq('type', type);
    }

    const { data: jobs } = await query;

    if (!jobs || jobs.length === 0) {
      await this.logger.info('No jobs to process', {
        type: type || 'any',
        now,
      });
      return null;
    }

    const job = jobs[0];

    // Mark as processing
    const { data: updatedJob, error } = await this.supabase
      .from('background_jobs')
      .update({
        status: JobStatus.PROCESSING,
        started_at: new Date().toISOString(),
        attempts: (job.attempts ?? 0) + 1,
      })
      .eq('id', job.id)
      .eq('status', JobStatus.PENDING) // Prevent race condition
      .select()
      .single();

    if (error) return null; // Another worker grabbed it

    return updatedJob;
  }

  /**
   * Mark job as completed
   */
  async complete(jobId: string, result: any): Promise<void> {
    await this.supabase
      .from('background_jobs')
      .update({
        status: JobStatus.COMPLETED,
        result,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    await this.logger.info('Job completed', { jobId });
  }

  /**
   * Mark job as failed
   */
  async fail(jobId: string, error: string, retry: boolean = true): Promise<void> {
    const { data: job } = await this.supabase
      .from('background_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (!job) return;

    // Check if should retry
    if (retry && job.attempts < job.max_attempts) {
      // Reset to pending for retry with exponential backoff
      const backoffMinutes = Math.pow(2, job.attempts); // 2, 4, 8 minutes
      const scheduledAt = new Date();
      scheduledAt.setMinutes(scheduledAt.getMinutes() + backoffMinutes);

      await this.supabase
        .from('background_jobs')
        .update({
          status: JobStatus.PENDING,
          error,
          scheduled_at: scheduledAt.toISOString(),
        })
        .eq('id', jobId);

      await this.logger.warn('Job failed, will retry', {
        jobId,
        attempt: job.attempts,
        nextRetry: scheduledAt,
      });
    } else {
      // Max attempts reached
      await this.supabase
        .from('background_jobs')
        .update({
          status: JobStatus.FAILED,
          error,
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      await this.logger.error('Job failed permanently', {
        jobId,
        error,
      });
    }
  }

  /**
   * Get job status
   */
  async getStatus(jobId: string): Promise<Job | null> {
    const { data, error } = await this.supabase
      .from('background_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) return null;
    return data;
  }
}
