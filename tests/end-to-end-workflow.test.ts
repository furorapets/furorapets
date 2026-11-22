import { describe, it, expect, beforeAll } from 'vitest';
import prisma from '@/lib/prisma';
import { createOrder, linkPetToOrder } from '@/lib/order-service';
import { submitPickupInspection } from '@/lib/inspection-service';
import { submitMedicalExamination } from '@/lib/medical-service';
import { submitDeliveryCompletion } from '@/lib/delivery-service';

describe('End-to-End Correct Operational Workflow', () => {
  let adminUser: any;
  let vendorUser: any;
  let agentUser: any;
  let customerUser: any;
  let category: any;
  let breed: any;
  let pet: any;

  beforeAll(async () => {
    // 1. Fetch or create test actors
    adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    vendorUser = await prisma.user.findFirst({ where: { role: 'VENDOR', onboardingStatus: 'APPROVED' } });
    agentUser = await prisma.user.findFirst({ where: { role: 'DELIVERY_AGENT' } });
    customerUser = await prisma.user.findFirst({ where: { role: 'CUSTOMER' } });
    category = await prisma.category.findFirst({ where: { active: true } });
    breed = await prisma.breed.findFirst({ where: { categoryId: category.id, active: true } });

    // 2. Create an in-stock pet for the vendor
    pet = await prisma.pet.create({
      data: {
        petId: `FUR-TEST-PET-${Date.now()}`,
        categoryId: category.id,
        breedId: breed.id,
        dob: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days old
        sex: 'Male',
        colour: 'Golden / White',
        photos: JSON.stringify(['https://images.unsplash.com/photo-1543466835-00a7907e9de1']),
        inventoryOwner: 'VENDOR',
        vendorId: vendorUser.id,
        createdById: vendorUser.id,
        status: 'AVAILABLE',
      },
    });
  });

  it('1. should create an Ad Campaign order with marketing attribution and advance payment', async () => {
    const order = await createOrder({
      customerId: customerUser.id,
      customerName: 'Rohit Verma',
      customerContact: '+91 9988776655',
      deliveryAddress: 'Flat 402, Marvel Heights, Indiranagar, Bangalore',
      categoryId: category.id,
      breedId: breed.id,
      productOrPackage: 'Show Quality Pedigree Puppy Package',
      orderSource: 'AD_CAMPAIGN',
      adCampaign: 'Instagram PuppyFest #2',
      advancePaid: 15000,
      paymentMode: 'ADVANCE_COD',
      paymentStatus: 'PAID',
    });

    expect(order.orderId).toBeDefined();
    expect(order.status).toBe('ORDER_RECEIVED');
    expect(order.orderSource).toBe('AD_CAMPAIGN');
    expect(order.adCampaign).toBe('Instagram PuppyFest #2');
    expect(order.advancePaid).toBe(15000);
    expect(order.paymentMode).toBe('ADVANCE_COD');

    // Assign to vendor kennel
    const assignedOrder = await prisma.order.update({
      where: { id: order.id },
      data: { vendorId: vendorUser.id, status: 'VENDOR_ASSIGNED' },
    });
    expect(assignedOrder.status).toBe('VENDOR_ASSIGNED');
  });

  it('2. should allow vendor to accept order, permanently allocate pet, and attach kennel origin documents', async () => {
    const order = await createOrder({
      customerId: customerUser.id,
      customerName: 'Priya Sundaram',
      customerContact: '+91 9123456789',
      deliveryAddress: 'HSR Layout Sector 2, Bangalore',
      categoryId: category.id,
      breedId: breed.id,
      productOrPackage: 'Companion Animal Standard Package',
      orderSource: 'AD_CAMPAIGN',
      adCampaign: 'Google Ads Bangalore',
    });

    // Vendor accepts order & allocates pet
    const linked = await linkPetToOrder(order.id, pet.id, vendorUser.id);
    expect(linked.status).toBe('PET_ASSIGNED');
    expect(linked.petId).toBe(pet.id);

    // Register Breeder Kennel Origin Documents
    const vacDoc = await prisma.document.create({
      data: {
        petId: pet.id,
        orderId: order.id,
        type: 'KENNEL_VACCINATION_CARD',
        visibility: 'CUSTOMER_VISIBLE',
        fileName: 'Breeder Puppy Vaccination Card.pdf',
        fileUrl: 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289',
        uploadedById: vendorUser.id,
      },
    });

    const dewormDoc = await prisma.document.create({
      data: {
        petId: pet.id,
        orderId: order.id,
        type: 'KENNEL_DEWORMING_RECORD',
        visibility: 'CUSTOMER_VISIBLE',
        fileName: 'Breeder Deworming Schedule.pdf',
        fileUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982',
        uploadedById: vendorUser.id,
      },
    });

    expect(vacDoc.id).toBeDefined();
    expect(dewormDoc.id).toBeDefined();

    // Verify documents attached to order
    const docs = await prisma.document.findMany({ where: { orderId: order.id } });
    expect(docs.length).toBeGreaterThanOrEqual(2);
  });

  it('3. should complete the 3-location physical custody chain: Pickup -> Vet Clearance -> Doorstep Handover', async () => {
    // Create dedicated pet for this order
    const dedicatedPet = await prisma.pet.create({
      data: {
        petId: `FUR-CUSTODY-PET-${Date.now()}`,
        categoryId: category.id,
        breedId: breed.id,
        dob: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000),
        sex: 'Female',
        colour: 'Pure White',
        photos: JSON.stringify(['https://images.unsplash.com/photo-1543466835-00a7907e9de1']),
        inventoryOwner: 'VENDOR',
        vendorId: vendorUser.id,
        createdById: vendorUser.id,
        status: 'AVAILABLE',
      },
    });

    const order = await createOrder({
      customerId: customerUser.id,
      customerName: 'Sunil Nair',
      customerContact: '+91 9888877777',
      deliveryAddress: 'Koramangala 4th Block, Bangalore',
      categoryId: category.id,
      breedId: breed.id,
      productOrPackage: 'Full Health Guarantee Package',
    });

    // 1. Permanent link pet & assign agent
    await linkPetToOrder(order.id, dedicatedPet.id, vendorUser.id);
    await prisma.order.update({
      where: { id: order.id },
      data: { agentId: agentUser.id, status: 'PICKUP_ASSIGNED' },
    });

    // 2. Milestone 1: Physical Pickup at Breeder Kennel
    const inspection = await submitPickupInspection({
      orderId: order.id,
      agentId: agentUser.id,
      photos: ['https://images.unsplash.com/photo-1543466835-00a7907e9de1'],
      notes: 'Kennel pickup inspected. Microchip verified, puppy is energetic.',
      physicalCondition: '10/10 health points verified at breeding facility',
      result: 'ACCEPT',
    });
    expect(inspection.result).toBe('ACCEPT');

    const orderPostPickup = await prisma.order.findUnique({ where: { id: order.id } });
    expect(orderPostPickup?.status).toBe('MEDICAL_CHECK');

    // 3. Milestone 2: Veterinary Medical Center Clearance
    const medResult = await submitMedicalExamination({
      orderId: order.id,
      petId: dedicatedPet.id,
      actorId: agentUser.id,
      result: 'APPROVED',
      proofDocs: ['https://images.unsplash.com/photo-1576765608535-5f04d1e3f289'],
      documents: [
        {
          type: 'VET_MEDICAL_CERTIFICATE',
          visibility: 'CUSTOMER_VISIBLE',
          fileName: 'Veterinary Medical Clearance - Crown Vet Animal Hospital.pdf',
          fileUrl: 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289',
        },
        {
          type: 'VET_VIRAL_TEST_REPORT',
          visibility: 'CUSTOMER_VISIBLE',
          fileName: 'Rapid Viral Antigen Screening (Parvo: NEGATIVE, Distemper: NEGATIVE).pdf',
          fileUrl: 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289',
        },
      ],
    });
    expect(medResult.order.status).toBe('READY_FOR_DELIVERY');

    // 4. Milestone 3: Customer Doorstep Handover & POD
    const pod = await submitDeliveryCompletion({
      orderId: order.id,
      agentId: agentUser.id,
      photo: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1',
      photoWithCustomer: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1',
      customerIdCaptured: 'GOV-AADHAAR-99881122',
      signedDeliveryReport: 'SIGN-HASH-VERIFIED-HANDOVER-OK',
      customerAcknowledgement: 'Recipient confirms delivery of healthy companion puppy with complete provenance documentation.',
    });
    expect(pod.order.status).toBe('DELIVERY_COMPLETED');

    // 5. Verify that all documents across all 3 locations are stored on the order
    const orderDocs = await prisma.document.findMany({
      where: { orderId: order.id, visibility: 'CUSTOMER_VISIBLE' },
    });
    expect(orderDocs.length).toBeGreaterThanOrEqual(4); // Vet Cert + Vet Viral + Delivery Photo + Delivery Report
  });
});
