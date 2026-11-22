import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../src/lib/prisma';
import { createOrder, linkPetToOrder } from '../src/lib/order-service';
import { generatePetCertificate } from '../src/lib/certificate-service';
import { POST as generateCertHandler } from '../src/app/api/certificates/generate/route';
import { GET as getRecordHandler } from '../src/app/api/records/[orderId]/route';
import { NextRequest } from 'next/server';

function createMockRequest(url: string, method: string, body?: any) {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('Phase 8: Customer Record & QR Certificate Generator', () => {
  let activeBreed: any;
  let testPet: any;
  let testOrder: any;

  beforeAll(async () => {
    await prisma.$connect();
    activeBreed = await prisma.breed.findFirst({ where: { active: true } });

    testPet = await prisma.pet.create({
      data: {
        petId: `FUR-PET-CERT-${Date.now().toString().slice(-4)}`,
        categoryId: activeBreed.categoryId,
        breedId: activeBreed.id,
        dob: new Date('2026-05-01'),
        sex: 'Female',
        colour: 'White & Tan',
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
      productOrPackage: 'Premium Package',
    });

    await linkPetToOrder(testOrder.id, testPet.id, 'usr_admin');
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should reject certificate generation if medical clearance has not passed', async () => {
    // Current status is PET_ASSIGNED
    const req = createMockRequest('http://localhost:3000/api/certificates/generate', 'POST', {
      orderId: testOrder.id,
    });
    const res = await generateCertHandler(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Pet must have passed medical examination');
  });

  it('should generate digital certificate with QR code once medical clearance passes', async () => {
    // Advance order to READY_FOR_DELIVERY
    await prisma.order.update({
      where: { id: testOrder.id },
      data: { status: 'READY_FOR_DELIVERY' },
    });

    const cert = await generatePetCertificate(testOrder.id, 'http://localhost:3000');
    expect(cert).toBeTruthy();
    expect(cert.certificateId).toMatch(/^FUR-CERT-\d{6}$/);
    expect(cert.qrCodeUrl).toContain('data:image/png;base64,');
    expect(cert.verificationUrl).toBe(`http://localhost:3000/records/${testOrder.orderId}`);
  });

  it('should serve customer-safe verified record via /api/records/[orderId]', async () => {
    // Attach one CUSTOMER_VISIBLE and one ADMIN_ONLY document
    await prisma.document.create({
      data: {
        orderId: testOrder.id,
        petId: testPet.id,
        type: 'CERTIFICATE',
        visibility: 'CUSTOMER_VISIBLE',
        fileName: 'customer-health-card.pdf',
        fileUrl: 'https://storage.furora.com/customer-health-card.pdf',
        uploadedById: 'usr_admin',
      },
    });

    await prisma.document.create({
      data: {
        orderId: testOrder.id,
        petId: testPet.id,
        type: 'MEDICAL_REPORT',
        visibility: 'ADMIN_ONLY',
        fileName: 'internal-lab-pathology.pdf',
        fileUrl: 'https://storage.furora.com/internal-lab.pdf',
        uploadedById: 'usr_admin',
      },
    });

    const req = createMockRequest(`http://localhost:3000/api/records/${testOrder.orderId}`, 'GET');
    const res = await getRecordHandler(req, { params: { orderId: testOrder.orderId } });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.orderId).toBe(testOrder.orderId);
    expect(body.data.certificate.certificateId).toMatch(/^FUR-CERT-\d{6}$/);

    // Assert only CUSTOMER_VISIBLE docs appear
    const docFiles = body.data.verifiedDocuments.map((d: any) => d.fileName);
    expect(docFiles).toContain('customer-health-card.pdf');
    expect(docFiles).not.toContain('internal-lab-pathology.pdf');
  });
});
