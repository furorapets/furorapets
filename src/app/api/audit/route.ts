import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { assertRole, rbacErrorResponse } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

// GET /api/audit - Admin only view of immutable audit logs
export async function GET(req: NextRequest) {
  try {
    await assertRole(req, ['ADMIN']);

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    const where: any = {};
    if (action) where.action = action;

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        order: { select: { id: true, orderId: true, status: true } },
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    return NextResponse.json({ success: true, data: logs });
  } catch (error) {
    return rbacErrorResponse(error);
  }
}
