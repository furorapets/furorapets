import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../src/lib/prisma';
import { generateOrderId } from '../src/lib/id-generator';
import { createOrder, linkPetToOrder } from '../src/lib/order-service';
import { POST as createOrderHandler, GET as listOrdersHandler } from '../src/app/api/orders/route';
import { PUT as updateOrderHandler } from '../src/app/api/orders/[id]/route';
import { NextRequest } from 'next/server';

function createMockRequest(url: string, method: string, body?: any, userId = 'usr_cust_1') {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-furora-user-id': userId,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('Phase 4: Customer Ordering & Order-Pet Permanent Linking', () => {
  let activeBreed: any;
  let testPet1: any;
  let testPet2: any;

  beforeAll(async () => {
    await prisma.$connect();
    activeBreed = await prisma.breed.findFirst({ where: { active: true } });
    expect(activeBreed).toBeTruthy();

    // Create 2 test pets
    testPet1 = await prisma.pet.create({
      data: {
        petId: `FUR-PET-ORD-1-${Date.now().toString().slice(-4)}`,
        categoryId: activeBreed.categoryId,
        breedId: activeBreed.id,
        dob: new Date('2026-04-01'),
        sex: 'Male',
        colour: 'Golden',
        status: 'AVAILABLE',
        inventoryOwner: 'FURORA',
        createdById: 'usr_admin',
      },
    });

    testPet2 = await prisma.pet.create({
      data: {
        petId: `FUR-PET-ORD-2-${Date.now().toString().slice(-4)}`,
        categoryId: activeBreed.categoryId,
        breedId: activeBreed.id,
        dob: new Date('2026-04-01'),
        sex: 'Female',
        colour: 'White',
        status: 'AVAILABLE',
        inventoryOwner: 'FURORA',
        createdById: 'usr_admin',
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should auto-generate sequential Order IDs with FUR-ORD-###### format', async () => {
    const id1 = await generateOrderId();
    const id2 = await generateOrderId();
    expect(id1).toMatch(/^FUR-ORD-\d{6}$/);
    expect(id2).toMatch(/^FUR-ORD-\d{6}$/);
    expect(id1).not.toBe(id2);
  });

  it('should allow customer to create order with initial status ORDER_RECEIVED', async () => {
    const req = createMockRequest(
      'http://localhost:3000/api/orders',
      'POST',
      {
        categoryId: activeBreed.categoryId,
        breedId: activeBreed.id,
        productOrPackage: 'Premium Puppy Package',
        customerName: 'Ananya Sharma',
        customerContact: '+91 9876543216',
        deliveryAddress: 'Indiranagar, Bangalore',
      },
      'usr_cust_1'
    );

    const res = await createOrderHandler(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.orderId).toMatch(/^FUR-ORD-\d{6}$/);
    expect(body.data.status).toBe('ORDER_RECEIVED');
    expect(body.data.paymentStatus).toBe('PAID');
    expect(body.data.petId).toBeNull();
  });

  it('should permanently link pet to order and reject reassignment during normal flow', async () => {
    // 1. Create fresh order
    const order = await createOrder({
      customerId: 'usr_cust_1',
      customerName: 'Ananya Sharma',
      customerContact: '+91 9876543216',
      deliveryAddress: 'Indiranagar, Bangalore',
      categoryId: activeBreed.categoryId,
      breedId: activeBreed.id,
      productOrPackage: 'Standard Package',
    });

    // 2. Link Pet 1 to order
    const updated = await linkPetToOrder(order.id, testPet1.id, 'usr_admin');
    expect(updated.petId).toBe(testPet1.id);
    expect(updated.status).toBe('PET_ASSIGNED');

    // Verify Pet 1 status is ASSIGNED_TO_ORDER
    const refreshedPet1 = await prisma.pet.findUnique({ where: { id: testPet1.id } });
    expect(refreshedPet1?.status).toBe('ASSIGNED_TO_ORDER');

    // 3. Attempt to reassign order to Pet 2 via API -> MUST BE REJECTED (400)
    const relinkReq = createMockRequest(
      `http://localhost:3000/api/orders/${order.id}`,
      'PUT',
      { petId: testPet2.id },
      'usr_admin'
    );
    const relinkRes = await updateOrderHandler(relinkReq, { params: { id: order.id } });
    expect(relinkRes.status).toBe(400);
    const errorBody = await relinkRes.json();
    expect(errorBody.error).toContain('Permanent Link Violation');

    // 4. Verify order is still linked to Pet 1
    const orderAfter = await prisma.order.findUnique({ where: { id: order.id } });
    expect(orderAfter?.petId).toBe(testPet1.id);
  });

  it('Customer scoping: Customer only sees own orders', async () => {
    // Customer 2 views orders
    const reqCust2 = createMockRequest('http://localhost:3000/api/orders', 'GET', undefined, 'usr_cust_2');
    const resCust2 = await listOrdersHandler(reqCust2);
    const dataCust2 = await resCust2.json();

    for (const o of dataCust2.data) {
      expect(o.customerId).toBe('usr_cust_2');
    }
  });
});
