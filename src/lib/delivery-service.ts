import prisma from './prisma';
import { logAudit } from './audit';
import { assertAgentOrderAccess } from './rbac';

export interface SubmitDeliveryInput {
  orderId: string;
  agentId: string;
  photo: string;
  video?: string | null;
  photoWithCustomer?: string | null;
  customerIdCaptured: string;
  signedDeliveryReport: string;
  customerAcknowledgement: string;
}

export async function submitDeliveryCompletion(input: SubmitDeliveryInput) {
  const order = await prisma.order.findFirst({
    where: { OR: [{ id: input.orderId }, { orderId: input.orderId }] },
    include: { pet: true },
  });

  if (!order) throw new Error('Order not found');
  if (!order.petId || !order.pet) throw new Error('Order has no linked pet');

  // Enforce agent scoping
  await assertAgentOrderAccess(input.agentId, order.id);

  if (order.status !== 'READY_FOR_DELIVERY') {
    throw new Error(
      `Cannot complete delivery for order in status '${order.status}'. Order must be 'READY_FOR_DELIVERY'`
    );
  }

  // Mandatory fields per PRD §4.8 & §5 Module L
  if (!input.photo || !input.customerIdCaptured || !input.signedDeliveryReport || !input.customerAcknowledgement) {
    throw new Error(
      'Mandatory delivery fields required: delivery photo, customer ID captured, signed delivery report, and customer acknowledgement'
    );
  }

  const deliveryRecord = await prisma.$transaction(async (tx) => {
    // 1. Create Delivery Record
    const record = await tx.deliveryRecord.create({
      data: {
        orderId: order.id,
        petId: order.petId!,
        agentId: input.agentId,
        photo: input.photo,
        video: input.video || null,
        photoWithCustomer: input.photoWithCustomer || null,
        customerIdCaptured: input.customerIdCaptured,
        signedDeliveryReport: input.signedDeliveryReport,
        customerAcknowledgement: input.customerAcknowledgement,
        status: 'DELIVERY COMPLETED',
      },
    });

    // 2. Register Delivery Documents for public customer verification
    await tx.document.create({
      data: {
        orderId: order.id,
        petId: order.petId!,
        type: 'DELIVERY_HANDOVER_PHOTO',
        visibility: 'CUSTOMER_VISIBLE',
        fileName: 'Customer Doorstep Handover Photo.jpg',
        fileUrl: input.photoWithCustomer || input.photo,
        uploadedById: input.agentId,
      },
    });

    await tx.document.create({
      data: {
        orderId: order.id,
        petId: order.petId!,
        type: 'DELIVERY_SIGNED_REPORT',
        visibility: 'CUSTOMER_VISIBLE',
        fileName: 'Signed Recipient Delivery Handover Receipt.pdf',
        fileUrl: input.signedDeliveryReport,
        uploadedById: input.agentId,
      },
    });

    // 3. Transition Pet to DELIVERED
    await tx.pet.update({
      where: { id: order.petId! },
      data: { status: 'DELIVERED' },
    });

    // 3. Transition Order to DELIVERY_COMPLETED
    const updatedOrder = await tx.order.update({
      where: { id: order.id },
      data: { status: 'DELIVERY_COMPLETED' },
      include: { pet: true },
    });

    return { record, order: updatedOrder };
  });

  // Log audit
  await logAudit({
    orderId: order.id,
    userId: input.agentId,
    action: 'DELIVERY_COMPLETED',
    fromState: 'READY_FOR_DELIVERY',
    toState: 'DELIVERY_COMPLETED',
    metadata: {
      orderId: order.orderId,
      petId: order.pet.petId,
      customerIdCaptured: input.customerIdCaptured,
    },
  });

  return deliveryRecord;
}
