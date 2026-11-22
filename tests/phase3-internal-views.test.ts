import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../src/lib/prisma';
import { GET as listPetsHandler } from '../src/app/api/pets/route';
import { GET as getPetHandler } from '../src/app/api/pets/[id]/route';
import { GET as getOrdersHandler } from '../src/app/api/orders/route';
import { POST as postMedicalHandler } from '../src/app/api/medical/route';
import { GET as getAuditHandler } from '../src/app/api/audit/route';
import { NextRequest } from 'next/server';

function createMockRequest(url: string, method: string, body?: any, userId = 'usr_sales') {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-furora-user-id': userId,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('Phase 3: Internal Views — Sales Scoping & Admin Views', () => {
  let availablePet: any;
  let nonAvailablePet: any;

  beforeAll(async () => {
    await prisma.$connect();

    // Ensure we have at least one AVAILABLE pet and one NON-AVAILABLE pet
    const breed = await prisma.breed.findFirst({ where: { active: true } });
    expect(breed).toBeTruthy();

    // Create an AVAILABLE pet with mock private docs
    availablePet = await prisma.pet.create({
      data: {
        petId: `FUR-PET-TEST-AV-${Date.now().toString().slice(-4)}`,
        categoryId: breed!.categoryId,
        breedId: breed!.id,
        dob: new Date('2026-03-01'),
        sex: 'Male',
        colour: 'Golden',
        status: 'AVAILABLE',
        inventoryOwner: 'FURORA',
        fatherName: 'Champion Duke',
        fatherPhoto: 'https://example.com/father.jpg',
        fatherDocs: JSON.stringify(['https://example.com/private-contract.pdf']),
        motherName: 'Lady Bella',
        motherPhoto: 'https://example.com/mother.jpg',
        motherDocs: JSON.stringify(['https://example.com/private-health-dossier.pdf']),
        createdById: 'usr_admin',
      },
    });

    // Create a NON-AVAILABLE pet (e.g. IN_TRANSIT)
    nonAvailablePet = await prisma.pet.create({
      data: {
        petId: `FUR-PET-TEST-NA-${Date.now().toString().slice(-4)}`,
        categoryId: breed!.categoryId,
        breedId: breed!.id,
        dob: new Date('2026-03-01'),
        sex: 'Female',
        colour: 'Black',
        status: 'IN_TRANSIT',
        inventoryOwner: 'FURORA',
        createdById: 'usr_admin',
      },
    });
  });

  afterAll(async () => {
    if (availablePet?.id) {
      await prisma.pet.delete({ where: { id: availablePet.id } }).catch(() => {});
    }
    if (nonAvailablePet?.id) {
      await prisma.pet.delete({ where: { id: nonAvailablePet.id } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  it('Sales Team view should only return AVAILABLE pets', async () => {
    const req = createMockRequest('http://localhost:3000/api/pets', 'GET', undefined, 'usr_sales');
    const res = await listPetsHandler(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);

    // Assert every single returned pet has status === AVAILABLE
    for (const pet of body.data) {
      expect(pet.status).toBe('AVAILABLE');
      // Assert private vendor or internal fields are redacted
      expect(pet.vendorId).toBeUndefined();
      expect(pet.createdById).toBeUndefined();
      expect(pet.internalCost).toBeUndefined();
      expect(pet.medicalRecords).toBeUndefined();
    }
  });

  it('Sales Team viewing pet profile should receive parent media but private vendor docs must remain redacted', async () => {
    const req = createMockRequest(`http://localhost:3000/api/pets/${availablePet.petId}`, 'GET', undefined, 'usr_sales');
    const res = await getPetHandler(req, { params: { id: availablePet.petId } });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.fatherName).toBe('Champion Duke');
    expect(body.data.fatherPhoto).toBe('https://example.com/father.jpg');
    expect(body.data.motherName).toBe('Lady Bella');
    expect(body.data.motherPhoto).toBe('https://example.com/mother.jpg');

    // Private vendor documents MUST be empty array / inaccessible
    expect(body.data.fatherDocs).toEqual([]);
    expect(body.data.motherDocs).toEqual([]);
    expect(body.data.vendor).toBeUndefined();
    expect(body.data.vendorId).toBeUndefined();
    expect(body.data.internalCost).toBeUndefined();
    expect(body.data.medicalRecords).toBeUndefined();
  });

  it('Sales Team is blocked from accessing non-available pet details', async () => {
    const req = createMockRequest(`http://localhost:3000/api/pets/${nonAvailablePet.petId}`, 'GET', undefined, 'usr_sales');
    const res = await getPetHandler(req, { params: { id: nonAvailablePet.petId } });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Sales team can only access available inventory');
  });

  it('Sales Team is blocked from viewing customer orders', async () => {
    const req = createMockRequest('http://localhost:3000/api/orders', 'GET', undefined, 'usr_sales');
    const res = await getOrdersHandler(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Sales team cannot view customer orders');
  });

  it('Sales Team is blocked from submitting or viewing medical exams', async () => {
    const req = createMockRequest(
      'http://localhost:3000/api/medical',
      'POST',
      { orderId: 'test-order', result: 'PASS' },
      'usr_sales'
    );
    const res = await postMedicalHandler(req);
    expect(res.status).toBe(403);
  });

  it('Delivery Agent is blocked from browsing inventory', async () => {
    const req = createMockRequest('http://localhost:3000/api/pets', 'GET', undefined, 'usr_agent_1');
    const res = await listPetsHandler(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Delivery agents cannot browse inventory');
  });

  it('Sales Team is blocked from viewing audit logs', async () => {
    const req = createMockRequest('http://localhost:3000/api/audit', 'GET', undefined, 'usr_sales');
    const res = await getAuditHandler(req);
    expect(res.status).toBe(403);
  });

  it('Admin can view full audit logs', async () => {
    const req = createMockRequest('http://localhost:3000/api/audit', 'GET', undefined, 'usr_admin');
    const res = await getAuditHandler(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });
});
