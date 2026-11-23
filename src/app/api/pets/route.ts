import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { assertRole, rbacErrorResponse } from '@/lib/rbac';
import { getCurrentUser } from '@/lib/auth';
import { generatePetId } from '@/lib/id-generator';
import { calculateAge } from '@/lib/age-calculator';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// GET /api/pets - Lists pets with server-side role scoping
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const role = user?.role;

    const url = new URL(req.url);
    const categoryId = url.searchParams.get('categoryId');
    const breedId = url.searchParams.get('breedId');
    const status = url.searchParams.get('status');
    const inventoryOwner = url.searchParams.get('inventoryOwner');
    const q = url.searchParams.get('q')?.trim();

    const where: any = {};
    if (categoryId) where.categoryId = categoryId;
    if (breedId) where.breedId = breedId;
    if (q) {
      where.OR = [
        { petId: { contains: q } },
        { colour: { contains: q } },
        { fatherName: { contains: q } },
        { motherName: { contains: q } },
      ];
    }

    // Role-based scoping rules (PRD §3)
    if (role === 'VENDOR') {
      // Vendor sees ONLY own inventory
      where.vendorId = user?.id;
    } else if (role === 'SALES') {
      // Sales sees ONLY available pets
      where.status = 'AVAILABLE';
    } else if (role === 'DELIVERY_AGENT') {
      // Delivery agent cannot browse inventory
      return NextResponse.json({ error: 'Delivery agents cannot browse inventory' }, { status: 403 });
    } else if (role === 'CUSTOMER') {
      // Customer sees available inventory
      where.status = 'AVAILABLE';
    }

    if (status) {
      if (role === 'ADMIN' || role === 'VENDOR') {
        where.status = status;
      }
    }
    if (inventoryOwner && role === 'ADMIN') {
      where.inventoryOwner = inventoryOwner;
    }

    const pets = await prisma.pet.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        breed: { select: { id: true, name: true, active: true } },
        vendor: role === 'ADMIN' ? { select: { id: true, name: true, email: true } } : false,
        order: role === 'ADMIN' ? { select: { id: true, orderId: true, status: true, customerName: true } } : false,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Format with dynamic age and strip forbidden fields for Sales/Customers
    const formattedPets = pets.map((p) => {
      const ageInfo = calculateAge(p.dob);

      // Photos & videos parse
      let photos = [];
      let videos = [];
      try {
        photos = JSON.parse(p.photos || '[]');
      } catch (e) {
        photos = [];
      }
      try {
        videos = JSON.parse(p.videos || '[]');
      } catch (e) {
        videos = [];
      }

      if (role === 'SALES' || role === 'CUSTOMER') {
        // Strip private vendor documents, purchase costs, internal IDs
        return {
          id: p.id,
          petId: p.petId,
          category: p.category,
          breed: p.breed,
          dob: p.dob,
          age: ageInfo.formatted,
          sex: p.sex,
          colour: p.colour,
          otherDetails: p.otherDetails,
          photos,
          videos,
          fatherName: p.fatherName,
          fatherPhoto: p.fatherPhoto,
          motherName: p.motherName,
          motherPhoto: p.motherPhoto,
          status: p.status,
          kciRegistered: p.kciRegistered,
          verificationUrl: `/pets/${p.petId}`,
        };
      }

      return {
        ...p,
        photos,
        videos,
        age: ageInfo.formatted,
        verificationUrl: `/pets/${p.petId}`,
      };
    });

    return NextResponse.json({ success: true, data: formattedPets });
  } catch (error) {
    return rbacErrorResponse(error);
  }
}

// POST /api/pets - Create pet profile (Admin or Vendor)
export async function POST(req: NextRequest) {
  try {
    const user = await assertRole(req, ['ADMIN', 'VENDOR']);
    const body = await req.json();

    const {
      categoryId,
      breedId,
      dob,
      sex,
      colour,
      otherDetails,
      photos = [],
      videos = [],
      fatherName,
      fatherPhoto,
      fatherVideo,
      fatherDocs = [],
      motherName,
      motherPhoto,
      motherVideo,
      motherDocs = [],
      kciRegistered = false,
      kciDocuments = [],
      inventoryOwner = 'FURORA',
      vendorId,
    } = body;

    if (!categoryId || !breedId || !dob || !sex || !colour) {
      return NextResponse.json(
        { error: 'Category, breed, DOB, sex, and colour are required fields' },
        { status: 400 }
      );
    }

    // Verify category and breed existence
    const breed = await prisma.breed.findUnique({
      where: { id: breedId },
      include: { category: true },
    });

    if (!breed || breed.categoryId !== categoryId) {
      return NextResponse.json({ error: 'Breed does not belong to specified category' }, { status: 400 });
    }

    // Business rule: Only active breeds can be created/sold
    if (!breed.active) {
      return NextResponse.json(
        { error: 'Cannot add pets to an inactive/deactivated breed' },
        { status: 400 }
      );
    }

    // Auto-generate sequential Pet ID: FUR-PET-######
    const petId = await generatePetId();

    // Determine ownership
    let finalOwner = inventoryOwner;
    let finalVendorId = vendorId || null;

    if (user.role === 'VENDOR') {
      finalOwner = 'VENDOR';
      finalVendorId = user.id;

      // Category assignment enforcement for vendors
      const vendorUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { assignedCategories: true, name: true },
      });

      let assignedIds: string[] = [];
      try {
        if (vendorUser?.assignedCategories) {
          assignedIds = JSON.parse(vendorUser.assignedCategories);
        }
      } catch (e) {
        assignedIds = [];
      }

      if (!assignedIds || assignedIds.length === 0) {
        return NextResponse.json(
          { error: 'No pet categories have been assigned to your kennel yet. Please contact Furora Admin to assign authorized categories.' },
          { status: 403 }
        );
      }

      if (!assignedIds.includes(categoryId)) {
        return NextResponse.json(
          { error: 'You are only authorized to add pets under your assigned categories. Please select an authorized category.' },
          { status: 403 }
        );
      }
    } else if (finalOwner === 'VENDOR' && !finalVendorId) {
      return NextResponse.json(
        { error: 'vendorId is required when inventoryOwner is VENDOR' },
        { status: 400 }
      );
    }

    const newPet = await prisma.pet.create({
      data: {
        petId,
        categoryId,
        breedId,
        dob: new Date(dob),
        sex,
        colour,
        otherDetails: otherDetails || null,
        photos: JSON.stringify(photos),
        videos: JSON.stringify(videos),
        fatherName: fatherName || null,
        fatherPhoto: fatherPhoto || null,
        fatherVideo: fatherVideo || null,
        fatherDocs: JSON.stringify(fatherDocs),
        motherName: motherName || null,
        motherPhoto: motherPhoto || null,
        motherVideo: motherVideo || null,
        motherDocs: JSON.stringify(motherDocs),
        kciRegistered: Boolean(kciRegistered),
        kciDocuments: JSON.stringify(kciDocuments),
        inventoryOwner: finalOwner,
        vendorId: finalVendorId,
        status: 'AVAILABLE',
        createdById: user.id,
      },
      include: {
        category: true,
        breed: true,
      },
    });

    // Audit log
    await logAudit({
      userId: user.id,
      action: 'PET_CREATED',
      fromState: null,
      toState: 'AVAILABLE',
      metadata: { petId, owner: finalOwner, vendorId: finalVendorId },
    });

    return NextResponse.json({ success: true, data: newPet }, { status: 201 });
  } catch (error) {
    return rbacErrorResponse(error);
  }
}
