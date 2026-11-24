import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from './auth';
import { Role, SessionUser } from '@/types';
import prisma from './prisma';

export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Forbidden: insufficient permissions') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/**
 * Asserts the request has an authenticated user with one of the allowed roles.
 * Returns the SessionUser or throws a ForbiddenError / UnauthorizedError.
 */
export async function assertRole(req: NextRequest, allowedRoles: Role[]): Promise<SessionUser> {
  const user = await getCurrentUser(req);
  if (!user) {
    throw new UnauthorizedError('Authentication required');
  }

  if (!allowedRoles.includes(user.role)) {
    throw new ForbiddenError(
      `Role '${user.role}' is not authorized to access this resource. Allowed roles: [${allowedRoles.join(', ')}]`
    );
  }

  return user;
}

/**
 * Helper to produce standard JSON error responses for RBAC violations.
 */
export function rbacErrorResponse(err: unknown) {
  if (err instanceof UnauthorizedError) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
  if (err instanceof ForbiddenError) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
  console.error('Unexpected error in handler:', err);
  return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
}

/**
 * Strict server-side check for Delivery/Ops Agent scoping.
 * PRD §3 & §5 Module H: Agent can only access the ONE order currently assigned to them.
 */
export async function assertAgentOrderAccess(agentId: string, orderId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: agentId },
    select: { role: true },
  });
  if (user?.role === 'ADMIN') return true;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { agentId: true, orderId: true },
  });

  if (!order || order.agentId !== agentId) {
    throw new ForbiddenError(
      `Agent is strictly unauthorized to view or modify unassigned order ${orderId}`
    );
  }

  return true;
}

/**
 * Strict server-side check for Vendor scoping.
 * Vendor can only access their own inventory and assigned orders.
 */
export async function assertVendorOwnership(vendorId: string, resource: { vendorId?: string | null }): Promise<boolean> {
  if (resource.vendorId !== vendorId) {
    throw new ForbiddenError('Vendor is unauthorized to access resources belonging to other vendors');
  }
  return true;
}
