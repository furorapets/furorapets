import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { assertRole, rbacErrorResponse } from '@/lib/rbac';
import { submitPickupInspection } from '@/lib/inspection-service';

export const dynamic = 'force-dynamic';

// POST /api/inspection - Delivery Agent submits pickup inspection report
export async function POST(req: NextRequest) {
  try {
    const agent = await assertRole(req, ['DELIVERY_AGENT', 'ADMIN']);
    const body = await req.json();

    const {
      orderId,
      photos = [],
      video,
      notes,
      physicalCondition,
      result,
      failureReason,
      documents = [],
      microchipVerified,
      microchipNumber,
    } = body;

    if (!orderId || !result || !physicalCondition || !notes) {
      return NextResponse.json(
        { error: 'OrderId, result, physicalCondition, and notes are required' },
        { status: 400 }
      );
    }

    const inspection = await submitPickupInspection({
      orderId,
      agentId: agent.id,
      photos,
      video,
      notes,
      physicalCondition,
      result,
      failureReason,
      documents,
      microchipVerified,
      microchipNumber,
    });

    return NextResponse.json({ success: true, data: inspection }, { status: 201 });
  } catch (error: any) {
    return rbacErrorResponse(error);
  }
}
