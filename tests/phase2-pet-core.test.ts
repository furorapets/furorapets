import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../src/lib/prisma';
import { generatePetId } from '../src/lib/id-generator';
import { calculateAge } from '../src/lib/age-calculator';
import { validatePetTransition } from '../src/lib/state-machine';
import { POST as createPetHandler, GET as listPetsHandler } from '../src/app/api/pets/route';
import { PUT as updatePetHandler } from '../src/app/api/pets/[id]/route';
import { POST as transferPetHandler } from '../src/app/api/pets/[id]/transfer/route';
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

describe('Phase 2: Pet Core — ID Gen, Profile, Dynamic Age, & State Machine', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should generate sequential Pet IDs with FUR-PET-###### format', async () => {
    const id1 = await generatePetId();
    const id2 = await generatePetId();
    expect(id1).toMatch(/^FUR-PET-\d{6}$/);
    expect(id2).toMatch(/^FUR-PET-\d{6}$/);
    expect(id1).not.toBe(id2);
  });

  it('should correctly calculate age from DOB', () => {
    // 3 months ago
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const age = calculateAge(threeMonthsAgo);
    expect(age.months).toBe(3);
    expect(age.formatted).toContain('3 mos');
  });

  it('should reject pet creation for inactive breed', async () => {
    const inactiveBreed = await prisma.breed.findFirst({ where: { active: false } });
    expect(inactiveBreed).toBeTruthy();

    const req = createMockRequest(
      'http://localhost:3000/api/pets',
      'POST',
      {
        categoryId: inactiveBreed!.categoryId,
        breedId: inactiveBreed!.id,
        dob: '2026-05-01',
        sex: 'Male',
        colour: 'Fawn',
      },
      'usr_admin'
    );

    const res = await createPetHandler(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('inactive/deactivated breed');
  });

  it('should create pet with auto-generated ID and enforce Vendor ownership scoping', async () => {
    const activeBreed = await prisma.breed.findFirst({ where: { active: true } });
    expect(activeBreed).toBeTruthy();

    // Vendor 1 creates pet
    const req = createMockRequest(
      'http://localhost:3000/api/pets',
      'POST',
      {
        categoryId: activeBreed!.categoryId,
        breedId: activeBreed!.id,
        dob: '2026-06-01',
        sex: 'Female',
        colour: 'White',
        fatherName: 'Champion Max',
        motherName: 'Bella',
        kciRegistered: true,
      },
      'usr_vendor_1'
    );

    const res = await createPetHandler(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.petId).toMatch(/^FUR-PET-\d{6}$/);
    expect(body.data.inventoryOwner).toBe('VENDOR');
    expect(body.data.vendorId).toBe('usr_vendor_1');
    expect(body.data.kciRegistered).toBe(true);
  });

  it('should validate status transitions according to the state machine', () => {
    // Valid transitions
    expect(validatePetTransition('AVAILABLE', 'RESERVED')).toBe(true);
    expect(validatePetTransition('AVAILABLE', 'ASSIGNED_TO_ORDER')).toBe(true);
    expect(validatePetTransition('ASSIGNED_TO_ORDER', 'PICKUP_PENDING')).toBe(true);

    // Invalid transition: AVAILABLE directly to DELIVERED
    expect(() => validatePetTransition('AVAILABLE', 'DELIVERED')).toThrow(
      /Invalid Pet status transition/
    );
  });

  it('should allow Admin to transfer ownership between Furora and Vendor and log audit trail', async () => {
    // Create a Furora-owned pet
    const activeBreed = await prisma.breed.findFirst({ where: { active: true } });
    const createReq = createMockRequest(
      'http://localhost:3000/api/pets',
      'POST',
      {
        categoryId: activeBreed!.categoryId,
        breedId: activeBreed!.id,
        dob: '2026-06-01',
        sex: 'Male',
        colour: 'Black',
        inventoryOwner: 'FURORA',
      },
      'usr_admin'
    );
    const createRes = await createPetHandler(createReq);
    const newPet = (await createRes.json()).data;

    // Admin transfers pet to Vendor 2
    const transferReq = createMockRequest(
      `http://localhost:3000/api/pets/${newPet.id}/transfer`,
      'POST',
      {
        targetOwner: 'VENDOR',
        targetVendorId: 'usr_vendor_2',
        reason: 'Consignment to Furry Friends Kennel',
      },
      'usr_admin'
    );
    const transferRes = await transferPetHandler(transferReq, { params: { id: newPet.id } });
    expect(transferRes.status).toBe(200);

    const updatedPet = (await transferRes.json()).data;
    expect(updatedPet.inventoryOwner).toBe('VENDOR');
    expect(updatedPet.vendorId).toBe('usr_vendor_2');

    // Verify audit log entry exists
    const audit = await prisma.auditLog.findFirst({
      where: { action: 'INVENTORY_OWNERSHIP_MOVE' },
      orderBy: { timestamp: 'desc' },
    });
    expect(audit).toBeTruthy();
    expect(audit?.metadata).toContain(newPet.petId);
  });
});
