import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { assertRole, rbacErrorResponse } from '@/lib/rbac';
import { getCurrentUser } from '@/lib/auth';
import { calculateAge } from '@/lib/age-calculator';
import { validatePetTransition } from '@/lib/state-machine';
import { logAudit } from '@/lib/audit';
import { PetStatus } from '@/types';
import { generatePetQr } from '@/lib/pet-qr';

// GET /api/pets/[id] - Accessible by Admin, Vendor, Sales, Customer, and Public QR Scanners
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser(req);
    const { id } = params;

    const pet = await prisma.pet.findFirst({
      where: { OR: [{ id }, { petId: id }] },
      include: {
        category: true,
        breed: true,
        vendor: { select: { id: true, name: true, email: true } },
        order: {
          select: {
            id: true,
            orderId: true,
            status: true,
            customerName: true,
            customerContact: true,
            deliveryAddress: true,
            productOrPackage: true,
          },
        },
      },
    });

    if (!pet) {
      return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
    }

    // Role-based visibility check for authenticated users
    if (user?.role === 'VENDOR' && pet.vendorId !== user.id) {
      return NextResponse.json({ error: 'Vendor unauthorized to access this pet' }, { status: 403 });
    }

    if (user?.role === 'SALES' && pet.status !== 'AVAILABLE') {
      return NextResponse.json({ error: 'Sales team can only access available inventory' }, { status: 403 });
    }

    const ageInfo = calculateAge(pet.dob);

    let photos: string[] = [];
    let videos: string[] = [];
    let fatherDocs: string[] = [];
    let motherDocs: string[] = [];
    let kciDocuments: string[] = [];
    try { photos = JSON.parse(pet.photos || '[]'); } catch (e) {}
    try { videos = JSON.parse(pet.videos || '[]'); } catch (e) {}
    try { fatherDocs = JSON.parse(pet.fatherDocs || '[]'); } catch (e) {}
    try { motherDocs = JSON.parse(pet.motherDocs || '[]'); } catch (e) {}
    try { kciDocuments = JSON.parse(pet.kciDocuments || '[]'); } catch (e) {}

    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    const proto = req.headers.get('x-forwarded-proto') || 'https';
    const clientBase = req.nextUrl?.searchParams?.get('baseUrl');
    const baseUrl = clientBase || (host ? `${proto}://${host}` : undefined);
    const { qrCodeUrl, verificationUrl } = await generatePetQr(pet.petId, baseUrl);

    // Public / Customer / Sales verified view
    if (!user || user.role === 'CUSTOMER' || user.role === 'SALES') {
      return NextResponse.json({
        success: true,
        data: {
          id: pet.id,
          petId: pet.petId,
          category: pet.category,
          breed: pet.breed,
          dob: pet.dob,
          age: ageInfo.formatted,
          sex: pet.sex,
          colour: pet.colour,
          microchipNumber: pet.microchipNumber,
          otherDetails: pet.otherDetails,
          photos,
          videos,
          fatherName: pet.fatherName,
          fatherPhoto: pet.fatherPhoto,
          fatherVideo: pet.fatherVideo,
          fatherDocs: user?.role === 'SALES' ? [] : fatherDocs,
          motherName: pet.motherName,
          motherPhoto: pet.motherPhoto,
          motherVideo: pet.motherVideo,
          motherDocs: user?.role === 'SALES' ? [] : motherDocs,
          kciRegistered: pet.kciRegistered,
          kciDocuments: user?.role === 'SALES' ? [] : kciDocuments,
          status: pet.status,
          qrCodeUrl,
          verificationUrl,
          qrVerified: true,
          issuer: 'Furora Pet Health & Provenance Authority',
        },
      });
    }

    // Admin / Vendor full management view
    return NextResponse.json({
      success: true,
      data: {
        ...pet,
        photos,
        videos,
        fatherDocs,
        motherDocs,
        kciDocuments,
        age: ageInfo.formatted,
        qrCodeUrl,
        verificationUrl,
        qrVerified: true,
      },
    });
  } catch (error) {
    return rbacErrorResponse(error);
  }
}

// PUT /api/pets/[id] - Update pet profile or transition status (Admin or Vendor)
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await assertRole(req, ['ADMIN', 'VENDOR']);
    const { id } = params;
    const body = await req.json();

    const existingPet = await prisma.pet.findFirst({
      where: { OR: [{ id }, { petId: id }] },
    });

    if (!existingPet) {
      return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
    }

    // Vendor can only update own pets
    if (user.role === 'VENDOR' && existingPet.vendorId !== user.id) {
      return NextResponse.json({ error: 'Vendor unauthorized to modify this pet' }, { status: 403 });
    }

    const {
      status,
      colour,
      sex,
      dob,
      microchipNumber,
      otherDetails,
      photos,
      videos,
      fatherName,
      fatherPhoto,
      fatherVideo,
      fatherDocs,
      motherName,
      motherPhoto,
      motherVideo,
      motherDocs,
      kciRegistered,
      kciDocuments,
      reason,
      categoryId,
      breedId,
      inventoryOwner,
      vendorId,
    } = body;
    const updateData: any = {};

    if (colour) updateData.colour = colour;
    if (sex) updateData.sex = sex;
    if (dob) updateData.dob = new Date(dob);
    if (microchipNumber !== undefined) updateData.microchipNumber = microchipNumber ? String(microchipNumber).trim().toUpperCase() : null;
    if (otherDetails !== undefined) updateData.otherDetails = otherDetails;
    if (photos !== undefined) updateData.photos = Array.isArray(photos) ? JSON.stringify(photos) : photos;
    if (videos !== undefined) updateData.videos = Array.isArray(videos) ? JSON.stringify(videos) : videos;
    if (fatherName !== undefined) updateData.fatherName = fatherName;
    if (fatherPhoto !== undefined) updateData.fatherPhoto = fatherPhoto;
    if (fatherVideo !== undefined) updateData.fatherVideo = fatherVideo;
    if (fatherDocs !== undefined) updateData.fatherDocs = Array.isArray(fatherDocs) ? JSON.stringify(fatherDocs) : fatherDocs;
    if (motherName !== undefined) updateData.motherName = motherName;
    if (motherPhoto !== undefined) updateData.motherPhoto = motherPhoto;
    if (motherVideo !== undefined) updateData.motherVideo = motherVideo;
    if (motherDocs !== undefined) updateData.motherDocs = Array.isArray(motherDocs) ? JSON.stringify(motherDocs) : motherDocs;
    if (kciRegistered !== undefined) updateData.kciRegistered = Boolean(kciRegistered);
    if (kciDocuments !== undefined) updateData.kciDocuments = Array.isArray(kciDocuments) ? JSON.stringify(kciDocuments) : kciDocuments;

    // Admin can update category, breed, and ownership
    if (user.role === 'ADMIN') {
      if (categoryId) updateData.categoryId = categoryId;
      if (breedId) updateData.breedId = breedId;
      if (inventoryOwner) updateData.inventoryOwner = inventoryOwner;
      if (vendorId !== undefined) updateData.vendorId = vendorId || null;
    }

    // Validate status transition if requested
    if (status && status !== existingPet.status) {
      validatePetTransition(
        existingPet.status as PetStatus,
        status as PetStatus,
        user.role === 'ADMIN'
      );
      updateData.status = status;

      // Log status transition audit
      await logAudit({
        userId: user.id,
        action: 'PET_STATUS_TRANSITION',
        fromState: existingPet.status,
        toState: status,
        metadata: { petId: existingPet.petId, reason: reason || 'Manual transition by operator' },
      });
    }

    if (Object.keys(updateData).some((k) => k !== 'status')) {
      await logAudit({
        userId: user.id,
        action: 'PET_UPDATED',
        fromState: existingPet.status,
        toState: updateData.status || existingPet.status,
        metadata: { petId: existingPet.petId, updatedFields: Object.keys(updateData) },
      });
    }

    const updated = await prisma.pet.update({
      where: { id: existingPet.id },
      data: updateData,
      include: { category: true, breed: true },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    if (error.name === 'InvalidStateTransitionError') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return rbacErrorResponse(error);
  }
}

// DELETE /api/pets/[id] - Admin only: Permanently delete pet profile (with order safety check)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await assertRole(req, ['ADMIN']);
    const { id } = params;

    const existingPet = await prisma.pet.findFirst({
      where: { OR: [{ id }, { petId: id }] },
      include: { order: true, medicalRecords: true },
    });

    if (!existingPet) {
      return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
    }

    if (existingPet.order) {
      return NextResponse.json(
        { error: 'Cannot delete pet because it is linked to an existing order. Mark as UNAVAILABLE instead.' },
        { status: 400 }
      );
    }

    if (existingPet.medicalRecords && existingPet.medicalRecords.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete pet because it has medical records. Mark as UNAVAILABLE instead.' },
        { status: 400 }
      );
    }

    await prisma.pet.delete({ where: { id: existingPet.id } });

    await logAudit({
      userId: user.id,
      action: 'PET_DELETED',
      fromState: existingPet.status,
      toState: null,
      metadata: { petId: existingPet.petId },
    });

    return NextResponse.json({ success: true, message: 'Pet profile deleted successfully' });
  } catch (error) {
    return rbacErrorResponse(error);
  }
}
