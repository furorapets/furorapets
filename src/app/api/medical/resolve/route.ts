import { NextRequest, NextResponse } from 'next/server';
import { assertRole, rbacErrorResponse } from '@/lib/rbac';
import { resolveMedicalFailure } from '@/lib/medical-service';

export const dynamic = 'force-dynamic';

// POST /api/medical/resolve - Admin only decision workflow after Medical Failure
export async function POST(req: NextRequest) {
  try {
    const admin = await assertRole(req, ['ADMIN']);
    const body = await req.json();

    const { orderId, decision, newPetId, notes } = body;

    if (!orderId || !decision) {
      return NextResponse.json({ error: 'orderId and decision are required' }, { status: 400 });
    }

    const updatedOrder = await resolveMedicalFailure({
      orderId,
      adminId: admin.id,
      decision,
      newPetId,
      notes,
    });

    return NextResponse.json({ success: true, data: updatedOrder });
  } catch (error: any) {
    return rbacErrorResponse(error);
  }
}
