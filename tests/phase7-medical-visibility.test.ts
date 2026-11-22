import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../src/lib/prisma';
import { createOrder, linkPetToOrder } from '../src/lib/order-service';
import { submitMedicalExamination, resolveMedicalFailure } from '../src/lib/medical-service';
import { GET as listDocumentsHandler, POST as uploadDocumentHandler } from '../src/app/api/documents/route';
import { POST as submitMedicalHandler } from '../src/app/api/medical/route';
import { POST as resolveMedicalHandler } from '../src/app/api/medical/resolve/route';
import { NextRequest } from 'next/server';

function createMockRequest(url: string, method: string, body?: any, userId = 'usr_admin') {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-furora-user-id': userId,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('Phase 7: Medical Examination & Document Visibility Engine', () => {
  let activeBreed: any;
  let testPet: any;
  let testPetReplacement: any;
  let testOrder: any;

  beforeAll(async () => {
    await prisma.$connect();
    activeBreed = await prisma.breed.findFirst({ where: { active: true } });

    testPet = await prisma.pet.create({
      data: {
        petId: `FUR-PET-MED-1-${Date.now().toString().slice(-4)}`,
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

    testPetReplacement = await prisma.pet.create({
      data: {
        petId: `FUR-PET-MED-2-${Date.now().toString().slice(-4)}`,
        categoryId: activeBreed.categoryId,
        breedId: activeBreed.id,
        dob: new Date('2026-05-01'),
        sex: 'Male',
        colour: 'White',
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

    // Link pet, vendor, and agent
    await linkPetToOrder(testOrder.id, testPet.id, 'usr_admin');
    await prisma.order.update({
      where: { id: testOrder.id },
      data: {
        vendorId: 'usr_vendor_1',
        agentId: 'usr_agent_1',
        status: 'MEDICAL_CHECK',
      },
    });

    // Upload documents with 5 different visibility tags for this order
    const visibilities = [
      'ADMIN_ONLY',
      'INTERNAL_FURORA',
      'VENDOR_VISIBLE',
      'CUSTOMER_VISIBLE',
      'DELIVERY_AGENT_VISIBLE',
    ];

    for (const vis of visibilities) {
      await prisma.document.create({
        data: {
          orderId: testOrder.id,
          petId: testPet.id,
          type: 'MEDICAL_REPORT',
          visibility: vis,
          fileName: `report-${vis.toLowerCase()}.pdf`,
          fileUrl: `https://storage.furora.com/docs/${vis.toLowerCase()}.pdf`,
          uploadedById: 'usr_admin',
        },
      });
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('Central Document Visibility Engine: Admin sees all 5 visibility levels', async () => {
    const req = createMockRequest(`http://localhost:3000/api/documents?orderId=${testOrder.id}`, 'GET', undefined, 'usr_admin');
    const res = await listDocumentsHandler(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBe(5);
  });

  it('Central Document Visibility Engine: Customer strictly ONLY sees CUSTOMER_VISIBLE documents', async () => {
    const req = createMockRequest(`http://localhost:3000/api/documents?orderId=${testOrder.id}`, 'GET', undefined, 'usr_cust_1');
    const res = await listDocumentsHandler(req);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.data.length).toBe(1);
    expect(body.data[0].visibility).toBe('CUSTOMER_VISIBLE');
  });

  it('Central Document Visibility Engine: Vendor sees VENDOR_VISIBLE and CUSTOMER_VISIBLE, but not INTERNAL or ADMIN_ONLY', async () => {
    const req = createMockRequest(`http://localhost:3000/api/documents?orderId=${testOrder.id}`, 'GET', undefined, 'usr_vendor_1');
    const res = await listDocumentsHandler(req);
    expect(res.status).toBe(200);
    const body = await res.json();

    const visList = body.data.map((d: any) => d.visibility);
    expect(visList).toContain('VENDOR_VISIBLE');
    expect(visList).toContain('CUSTOMER_VISIBLE');
    expect(visList).not.toContain('ADMIN_ONLY');
    expect(visList).not.toContain('INTERNAL_FURORA');
  });

  it('Medical Examination APPROVED flow transitions Order to READY_FOR_DELIVERY and Pet to MEDICAL_APPROVED', async () => {
    const res = await submitMedicalExamination({
      orderId: testOrder.id,
      petId: testPet.id,
      actorId: 'usr_agent_1',
      result: 'APPROVED',
    });

    expect(res.order.status).toBe('READY_FOR_DELIVERY');
    expect(res.order.pet.status).toBe('MEDICAL_APPROVED');
  });

  it('Medical Examination FAILED flow transitions Order to MEDICAL_FAILED and Pet to RETURNED', async () => {
    // Reset order status to MEDICAL_CHECK
    await prisma.order.update({
      where: { id: testOrder.id },
      data: { status: 'MEDICAL_CHECK' },
    });

    const res = await submitMedicalExamination({
      orderId: testOrder.id,
      petId: testPet.id,
      actorId: 'usr_agent_1',
      result: 'FAILED',
      reason: 'Parvovirus test positive during quarantine',
      proofDocs: ['https://storage.furora.com/proof/parvo_test.pdf'],
    });

    expect(res.order.status).toBe('MEDICAL_FAILED');
    expect(res.order.pet.status).toBe('RETURNED');
  });

  it('Admin Medical Failure Resolution: Reassign to replacement pet is allowed in MEDICAL_FAILED state', async () => {
    const req = createMockRequest(
      'http://localhost:3000/api/medical/resolve',
      'POST',
      {
        orderId: testOrder.id,
        decision: 'REASSIGN',
        newPetId: testPetReplacement.id,
      },
      'usr_admin'
    );

    const res = await resolveMedicalHandler(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.petId).toBe(testPetReplacement.id);
    expect(body.data.status).toBe('PET_ASSIGNED');
  });
});
