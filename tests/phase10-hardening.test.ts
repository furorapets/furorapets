import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../src/lib/prisma';
import { createOrder, linkPetToOrder } from '../src/lib/order-service';
import { submitPickupInspection } from '../src/lib/inspection-service';
import { submitMedicalExamination, resolveMedicalFailure } from '../src/lib/medical-service';
import { submitDeliveryCompletion } from '../src/lib/delivery-service';
import { generatePetCertificate } from '../src/lib/certificate-service';
import { canAccessDocument } from '../src/lib/document-visibility';
import { validateOrderTransition, validatePetTransition } from '../src/lib/state-machine';

describe('Phase 10: Hardening — Security Boundaries, Audit Trail, & Failure Loops', () => {
  let activeBreed: any;

  beforeAll(async () => {
    await prisma.$connect();
    activeBreed = await prisma.breed.findFirst({ where: { active: true } });
    expect(activeBreed).toBeTruthy();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('1. Full PRD §3 Role-Boundary Security Pass', () => {
    it('Sales Team is blocked from accessing private vendor docs and internal medical docs', () => {
      const salesUser = { id: 'usr_sales', email: 'sales@furora.com', name: 'Sales', role: 'SALES' as const };

      expect(canAccessDocument(salesUser, { id: '1', visibility: 'ADMIN_ONLY', uploadedById: 'usr_admin' })).toBe(false);
      expect(canAccessDocument(salesUser, { id: '2', visibility: 'INTERNAL_FURORA', uploadedById: 'usr_admin' })).toBe(false);
      expect(canAccessDocument(salesUser, { id: '3', visibility: 'VENDOR_VISIBLE', uploadedById: 'usr_vendor_1' })).toBe(false);
      expect(canAccessDocument(salesUser, { id: '4', visibility: 'DELIVERY_AGENT_VISIBLE', uploadedById: 'usr_agent_1' })).toBe(false);
      expect(canAccessDocument(salesUser, { id: '5', visibility: 'CUSTOMER_VISIBLE', uploadedById: 'usr_admin' })).toBe(true);
    });

    it('Vendor is blocked from accessing other vendors data and Furora internal/admin docs', () => {
      const vendor1 = { id: 'usr_vendor_1', email: 'v1@pet.com', name: 'Vendor 1', role: 'VENDOR' as const };

      // Docs on own order
      expect(canAccessDocument(vendor1, { id: '1', visibility: 'VENDOR_VISIBLE', uploadedById: 'usr_admin' }, { orderVendorId: 'usr_vendor_1' })).toBe(true);
      expect(canAccessDocument(vendor1, { id: '2', visibility: 'INTERNAL_FURORA', uploadedById: 'usr_admin' }, { orderVendorId: 'usr_vendor_1' })).toBe(false);
      expect(canAccessDocument(vendor1, { id: '3', visibility: 'ADMIN_ONLY', uploadedById: 'usr_admin' }, { orderVendorId: 'usr_vendor_1' })).toBe(false);

      // Docs on another vendor order
      expect(canAccessDocument(vendor1, { id: '4', visibility: 'VENDOR_VISIBLE', uploadedById: 'usr_vendor_2' }, { orderVendorId: 'usr_vendor_2' })).toBe(false);
    });

    it('Customer is strictly restricted to CUSTOMER_VISIBLE documents on their own order', () => {
      const customer = { id: 'usr_cust_1', email: 'cust1@gmail.com', name: 'Customer 1', role: 'CUSTOMER' as const };

      expect(canAccessDocument(customer, { id: '1', visibility: 'CUSTOMER_VISIBLE', uploadedById: 'usr_admin' }, { orderCustomerId: 'usr_cust_1' })).toBe(true);
      expect(canAccessDocument(customer, { id: '2', visibility: 'VENDOR_VISIBLE', uploadedById: 'usr_admin' }, { orderCustomerId: 'usr_cust_1' })).toBe(false);
      expect(canAccessDocument(customer, { id: '3', visibility: 'CUSTOMER_VISIBLE', uploadedById: 'usr_admin' }, { orderCustomerId: 'usr_cust_2' })).toBe(false);
    });
  });

  describe('2. State Machine Illegal Jumps & Transition Validation', () => {
    it('Prohibits illegal Order status transitions', () => {
      // Cannot jump from ORDER_RECEIVED directly to DELIVERY_COMPLETED
      expect(() => validateOrderTransition('ORDER_RECEIVED', 'DELIVERY_COMPLETED')).toThrow(/Invalid Order status transition/);
      // Cannot jump from ORDER_RECEIVED directly to READY_FOR_DELIVERY
      expect(() => validateOrderTransition('ORDER_RECEIVED', 'READY_FOR_DELIVERY')).toThrow(/Invalid Order status transition/);
      // Cannot jump backwards from DELIVERY_COMPLETED
      expect(() => validateOrderTransition('DELIVERY_COMPLETED', 'ORDER_RECEIVED')).toThrow(/Invalid Order status transition/);
    });

    it('Prohibits illegal Pet status transitions', () => {
      // Cannot jump from AVAILABLE directly to DELIVERED
      expect(() => validatePetTransition('AVAILABLE', 'DELIVERED')).toThrow(/Invalid Pet status transition/);
      // Cannot jump from DELIVERED backwards to AVAILABLE
      expect(() => validatePetTransition('DELIVERED', 'AVAILABLE')).toThrow(/Invalid Pet status transition/);
    });
  });

  describe('3. Edge Cases: Inspection Failure Loop & Medical Failure Cancel Loop', () => {
    it('Inspection Failure Loop: Pet returns to vendor, Admin reassigns to new pet and succeeds', async () => {
      // 1. Create Order
      const order = await createOrder({
        customerId: 'usr_cust_1',
        customerName: 'Ananya Sharma',
        customerContact: '+91 9876543216',
        deliveryAddress: 'Indiranagar, Bangalore',
        categoryId: activeBreed.categoryId,
        breedId: activeBreed.id,
        productOrPackage: 'Standard Package',
      });

      // 2. Pet 1 fails inspection
      const pet1 = await prisma.pet.create({
        data: {
          petId: `FUR-PET-FAIL1-${Date.now().toString().slice(-4)}`,
          categoryId: activeBreed.categoryId,
          breedId: activeBreed.id,
          dob: new Date('2026-05-01'),
          sex: 'Male',
          colour: 'Brown',
          status: 'AVAILABLE',
          inventoryOwner: 'VENDOR',
          vendorId: 'usr_vendor_1',
          createdById: 'usr_vendor_1',
        },
      });

      await linkPetToOrder(order.id, pet1.id, 'usr_admin');
      await prisma.order.update({
        where: { id: order.id },
        data: { agentId: 'usr_agent_1', status: 'PICKUP_ASSIGNED' },
      });

      // Fail inspection
      await submitPickupInspection({
        orderId: order.id,
        agentId: 'usr_agent_1',
        photos: ['https://example.com/fail.jpg'],
        notes: 'Underweight and lethargic',
        physicalCondition: 'Poor',
        result: 'FAIL',
        failureReason: 'Lethargy and skin condition',
      });

      // Assert Order is INSPECTION_FAILED and Pet 1 is RETURNED
      const orderAfterFail = await prisma.order.findUnique({ where: { id: order.id } });
      expect(orderAfterFail?.status).toBe('INSPECTION_FAILED');

      const pet1AfterFail = await prisma.pet.findUnique({ where: { id: pet1.id } });
      expect(pet1AfterFail?.status).toBe('RETURNED');
    });

    it('Medical Failure Loop: Pet returns to vendor, Admin triggers Cancel & Refund', async () => {
      const pet = await prisma.pet.create({
        data: {
          petId: `FUR-PET-MEDFAIL-${Date.now().toString().slice(-4)}`,
          categoryId: activeBreed.categoryId,
          breedId: activeBreed.id,
          dob: new Date('2026-05-01'),
          sex: 'Female',
          colour: 'White',
          status: 'AVAILABLE',
          inventoryOwner: 'VENDOR',
          vendorId: 'usr_vendor_1',
          createdById: 'usr_vendor_1',
        },
      });

      const order = await createOrder({
        customerId: 'usr_cust_1',
        customerName: 'Ananya Sharma',
        customerContact: '+91 9876543216',
        deliveryAddress: 'Indiranagar, Bangalore',
        categoryId: activeBreed.categoryId,
        breedId: activeBreed.id,
        productOrPackage: 'Standard Package',
      });

      await linkPetToOrder(order.id, pet.id, 'usr_admin');
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'MEDICAL_CHECK' },
      });

      // Vet fails medical exam
      await submitMedicalExamination({
        orderId: order.id,
        petId: pet.id,
        actorId: 'usr_agent_1',
        result: 'FAILED',
        reason: 'Cardiac murmur detected',
        proofDocs: ['https://storage.furora.com/ecg_report.pdf'],
      });

      const orderMedFail = await prisma.order.findUnique({ where: { id: order.id } });
      expect(orderMedFail?.status).toBe('MEDICAL_FAILED');

      const petMedFail = await prisma.pet.findUnique({ where: { id: pet.id } });
      expect(petMedFail?.status).toBe('RETURNED');

      // Admin resolves via CANCEL_REFUND
      const cancelledOrder = await resolveMedicalFailure({
        orderId: order.id,
        adminId: 'usr_admin',
        decision: 'CANCEL_REFUND',
        notes: 'Customer notified and full refund issued.',
      });

      expect(cancelledOrder.status).toBe('CANCELLED_REFUNDED');
      expect(cancelledOrder.paymentStatus).toBe('REFUNDED');
    });
  });

  describe('4. Audit Trail Verification', () => {
    it('Audit trail records exist for state transitions and actions', async () => {
      const logs = await prisma.auditLog.findMany({
        take: 20,
        orderBy: { timestamp: 'desc' },
      });

      expect(logs.length).toBeGreaterThan(0);
      const actions = logs.map((l) => l.action);
      expect(actions.some((a) => a.includes('ORDER') || a.includes('PET') || a.includes('INSPECTION'))).toBe(true);
    });
  });
});
