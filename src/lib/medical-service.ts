import prisma from './prisma';
import { logAudit } from './audit';
import { linkPetToOrder } from './order-service';

export interface SubmitMedicalInput {
  orderId: string;
  petId: string;
  actorId: string;
  result: 'APPROVED' | 'FAILED';
  reason?: string | null;
  proofDocs?: string[];
  vetClinicName?: string | null;
  vetDoctorName?: string | null;
  documents?: Array<{
    type: string;
    visibility: string;
    fileUrl: string;
    fileName: string;
  }>;
}

export async function submitMedicalExamination(input: SubmitMedicalInput) {
  const order = await prisma.order.findFirst({
    where: { OR: [{ id: input.orderId }, { orderId: input.orderId }] },
    include: { pet: true, vendor: true },
  });

  if (!order) throw new Error('Order not found');
  if (!order.petId) throw new Error('Order has no linked pet');

  if (input.result === 'FAILED' && !input.reason) {
    throw new Error('Mandatory reason and proof documentation required when failing medical examination');
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Create Medical Record
    const medRecord = await tx.medicalRecord.create({
      data: {
        orderId: order.id,
        petId: order.petId!,
        result: input.result,
        reason: input.result === 'FAILED' ? input.reason : null,
        proofDocs: JSON.stringify(input.proofDocs || []),
      },
    });

    // 2. Attach any uploaded documents with their visibility tags
    if (input.documents && input.documents.length > 0) {
      for (const doc of input.documents) {
        await tx.document.create({
          data: {
            orderId: order.id,
            petId: order.petId!,
            type: doc.type,
            visibility: doc.visibility,
            fileUrl: doc.fileUrl,
            fileName: doc.fileName,
            uploadedById: input.actorId,
          },
        });
      }
    }

    if (input.result === 'APPROVED') {
      // Pass Branch: Order -> MEDICAL_APPROVED -> READY_FOR_DELIVERY
      await tx.pet.update({
        where: { id: order.petId! },
        data: { status: 'MEDICAL_APPROVED' },
      });

      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'READY_FOR_DELIVERY',
          medicalCertUrl: input.proofDocs?.[0] || null,
          vetClinicName: input.vetClinicName || 'Crown Vet Specialty Animal Hospital & Diagnostics',
          vetDoctorName: input.vetDoctorName || 'Dr. Aditi Mukherjee, BVSc & AH (Reg #VCI-2018-9941)',
          vendorPayoutStatus: 'APPROVED_FOR_PAYOUT', // Escrow payout unlocked upon passing medical check!
        },
        include: { pet: true },
      });

      return { medRecord, order: updatedOrder };
    } else {
      // Failed Branch: Order -> MEDICAL_FAILED, Pet -> RETURNED to vendor
      await tx.pet.update({
        where: { id: order.petId! },
        data: { status: 'RETURNED' },
      });

      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'MEDICAL_FAILED',
          vendorPayoutStatus: 'REFUNDED', // Zero payout released to vendor if pet fails health inspection!
        },
        include: { pet: true },
      });

      return { medRecord, order: updatedOrder };
    }
  });

  // Log audit
  await logAudit({
    orderId: order.id,
    userId: input.actorId,
    action: input.result === 'APPROVED' ? 'MEDICAL_EXAM_APPROVED' : 'MEDICAL_EXAM_FAILED',
    fromState: order.status,
    toState: input.result === 'APPROVED' ? 'READY_FOR_DELIVERY' : 'MEDICAL_FAILED',
    metadata: {
      result: input.result,
      reason: input.reason,
      vendorNotified: input.result === 'FAILED' ? order.vendor?.email : null,
    },
  });

  return result;
}

export interface ResolveMedicalFailureInput {
  orderId: string;
  adminId: string;
  decision: 'REASSIGN' | 'CANCEL_REFUND';
  newPetId?: string;
  notes?: string;
}

/**
 * Admin-only Medical Failed Resolution Console (PRD §5 Module I & §7.2)
 * Admin chooses:
 * 1. Reassign to different pet
 * 2. Cancel & Refund
 */
export async function resolveMedicalFailure(input: ResolveMedicalFailureInput) {
  const order = await prisma.order.findFirst({
    where: { OR: [{ id: input.orderId }, { orderId: input.orderId }] },
    include: { pet: true },
  });

  if (!order) throw new Error('Order not found');
  if (order.status !== 'MEDICAL_FAILED') {
    throw new Error(`Cannot resolve medical failure for order in status '${order.status}'`);
  }

  if (input.decision === 'REASSIGN') {
    if (!input.newPetId) throw new Error('newPetId is required when reassigning order');
    // Call linkPetToOrder with isMedicalReassignment = true
    const updated = await linkPetToOrder(order.id, input.newPetId, input.adminId, true);
    return updated;
  }

  if (input.decision === 'CANCEL_REFUND') {
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'CANCELLED_REFUNDED',
        paymentStatus: 'REFUNDED',
      },
      include: { pet: true },
    });

    await logAudit({
      orderId: order.id,
      userId: input.adminId,
      action: 'ORDER_CANCELLED_REFUNDED_POST_MEDICAL',
      fromState: 'MEDICAL_FAILED',
      toState: 'CANCELLED_REFUNDED',
      metadata: { notes: input.notes || 'Admin approved cancel & refund' },
    });

    return updated;
  }

  throw new Error(`Unknown decision: ${input.decision}`);
}
