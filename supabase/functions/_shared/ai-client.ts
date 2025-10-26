import { EdgeFunctionError, ErrorCode } from './error-handling.ts';
import { Logger } from './monitoring.ts';

/**
 * AI Provider types
 */
export enum AIProvider {
  LOVABLE = 'lovable',
  OPENAI = 'openai', // Legacy fallback
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AICompletionRequest {
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface AICompletionResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  provider: AIProvider;
}

/**
 * Lovable AI Gateway Client
 * Using Gemini 2.5 Flash by default
 */
class LovableAIClient {
  private apiKey: string;
  private baseUrl: string = 'https://ai.gateway.lovable.dev/v1';
  private logger: Logger;

  constructor() {
    this.apiKey = Deno.env.get('LOVABLE_API_KEY')!;
    this.logger = new Logger('lovable-ai-client');

    if (!this.apiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash', // Lovable default
          messages: request.messages,
          temperature: request.temperature ?? 0.7,
          max_tokens: request.maxTokens ?? 2000,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        
        // Handle rate limits and payment errors
        if (response.status === 429) {
          throw new EdgeFunctionError(
            ErrorCode.RATE_LIMIT_EXCEEDED,
            'AI rate limit exceeded, please try again later',
            429
          );
        }
        
        if (response.status === 402) {
          throw new EdgeFunctionError(
            ErrorCode.EXTERNAL_API_ERROR,
            'AI payment required, please add funds to your Lovable workspace',
            402
          );
        }
        
        throw new EdgeFunctionError(
          ErrorCode.EXTERNAL_API_ERROR,
          `Lovable AI API error: ${error}`,
          response.status
        );
      }

      const data = await response.json();
      
      const duration = Date.now() - startTime;
      await this.logger.info('AI completion successful', {
        provider: AIProvider.LOVABLE,
        duration_ms: duration,
        tokens: data.usage?.total_tokens,
      });

      return {
        content: data.choices[0].message.content,
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
            }
          : undefined,
        provider: AIProvider.LOVABLE,
      };
    } catch (error) {
      await this.logger.error('AI completion failed', {
        provider: AIProvider.LOVABLE,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

/**
 * Legacy OpenAI Client (fallback)
 */
class OpenAIClient {
  private apiKey: string;
  private logger: Logger;

  constructor() {
    this.apiKey = Deno.env.get('OPENAI_API_KEY')!;
    this.logger = new Logger('openai-client');
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 2000,
      }),
    });

    if (!response.ok) {
      throw new EdgeFunctionError(
        ErrorCode.EXTERNAL_API_ERROR,
        `OpenAI API error: ${response.statusText}`,
        response.status
      );
    }

    const data = await response.json();

    return {
      content: data.choices[0].message.content,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
      provider: AIProvider.OPENAI,
    };
  }
}

/**
 * Unified AI Client with automatic fallback
 */
export class AIClient {
  private primaryProvider: AIProvider;
  private lovableClient?: LovableAIClient;
  private openaiClient?: OpenAIClient;

  constructor(primaryProvider: AIProvider = AIProvider.LOVABLE) {
    this.primaryProvider = primaryProvider;

    // Initialize clients
    try {
      this.lovableClient = new LovableAIClient();
    } catch (e) {
      console.warn('Lovable AI not available:', e);
    }

    try {
      this.openaiClient = new OpenAIClient();
    } catch (e) {
      console.warn('OpenAI not available:', e);
    }

    if (!this.lovableClient && !this.openaiClient) {
      throw new Error('No AI provider configured');
    }
  }

  /**
   * Complete with automatic fallback
   */
  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    // Try primary provider
    if (this.primaryProvider === AIProvider.LOVABLE && this.lovableClient) {
      try {
        return await this.lovableClient.complete(request);
      } catch (error) {
        console.error('Lovable AI failed, falling back to OpenAI:', error);
        
        if (this.openaiClient) {
          return await this.openaiClient.complete(request);
        }
        throw error;
      }
    }

    // Fallback to OpenAI
    if (this.openaiClient) {
      return await this.openaiClient.complete(request);
    }

    throw new EdgeFunctionError(
      ErrorCode.INTERNAL_ERROR,
      'No AI provider available'
    );
  }
}

/**
 * Factory function
 */
export function createAIClient(
  provider: AIProvider = AIProvider.LOVABLE
): AIClient {
  return new AIClient(provider);
}
