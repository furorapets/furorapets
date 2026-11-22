import { NextRequest, NextResponse } from 'next/server';
import { assertRole, rbacErrorResponse } from '@/lib/rbac';
import { submitDeliveryCompletion } from '@/lib/delivery-service';

// POST /api/delivery - Agent submits proof of delivery report
export async function POST(req: NextRequest) {
  try {
    const agent = await assertRole(req, ['DELIVERY_AGENT', 'ADMIN']);
    const body = await req.json();

    const {
      orderId,
      photo,
      video,
      photoWithCustomer,
      customerIdCaptured,
      signedDeliveryReport,
      customerAcknowledgement,
    } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    const res = await submitDeliveryCompletion({
      orderId,
      agentId: agent.id,
      photo,
      video,
      photoWithCustomer,
      customerIdCaptured,
      signedDeliveryReport,
      customerAcknowledgement,
    });

    return NextResponse.json({ success: true, data: res }, { status: 201 });
  } catch (error: any) {
    return rbacErrorResponse(error);
  }
}
