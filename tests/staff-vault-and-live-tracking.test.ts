import { describe, it, expect, beforeEach } from 'vitest';
import prisma from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { POST as createUser, GET as getUsers } from '@/app/api/users/route';
import { PUT as updateUser, GET as getUserById } from '@/app/api/users/[id]/route';
import { GET as getCustomerRecord } from '@/app/api/records/[orderId]/route';
import { submitMedicalExamination } from '@/lib/medical-service';

describe('Staff Credential Vault & Swiggy-Style Live Tracking', () => {
  const adminId = 'usr_admin';
  const salesId = 'usr_sales_1';

  it('1. Admin can create a delivery agent with username and custom password', async () => {
    const testEmail = `agent_test_${Date.now()}@furora.com`;
    const testUsername = `test_agent_${Date.now().toString(36)}`;
    const testPassword = 'AdminSecretPassword@123';

    const req = new NextRequest('http://localhost:3000/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': adminId,
      },
      body: JSON.stringify({
        name: 'Karan Delivery Specialist',
        email: testEmail,
        username: testUsername,
        password: testPassword,
        role: 'DELIVERY_AGENT',
        phone: '+91 9988776655',
        assignedHub: 'Gurgaon Field Hub',
      }),
    });

    const res = await createUser(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.username).toBe(testUsername);
    expect(json.data.tempPassword).toBe(testPassword);
  });

  it('2. Non-admin users CANNOT view staff passwords (security sanitization)', async () => {
    const req = new NextRequest('http://localhost:3000/api/users?type=staff', {
      method: 'GET',
      headers: {
        'x-user-id': salesId, // Non-admin caller
      },
    });

    const res = await getUsers(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    // Non-admin should NEVER see tempPassword or password fields
    for (const user of json.data) {
      expect(user.password).toBeUndefined();
      expect(user.tempPassword).toBeUndefined();
    }
  });

  it('3. Only ADMIN can reset staff passwords; Non-admin receives 403 Forbidden', async () => {
    const agent = await prisma.user.findFirst({ where: { role: 'DELIVERY_AGENT' } });
    expect(agent).toBeDefined();

    // Attempt 1: Non-admin tries to change password -> 403
    const unauthorizedReq = new NextRequest(`http://localhost:3000/api/users/${agent!.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': salesId, // Non-admin
      },
      body: JSON.stringify({ password: 'HackedPassword123' }),
    });

    const unauthorizedRes = await updateUser(unauthorizedReq, { params: Promise.resolve({ id: agent!.id }) });
    expect(unauthorizedRes.status).toBe(403);

    // Attempt 2: Admin resets password -> 200 Success
    const newAdminSetPassword = 'NewAdminPassword@2026';
    const adminReq = new NextRequest(`http://localhost:3000/api/users/${agent!.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': adminId,
      },
      body: JSON.stringify({ password: newAdminSetPassword }),
    });

    const adminRes = await updateUser(adminReq, { params: Promise.resolve({ id: agent!.id }) });
    const adminJson = await adminRes.json();
    expect(adminRes.status).toBe(200);
    expect(adminJson.success).toBe(true);
    expect(adminJson.data.tempPassword).toBe(newAdminSetPassword);
  });

  it('4. Public Live Journey API (/api/records/[orderId]) returns Swiggy/Zomato liveTracking payload', async () => {
    const order = await prisma.order.findFirst({
      where: { petId: { not: null } },
      include: { pet: true },
    });
    expect(order).toBeDefined();

    const req = new NextRequest(`http://localhost:3000/api/records/${order!.orderId}`, {
      method: 'GET',
    });

    const res = await getCustomerRecord(req, { params: { orderId: order!.orderId } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.liveTracking).toBeDefined();
    expect(json.data.liveTracking.statusHeadline).toBeDefined();
    expect(json.data.liveTracking.etaText).toBeDefined();
    expect(json.data.liveTracking.deliveryPartner.name).toBeDefined();
    expect(json.data.liveTracking.deliveryPartner.rating).toContain('★');
    expect(json.data.liveTracking.checkpoints.kennel).toBeDefined();
    expect(json.data.liveTracking.checkpoints.medical).toBeDefined();
    expect(json.data.liveTracking.checkpoints.delivery).toBeDefined();
  });

  it('5. Vendor Escrow Payout is APPROVED_FOR_PAYOUT strictly when Medical Clearance passes', async () => {
    // Create a fresh test order with linked pet and vendor
    const vendor = await prisma.user.findFirst({ where: { role: 'VENDOR' } });
    const breed = await prisma.breed.findFirst();
    let customer = await prisma.user.findFirst({ where: { role: 'CUSTOMER' } });
    if (!customer) {
      customer = await prisma.user.create({
        data: {
          id: `usr_test_cust_${Date.now()}`,
          name: 'Test Customer',
          email: `testcust_${Date.now()}@example.com`,
          phone: '+91 9900112233',
          role: 'CUSTOMER',
        },
      });
    }

    const orderIdStr = `FUR-ORD-TEST-${Date.now().toString().slice(-4)}`;
    const testOrder = await prisma.order.create({
      data: {
        orderId: orderIdStr,
        customerId: customer!.id,
        customerName: 'Test Buyer',
        customerContact: '+91 9900112233',
        deliveryAddress: 'Flat 402, DLF Phase 5, Gurgaon',
        categoryId: breed!.categoryId,
        breedId: breed!.id,
        productOrPackage: 'Standard Pet Delivery Package',
        paymentStatus: 'PAID',
        vendorId: vendor!.id,
        vendorPayoutStatus: 'HELD_IN_ESCROW',
        status: 'MEDICAL_CHECK',
      },
    });

    const petIdStr = `FUR-PET-TEST-${Date.now().toString().slice(-4)}`;
    const testPet = await prisma.pet.create({
      data: {
        petId: petIdStr,
        categoryId: breed!.categoryId,
        breedId: breed!.id,
        sex: 'MALE',
        colour: 'Golden Cream',
        dob: new Date('2024-05-10'),
        inventoryOwner: 'VENDOR',
        vendorId: vendor!.id,
        createdById: adminId,
        status: 'MEDICAL_PENDING',
      },
    });

    await prisma.order.update({
      where: { id: testOrder.id },
      data: { petId: testPet.id },
    });

    // Pass medical examination
    const res = await submitMedicalExamination({
      orderId: testOrder.id,
      petId: testPet.id,
      actorId: adminId,
      result: 'APPROVED',
      vetClinicName: 'Crown Vet Specialty Diagnostics',
      vetDoctorName: 'Dr. Aditi Mukherjee, BVSc',
    });

    expect(res.order.status).toBe('READY_FOR_DELIVERY');
    expect(res.order.vendorPayoutStatus).toBe('APPROVED_FOR_PAYOUT');
    expect(res.order.vetClinicName).toBe('Crown Vet Specialty Diagnostics');
  });
});
