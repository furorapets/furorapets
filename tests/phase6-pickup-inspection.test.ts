import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../src/lib/prisma';
import { createOrder, linkPetToOrder } from '../src/lib/order-service';
import { submitPickupInspection } from '../src/lib/inspection-service';
import { POST as inspectionHandler } from '../src/app/api/inspection/route';
import { GET as getAgentOrderHandler } from '../src/app/api/agent/current-order/route';
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

describe('Phase 6: Pickup & Inspection — Scoped Access & Accept/Fail Branching', () => {
  let activeBreed: any;
  let testPet1: any;
  let testOrder1: any;
  let testPet2: any;
  let testOrder2: any;

  beforeAll(async () => {
    await prisma.$connect();
    activeBreed = await prisma.breed.findFirst({ where: { active: true } });

    // Pet 1 & Order 1 (for ACCEPT flow)
    testPet1 = await prisma.pet.create({
      data: {
        petId: `FUR-PET-INSP-1-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        categoryId: activeBreed.categoryId,
        breedId: activeBreed.id,
        dob: new Date('2026-05-01'),
        sex: 'Male',
        colour: 'Golden',
        status: 'AVAILABLE',
        inventoryOwner: 'VENDOR',
        vendorId: 'usr_vendor_1',
        createdById: 'usr_vendor_1',
      },
    });

    testOrder1 = await createOrder({
      customerId: 'usr_cust_1',
      customerName: 'Ananya Sharma',
      customerContact: '+91 9876543216',
      deliveryAddress: 'Indiranagar, Bangalore',
      categoryId: activeBreed.categoryId,
      breedId: activeBreed.id,
      productOrPackage: 'Standard Package',
    });

    // Link pet and assign Agent 1
    await linkPetToOrder(testOrder1.id, testPet1.id, 'usr_admin');
    await prisma.order.update({
      where: { id: testOrder1.id },
      data: { agentId: 'usr_agent_1', status: 'PICKUP_ASSIGNED' },
    });

    // Pet 2 & Order 2 (for FAIL flow)
    testPet2 = await prisma.pet.create({
      data: {
        petId: `FUR-PET-INSP-2-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
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

    testOrder2 = await createOrder({
      customerId: 'usr_cust_1',
      customerName: 'Ananya Sharma',
      customerContact: '+91 9876543216',
      deliveryAddress: 'Indiranagar, Bangalore',
      categoryId: activeBreed.categoryId,
      breedId: activeBreed.id,
      productOrPackage: 'Standard Package',
    });

    await linkPetToOrder(testOrder2.id, testPet2.id, 'usr_admin');
    await prisma.order.update({
      where: { id: testOrder2.id },
      data: { agentId: 'usr_agent_1', status: 'PICKUP_ASSIGNED' },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('Agent scoped access: Agent 2 cannot inspect order assigned to Agent 1', async () => {
    const req = createMockRequest(
      'http://localhost:3000/api/inspection',
      'POST',
      {
        orderId: testOrder1.id,
        result: 'ACCEPT',
        physicalCondition: 'Healthy',
        notes: 'Good condition',
      },
      'usr_agent_2' // Not assigned agent
    );
    const res = await inspectionHandler(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('strictly unauthorized');
  });

  it('Agent 1 current order API strictly returns assigned order', async () => {
    const req = createMockRequest('http://localhost:3000/api/agent/current-order', 'GET', undefined, 'usr_agent_1');
    const res = await getAgentOrderHandler(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.agentId).toBe('usr_agent_1');
  });

  it('Successful inspection (ACCEPT) transitions Order to MEDICAL_CHECK and Pet to MEDICAL_PENDING', async () => {
    const req = createMockRequest(
      'http://localhost:3000/api/inspection',
      'POST',
      {
        orderId: testOrder1.id,
        result: 'ACCEPT',
        physicalCondition: 'Active, clear eyes, good hydration',
        notes: 'Inspection passed at breeder facility',
        photos: ['https://example.com/photo1.jpg'],
      },
      'usr_agent_1'
    );

    const res = await inspectionHandler(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.result).toBe('ACCEPT');

    // Verify order and pet status
    const refreshedOrder = await prisma.order.findUnique({ where: { id: testOrder1.id } });
    expect(refreshedOrder?.status).toBe('MEDICAL_CHECK');

    const refreshedPet = await prisma.pet.findUnique({ where: { id: testPet1.id } });
    expect(refreshedPet?.status).toBe('MEDICAL_PENDING');
  });

  it('Failed inspection (FAIL) requires failureReason and transitions Order to INSPECTION_FAILED and Pet to RETURNED', async () => {
    // Attempt without failureReason -> Rejected (400)
    const reqNoReason = createMockRequest(
      'http://localhost:3000/api/inspection',
      'POST',
      {
        orderId: testOrder2.id,
        result: 'FAIL',
        physicalCondition: 'Lethargic',
        notes: 'Puppy not feeling well',
      },
      'usr_agent_1'
    );
    const resNoReason = await inspectionHandler(reqNoReason);
    expect(resNoReason.status).toBe(500); // throws error in service layer

    // Submit with failureReason and photos
    const reqFail = createMockRequest(
      'http://localhost:3000/api/inspection',
      'POST',
      {
        orderId: testOrder2.id,
        result: 'FAIL',
        physicalCondition: 'Signs of skin rash and lethargy',
        notes: 'Pet rejected at physical inspection',
        failureReason: 'Physical rash observed on belly; breeder notified',
        photos: ['https://example.com/rash.jpg'],
      },
      'usr_agent_1'
    );
    const resFail = await inspectionHandler(reqFail);
    expect(resFail.status).toBe(201);

    // Verify Order is INSPECTION_FAILED and Pet is RETURNED
    const refreshedOrder = await prisma.order.findUnique({ where: { id: testOrder2.id } });
    expect(refreshedOrder?.status).toBe('INSPECTION_FAILED');

    const refreshedPet = await prisma.pet.findUnique({ where: { id: testPet2.id } });
    expect(refreshedPet?.status).toBe('RETURNED');
  });
});
