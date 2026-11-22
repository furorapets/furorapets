import prisma from './prisma';

export interface AuditLogParams {
  orderId?: string | null;
  userId?: string | null;
  action: string;
  fromState?: string | null;
  toState?: string | null;
  metadata?: Record<string, any> | null;
}

export async function logAudit(params: AuditLogParams) {
  try {
    return await prisma.auditLog.create({
      data: {
        orderId: params.orderId || null,
        userId: params.userId || null,
        action: params.action,
        fromState: params.fromState || null,
        toState: params.toState || null,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
    return null;
  }
}
