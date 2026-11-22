import { PetStatus, OrderStatus } from '@/types';

export class InvalidStateTransitionError extends Error {
  constructor(entity: 'Pet' | 'Order', currentStatus: string, targetStatus: string) {
    super(`Invalid ${entity} status transition from '${currentStatus}' to '${targetStatus}'`);
    this.name = 'InvalidStateTransitionError';
  }
}

/**
 * Valid transitions map for Pet lifecycle
 */
export const VALID_PET_TRANSITIONS: Record<PetStatus, PetStatus[]> = {
  AVAILABLE: ['RESERVED', 'ASSIGNED_TO_ORDER', 'UNAVAILABLE'],
  RESERVED: ['AVAILABLE', 'ASSIGNED_TO_ORDER', 'UNAVAILABLE'],
  ASSIGNED_TO_ORDER: ['PICKUP_PENDING', 'AVAILABLE'], // can revert to available if order cancelled before pickup
  PICKUP_PENDING: ['IN_TRANSIT', 'RETURNED', 'AVAILABLE'],
  IN_TRANSIT: ['MEDICAL_PENDING', 'RETURNED'],
  MEDICAL_PENDING: ['MEDICAL_APPROVED', 'MEDICAL_FAILED'],
  MEDICAL_APPROVED: ['DELIVERED', 'RETURNED'],
  MEDICAL_FAILED: ['RETURNED', 'AVAILABLE', 'UNAVAILABLE'],
  DELIVERED: [], // Terminal state
  RETURNED: ['AVAILABLE', 'UNAVAILABLE'],
  UNAVAILABLE: ['AVAILABLE'],
};

/**
 * Valid transitions map for Order lifecycle
 */
export const VALID_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  ORDER_RECEIVED: ['VENDOR_ASSIGNED', 'PET_ASSIGNED', 'CANCELLED_REFUNDED'],
  VENDOR_ASSIGNED: ['VENDOR_ACCEPTED', 'VENDOR_REJECTED', 'CANCELLED_REFUNDED'],
  VENDOR_REJECTED: ['VENDOR_ASSIGNED', 'CANCELLED_REFUNDED'],
  VENDOR_ACCEPTED: ['PET_ASSIGNED', 'CANCELLED_REFUNDED'],
  PET_ASSIGNED: ['PICKUP_ASSIGNED', 'CANCELLED_REFUNDED'],
  PICKUP_ASSIGNED: ['PICKUP_INSPECTION', 'CANCELLED_REFUNDED'],
  PICKUP_INSPECTION: ['PICKUP_ACCEPTED', 'INSPECTION_FAILED'],
  INSPECTION_FAILED: ['VENDOR_ASSIGNED', 'PET_ASSIGNED', 'CANCELLED_REFUNDED'],
  PICKUP_ACCEPTED: ['MEDICAL_CHECK'],
  MEDICAL_CHECK: ['MEDICAL_APPROVED', 'MEDICAL_FAILED'],
  MEDICAL_FAILED: ['VENDOR_ASSIGNED', 'PET_ASSIGNED', 'CANCELLED_REFUNDED'],
  MEDICAL_APPROVED: ['READY_FOR_DELIVERY'],
  READY_FOR_DELIVERY: ['DELIVERY_COMPLETED', 'CANCELLED_REFUNDED'],
  DELIVERY_COMPLETED: [], // Terminal state
  CANCELLED_REFUNDED: [], // Terminal state
};

/**
 * Validates whether a Pet status transition is permissible.
 * Admin can override if explicitly specified.
 */
export function validatePetTransition(current: PetStatus, target: PetStatus, isAdmin = false): boolean {
  if (current === target) return true;
  if (isAdmin) return true; // Admin has manual intervention rights

  const allowed = VALID_PET_TRANSITIONS[current] || [];
  if (!allowed.includes(target)) {
    throw new InvalidStateTransitionError('Pet', current, target);
  }
  return true;
}

/**
 * Validates whether an Order status transition is permissible.
 */
export function validateOrderTransition(current: OrderStatus, target: OrderStatus, isAdmin = false): boolean {
  if (current === target) return true;
  if (isAdmin && target === 'CANCELLED_REFUNDED') return true; // Admin can cancel at any non-terminal state

  const allowed = VALID_ORDER_TRANSITIONS[current] || [];
  if (!allowed.includes(target)) {
    throw new InvalidStateTransitionError('Order', current, target);
  }
  return true;
}
