import { supabase } from '@/integrations/supabase/client';

interface SecurityAuditParams {
  userId: string;
  actionType: string;
  resourceType?: string;
  resourceId?: string;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

/**
 * Log security-sensitive actions for audit trail
 */
export async function logSecurityAudit(params: SecurityAuditParams) {
  try {
    const { error } = await supabase
      .from('security_audit_log')
      .insert({
        user_id: params.userId,
        action_type: params.actionType,
        resource_type: params.resourceType,
        resource_id: params.resourceId,
        success: params.success,
        error_message: params.errorMessage,
        metadata: params.metadata || {},
        ip_address: null, // Client-side can't reliably get IP
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null
      });

    if (error) {
      console.error('Failed to log security audit:', error);
    }
  } catch (error) {
    console.error('Security audit logging error:', error);
  }
}

/**
 * Log authentication attempts
 */
export async function logAuthAttempt(
  userId: string,
  method: 'email' | 'google' | 'password_reset',
  success: boolean,
  errorMessage?: string
) {
  return logSecurityAudit({
    userId,
    actionType: `auth_${method}`,
    resourceType: 'authentication',
    success,
    errorMessage,
    metadata: { method }
  });
}

/**
 * Log sensitive data access
 */
export async function logDataAccess(
  userId: string,
  resourceType: string,
  resourceId: string,
  success: boolean
) {
  return logSecurityAudit({
    userId,
    actionType: 'data_access',
    resourceType,
    resourceId,
    success,
    metadata: { accessType: 'read' }
  });
}

/**
 * Log permission changes
 */
export async function logPermissionChange(
  adminId: string,
  targetUserId: string,
  action: 'grant' | 'revoke',
  permission: string
) {
  return logSecurityAudit({
    userId: adminId,
    actionType: `permission_${action}`,
    resourceType: 'user_roles',
    resourceId: targetUserId,
    success: true,
    metadata: { permission, targetUserId }
  });
}

/**
 * Log integration connections
 */
export async function logIntegrationConnection(
  userId: string,
  integration: string,
  action: 'connect' | 'disconnect',
  success: boolean,
  errorMessage?: string
) {
  return logSecurityAudit({
    userId,
    actionType: `integration_${action}`,
    resourceType: 'integration',
    success,
    errorMessage,
    metadata: { integration }
  });
}
