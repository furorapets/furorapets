import prisma from './prisma';
import { generateOrderId } from './id-generator';
import { logAudit } from './audit';
import { OrderStatus, PaymentStatus, PetStatus } from '@/types';
import { validateOrderTransition, validatePetTransition } from './state-machine';

export class OrderPetLinkImmutableError extends Error {
  constructor(orderId: string, currentPetId: string) {
    super(`Permanent Link Violation: Order ${orderId} is permanently linked to Pet ${currentPetId}. Reassignment is strictly prohibited except via Medical-Failed resolution.`);
    this.name = 'OrderPetLinkImmutableError';
  }
}

export interface CreateOrderInput {
  customerId: string;
  customerName: string;
  customerContact: string;
  deliveryAddress: string;
  categoryId: string;
  breedId: string;
  productOrPackage: string;
  paymentStatus?: PaymentStatus;
  orderSource?: string;
  adCampaign?: string;
  advancePaid?: number;
  paymentMode?: string;
}

export async function createOrder(input: CreateOrderInput) {
  // Validate breed
  const breed = await prisma.breed.findUnique({
    where: { id: input.breedId },
  });

  if (!breed || !breed.active) {
    throw new Error('Selected breed is inactive or unavailable for ordering');
  }

  const orderId = await generateOrderId();

  const order = await prisma.order.create({
    data: {
      orderId,
      customerId: input.customerId,
      customerName: input.customerName,
      customerContact: input.customerContact,
      deliveryAddress: input.deliveryAddress,
      categoryId: input.categoryId,
      breedId: input.breedId,
      productOrPackage: input.productOrPackage,
      paymentStatus: input.paymentStatus || 'PAID', // Defaults to PAID via simulated checkout
      orderSource: input.orderSource || 'WEBSITE',
      adCampaign: input.adCampaign || null,
      advancePaid: input.advancePaid !== undefined ? input.advancePaid : null,
      paymentMode: input.paymentMode || 'FULL_PREPAID',
      status: 'ORDER_RECEIVED',
    },
    include: {
      category: true,
      breed: true,
      customer: { select: { id: true, name: true, email: true } },
    },
  });

  await logAudit({
    orderId: order.id,
    userId: input.customerId,
    action: 'ORDER_CREATED',
    fromState: null,
    toState: 'ORDER_RECEIVED',
    metadata: { orderId: order.orderId, package: input.productOrPackage },
  });

  return order;
}

/**
 * Links a Pet to an Order permanently (PRD §5 Module F & §6 Rule 2).
 * Link is permanent once set. Reassignment only allowed if order status is MEDICAL_FAILED.
 */
export async function linkPetToOrder(orderIdOrDbId: string, petIdOrDbId: string, actorId: string, isMedicalReassignment = false) {
  const order = await prisma.order.findFirst({
    where: { OR: [{ id: orderIdOrDbId }, { orderId: orderIdOrDbId }] },
    include: { pet: true },
  });

  if (!order) throw new Error('Order not found');

  const pet = await prisma.pet.findFirst({
    where: { OR: [{ id: petIdOrDbId }, { petId: petIdOrDbId }] },
  });

  if (!pet) throw new Error('Pet not found');

  // Enforce Permanent Link Rule (PRD §6.2)
  if (order.petId && order.petId !== pet.id) {
    if (!isMedicalReassignment && order.status !== 'MEDICAL_FAILED') {
      throw new OrderPetLinkImmutableError(order.orderId, order.pet?.petId || order.petId);
    }
  }

  // Link pet and transition statuses
  const updatedOrder = await prisma.$transaction(async (tx) => {
    // 1. Update pet to ASSIGNED_TO_ORDER
    await tx.pet.update({
      where: { id: pet.id },
      data: { status: 'ASSIGNED_TO_ORDER' },
    });

    // 2. Link pet to order and advance status
    const o = await tx.order.update({
      where: { id: order.id },
      data: {
        petId: pet.id,
        vendorId: pet.vendorId || order.vendorId,
        status: 'PET_ASSIGNED',
      },
      include: {
        pet: true,
        vendor: true,
        category: true,
        breed: true,
      },
    });

    return o;
  });

  await logAudit({
    orderId: order.id,
    userId: actorId,
    action: isMedicalReassignment ? 'ORDER_PET_REASSIGNED_POST_MEDICAL' : 'ORDER_PET_LINKED_PERMANENT',
    fromState: order.status,
    toState: 'PET_ASSIGNED',
    metadata: {
      orderId: order.orderId,
      petId: pet.petId,
      permanent: true,
    },
  });

  return updatedOrder;
}
