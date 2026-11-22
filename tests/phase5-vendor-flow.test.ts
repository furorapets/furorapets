import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../src/lib/prisma';
import { createOrder } from '../src/lib/order-service';
import { PUT as updateOrderHandler } from '../src/app/api/orders/[id]/route';
import { POST as vendorResponseHandler } from '../src/app/api/orders/[id]/vendor-response/route';
import { NextRequest } from 'next/server';

function createMockRequest(url: string, method: string, body?: any, userId = 'usr_vendor_1') {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-furora-user-id': userId,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('Phase 5: Vendor Flow — Assignment, Accept/Reject, & Pet Allocation', () => {
  let activeBreed: any;
  let vendor1Pet: any;
  let vendor2Pet: any;
  let testOrder: any;

  beforeAll(async () => {
    await prisma.$connect();
    activeBreed = await prisma.breed.findFirst({ where: { active: true } });
    expect(activeBreed).toBeTruthy();

    // Create pet in Vendor 1 inventory
    vendor1Pet = await prisma.pet.create({
      data: {
        petId: `FUR-PET-V1-${Date.now().toString().slice(-4)}`,
        categoryId: activeBreed.categoryId,
        breedId: activeBreed.id,
        dob: new Date('2026-05-01'),
        sex: 'Male',
        colour: 'Fawn',
        status: 'AVAILABLE',
        inventoryOwner: 'VENDOR',
        vendorId: 'usr_vendor_1',
        createdById: 'usr_vendor_1',
      },
    });

    // Create pet in Vendor 2 inventory
    vendor2Pet = await prisma.pet.create({
      data: {
        petId: `FUR-PET-V2-${Date.now().toString().slice(-4)}`,
        categoryId: activeBreed.categoryId,
        breedId: activeBreed.id,
        dob: new Date('2026-05-01'),
        sex: 'Female',
        colour: 'Cream',
        status: 'AVAILABLE',
        inventoryOwner: 'VENDOR',
        vendorId: 'usr_vendor_2',
        createdById: 'usr_vendor_2',
      },
    });

    // Create customer order
    testOrder = await createOrder({
      customerId: 'usr_cust_1',
      customerName: 'Ananya Sharma',
      customerContact: '+91 9876543216',
      deliveryAddress: 'Indiranagar, Bangalore',
      categoryId: activeBreed.categoryId,
      breedId: activeBreed.id,
      productOrPackage: 'Standard Package',
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('Admin should assign order to Vendor 1 -> VENDOR_ASSIGNED', async () => {
    const req = createMockRequest(
      `http://localhost:3000/api/orders/${testOrder.id}`,
      'PUT',
      { vendorId: 'usr_vendor_1' },
      'usr_admin'
    );
    const res = await updateOrderHandler(req, { params: { id: testOrder.id } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.vendorId).toBe('usr_vendor_1');
    expect(body.data.status).toBe('VENDOR_ASSIGNED');
  });

  it('Vendor 2 cannot respond to an order assigned to Vendor 1 (Vendor isolation)', async () => {
    const req = createMockRequest(
      `http://localhost:3000/api/orders/${testOrder.id}/vendor-response`,
      'POST',
      { action: 'ACCEPT', petId: vendor2Pet.id },
      'usr_vendor_2' // Not the assigned vendor
    );
    const res = await vendorResponseHandler(req, { params: { id: testOrder.id } });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('not assigned to your facility');
  });

  it('Vendor 1 can REJECT order -> VENDOR_REJECTED', async () => {
    const req = createMockRequest(
      `http://localhost:3000/api/orders/${testOrder.id}/vendor-response`,
      'POST',
      { action: 'REJECT', rejectionReason: 'Temporarily out of puppies' },
      'usr_vendor_1'
    );
    const res = await vendorResponseHandler(req, { params: { id: testOrder.id } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe('VENDOR_REJECTED');
  });

  it('Admin reassigns to Vendor 2 and Vendor 2 ACCEPTS by allocating their pet', async () => {
    // 1. Admin reassigns to Vendor 2
    const reqAssign = createMockRequest(
      `http://localhost:3000/api/orders/${testOrder.id}`,
      'PUT',
      { vendorId: 'usr_vendor_2' },
      'usr_admin'
    );
    const resAssign = await updateOrderHandler(reqAssign, { params: { id: testOrder.id } });
    expect(resAssign.status).toBe(200);
    expect((await resAssign.json()).data.status).toBe('VENDOR_ASSIGNED');

    // 2. Vendor 2 cannot assign Vendor 1 pet (Security check)
    const reqIllegalPet = createMockRequest(
      `http://localhost:3000/api/orders/${testOrder.id}/vendor-response`,
      'POST',
      { action: 'ACCEPT', petId: vendor1Pet.id },
      'usr_vendor_2'
    );
    const resIllegalPet = await vendorResponseHandler(reqIllegalPet, { params: { id: testOrder.id } });
    expect(resIllegalPet.status).toBe(403);

    // 3. Vendor 2 assigns their own pet (vendor2Pet) -> PET_ASSIGNED
    const reqAccept = createMockRequest(
      `http://localhost:3000/api/orders/${testOrder.id}/vendor-response`,
      'POST',
      { action: 'ACCEPT', petId: vendor2Pet.id },
      'usr_vendor_2'
    );
    const resAccept = await vendorResponseHandler(reqAccept, { params: { id: testOrder.id } });
    expect(resAccept.status).toBe(200);
    const dataAccept = (await resAccept.json()).data;
    expect(dataAccept.status).toBe('PET_ASSIGNED');
    expect(dataAccept.petId).toBe(vendor2Pet.id);

    // Verify pet status changed to ASSIGNED_TO_ORDER
    const refreshedPet = await prisma.pet.findUnique({ where: { id: vendor2Pet.id } });
    expect(refreshedPet?.status).toBe('ASSIGNED_TO_ORDER');
  });
});
