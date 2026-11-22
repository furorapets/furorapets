import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { assertRole, rbacErrorResponse } from '@/lib/rbac';
import { calculateAge } from '@/lib/age-calculator';

export const dynamic = 'force-dynamic';

// GET /api/agent/current-order - Returns ONLY the single active order assigned to current agent
export async function GET(req: NextRequest) {
  try {
    const agent = await assertRole(req, ['DELIVERY_AGENT', 'ADMIN']);

    const order = await prisma.order.findFirst({
      where: {
        agentId: agent.id,
        status: {
          notIn: ['DELIVERY_COMPLETED', 'CANCELLED_REFUNDED'],
        },
      },
      include: {
        category: true,
        breed: true,
        pet: true,
        vendor: { select: { id: true, name: true, phone: true, address: true } },
        inspections: true,
        medicalRecords: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (!order) {
      return NextResponse.json({ success: true, data: null, message: 'No active orders assigned to you' });
    }

    let photos = [];
    if (order.pet?.photos) {
      try { photos = JSON.parse(order.pet.photos); } catch (e) {}
    }

    const ageInfo = order.pet ? calculateAge(order.pet.dob) : null;

    return NextResponse.json({
      success: true,
      data: {
        ...order,
        pet: order.pet ? {
          ...order.pet,
          photos,
          age: ageInfo?.formatted,
        } : null,
      },
    });
  } catch (error) {
    return rbacErrorResponse(error);
  }
}
