import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../src/lib/prisma';
import { createOrder, linkPetToOrder } from '../src/lib/order-service';
import { submitDeliveryCompletion } from '../src/lib/delivery-service';
import { POST as deliveryHandler } from '../src/app/api/delivery/route';
import { NextRequest } from 'next/server';

function createMockRequest(url: string, method: string, body?: any, userId = 'usr_agent_1') {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-furora-user-id': userId,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('Phase 9: Delivery Workflow & Proof of Delivery Report', () => {
  let activeBreed: any;
  let testPet: any;
  let testOrder: any;

  beforeAll(async () => {
    await prisma.$connect();
    activeBreed = await prisma.breed.findFirst({ where: { active: true } });

    testPet = await prisma.pet.create({
      data: {
        petId: `FUR-PET-DELIV-${Date.now().toString().slice(-4)}`,
        categoryId: activeBreed.categoryId,
        breedId: activeBreed.id,
        dob: new Date('2026-05-01'),
        sex: 'Male',
        colour: 'Chocolate',
        status: 'AVAILABLE',
        inventoryOwner: 'VENDOR',
        vendorId: 'usr_vendor_1',
        createdById: 'usr_vendor_1',
      },
    });

    testOrder = await createOrder({
      customerId: 'usr_cust_1',
      customerName: 'Ananya Sharma',
      customerContact: '+91 9876543216',
      deliveryAddress: 'Indiranagar, Bangalore',
      categoryId: activeBreed.categoryId,
      breedId: activeBreed.id,
      productOrPackage: 'Standard Package',
    });

    await linkPetToOrder(testOrder.id, testPet.id, 'usr_admin');
    await prisma.order.update({
      where: { id: testOrder.id },
      data: {
        agentId: 'usr_agent_1',
        vendorId: 'usr_vendor_1',
        status: 'READY_FOR_DELIVERY',
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should reject delivery submission if mandatory fields are missing', async () => {
    const req = createMockRequest(
      'http://localhost:3000/api/delivery',
      'POST',
      {
        orderId: testOrder.id,
        // Missing photo, customerId, signed report
      },
      'usr_agent_1'
    );
    const res = await deliveryHandler(req);
    expect(res.status).toBe(500); // Throws mandatory fields error in service
  });

  it('should complete delivery, advance statuses to DELIVERY_COMPLETED and DELIVERED, and save DeliveryRecord', async () => {
    const req = createMockRequest(
      'http://localhost:3000/api/delivery',
      'POST',
      {
        orderId: testOrder.id,
        photo: 'https://storage.furora.com/delivery/handoff.jpg',
        customerIdCaptured: 'AADHAAR-8833-2211',
        signedDeliveryReport: 'DIGITAL-SIGN-HASH-XYZ',
        customerAcknowledgement: 'Customer verified pet health and accepted delivery.',
        photoWithCustomer: 'https://storage.furora.com/delivery/customer_pet.jpg',
      },
      'usr_agent_1'
    );

    const res = await deliveryHandler(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.order.status).toBe('DELIVERY_COMPLETED');

    // Verify DB
    const refreshedOrder = await prisma.order.findUnique({
      where: { id: testOrder.id },
      include: { deliveryRecord: true },
    });
    expect(refreshedOrder?.status).toBe('DELIVERY_COMPLETED');
    expect(refreshedOrder?.deliveryRecord?.customerIdCaptured).toBe('AADHAAR-8833-2211');

    const refreshedPet = await prisma.pet.findUnique({
      where: { id: testPet.id },
    });
    expect(refreshedPet?.status).toBe('DELIVERED');
  });

  it('Terminal state: DELIVERY_COMPLETED cannot transition to earlier states without error', async () => {
    const { validateOrderTransition } = await import('../src/lib/state-machine');
    expect(() => validateOrderTransition('DELIVERY_COMPLETED', 'READY_FOR_DELIVERY')).toThrow(
      /Invalid Order status transition/
    );
  });
});
