import prisma from './prisma';
import { logAudit } from './audit';
import { assertAgentOrderAccess } from './rbac';

export interface SubmitInspectionInput {
  orderId: string;
  agentId: string;
  photos: string[];
  video?: string | null;
  notes: string;
  physicalCondition: string;
  result: 'ACCEPT' | 'FAIL';
  failureReason?: string | null;
}

export async function submitPickupInspection(input: SubmitInspectionInput) {
  const order = await prisma.order.findFirst({
    where: { OR: [{ id: input.orderId }, { orderId: input.orderId }] },
    include: { pet: true },
  });

  if (!order) throw new Error('Order not found');
  if (!order.petId || !order.pet) throw new Error('Order does not have a linked pet');

  // Enforce single-order agent scoping (PRD §3 & §5 Module H)
  await assertAgentOrderAccess(input.agentId, order.id);

  if (input.result === 'FAIL' && !input.failureReason) {
    throw new Error('Mandatory failureReason and photo evidence required when failing inspection');
  }

  const inspection = await prisma.$transaction(async (tx) => {
    // 1. Create Inspection Record
    const rec = await tx.inspectionRecord.create({
      data: {
        orderId: order.id,
        petId: order.petId!,
        agentId: input.agentId,
        photos: JSON.stringify(input.photos || []),
        video: input.video || null,
        notes: input.notes,
        physicalCondition: input.physicalCondition,
        result: input.result,
        failureReason: input.result === 'FAIL' ? input.failureReason : null,
      },
    });

    if (input.result === 'ACCEPT') {
      // Pass Branch: Order -> PICKUP_ACCEPTED -> MEDICAL_CHECK, Pet -> IN_TRANSIT -> MEDICAL_PENDING
      await tx.pet.update({
        where: { id: order.petId! },
        data: { status: 'MEDICAL_PENDING' },
      });

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'MEDICAL_CHECK',
          petPhotoAtPickup: input.photos?.[0] || null,
        },
      });
    } else {
      // Fail Branch: Order -> INSPECTION_FAILED, Pet -> RETURNED (retained by vendor)
      await tx.pet.update({
        where: { id: order.petId! },
        data: { status: 'RETURNED' },
      });

      await tx.order.update({
        where: { id: order.id },
        data: { status: 'INSPECTION_FAILED' },
      });
    }

    return rec;
  });

  await logAudit({
    orderId: order.id,
    userId: input.agentId,
    action: input.result === 'ACCEPT' ? 'INSPECTION_PASSED' : 'INSPECTION_FAILED',
    fromState: order.status,
    toState: input.result === 'ACCEPT' ? 'MEDICAL_CHECK' : 'INSPECTION_FAILED',
    metadata: {
      result: input.result,
      petId: order.pet.petId,
      reason: input.failureReason,
    },
  });

  return inspection;
}
