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
  microchipVerified?: boolean;
  microchipNumber?: string | null;
  documents?: Array<{
    type: string;
    visibility?: string;
    fileUrl: string;
    fileName: string;
  }>;
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

    // 2. Attach any collected vendor compliance documents (Vaccination, Deworming, Pedigree)
    if (input.documents && input.documents.length > 0) {
      for (const doc of input.documents) {
        if (!doc.fileUrl) continue;
        await tx.document.create({
          data: {
            orderId: order.id,
            petId: order.petId!,
            type: doc.type,
            visibility: doc.visibility || 'CUSTOMER_VISIBLE',
            fileUrl: doc.fileUrl,
            fileName: doc.fileName || `${doc.type}.pdf`,
            uploadedById: input.agentId,
          },
        });
      }
    }

    // 3. Register pickup photo as a document if present
    if (input.photos && input.photos.length > 0) {
      await tx.document.create({
        data: {
          orderId: order.id,
          petId: order.petId!,
          type: 'PET_PICKUP_PHOTO',
          visibility: 'CUSTOMER_VISIBLE',
          fileUrl: input.photos[0],
          fileName: 'Breeder Kennel Physical Pickup Photo.jpg',
          uploadedById: input.agentId,
        },
      });
    }

    // 4. Update microchip number on Pet if confirmed/provided
    if (input.microchipNumber) {
      await tx.pet.update({
        where: { id: order.petId! },
        data: { microchipNumber: input.microchipNumber.trim() },
      });
    }

    if (input.result === 'ACCEPT') {
      // Pass Branch: Order -> PICKUP_ACCEPTED -> MEDICAL_CHECK, Pet -> IN_TRANSIT -> MEDICAL_PENDING
      await tx.pet.update({
        where: { id: order.petId! },
        data: { status: 'MEDICAL_PENDING' },
      });

      // Automatically advance vendor procurement payout to ELIGIBLE_FOR_PAYOUT once delivered to medical center
      const payoutUpdate: Record<string, any> = {};
      if (order.vendorId && order.vendorPayoutStatus !== 'SETTLED') {
        payoutUpdate.vendorPayoutStatus = 'ELIGIBLE_FOR_PAYOUT';
      }

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'MEDICAL_CHECK',
          petPhotoAtPickup: input.photos?.[0] || null,
          ...payoutUpdate,
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
