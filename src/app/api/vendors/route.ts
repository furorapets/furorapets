import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const search = searchParams.get('q');

    const where: any = {
      role: 'VENDOR',
    };

    if (status && status !== 'ALL') {
      where.onboardingStatus = status;
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q } },
        { email: { contains: q } },
        { phone: { contains: q } },
        { address: { contains: q } },
        { kennelRegNumber: { contains: q } },
      ];
    }

    const vendors = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            vendorOrders: true,
            vendorPets: true,
            petsCreated: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: vendors,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch vendors' },
      { status: 500 }
    );
  }
}

// POST /api/vendors - Direct Admin Onboarding of Vendor
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Only Furora Admins can onboard vendor partners directly' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      name,
      email,
      phone,
      address,
      kennelRegNumber,
      kennelRegDoc,
      govIdDoc,
      tradeLicenseDoc,
      vetAffiliationDoc,
      bankDetailsDoc,
      onboardingStatus = 'APPROVED',
      onboardingNotes,
      assignedCategories = [],
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Kennel / Breeder name is required' }, { status: 400 });
    }
    if (!email || !email.trim()) {
      return NextResponse.json({ success: false, error: 'Email address is required' }, { status: 400 });
    }
    if (!kennelRegNumber || !kennelRegNumber.trim()) {
      return NextResponse.json({ success: false, error: 'Kennel Club / AWBI registration number is required' }, { status: 400 });
    }
    if (!kennelRegDoc || !govIdDoc || !tradeLicenseDoc || !vetAffiliationDoc || !bankDetailsDoc) {
      return NextResponse.json({ success: false, error: 'All 5 compliance documents are mandatory before vendor onboarding' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: `An account with email ${email} already exists.` },
        { status: 400 }
      );
    }

    const customId = `usr_vendor_${Date.now().toString(36)}`;
    const newVendor = await prisma.user.create({
      data: {
        id: customId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: 'VENDOR',
        phone: phone ? phone.trim() : null,
        address: address ? address.trim() : null,
        kennelRegNumber: kennelRegNumber.trim(),
        kennelRegDoc: kennelRegDoc.trim(),
        govIdDoc: govIdDoc.trim(),
        tradeLicenseDoc: tradeLicenseDoc.trim(),
        vetAffiliationDoc: vetAffiliationDoc.trim(),
        bankDetailsDoc: bankDetailsDoc.trim(),
        onboardingStatus,
        onboardingNotes: onboardingNotes || null,
        assignedCategories: Array.isArray(assignedCategories) ? JSON.stringify(assignedCategories) : String(assignedCategories || '[]'),
      },
    });

    // Insert 5 compliance documents into Document table with ADMIN_ONLY visibility
    const docsToInsert = [
      { type: 'KENNEL_REGISTRATION_CERTIFICATE', fileName: `Kennel-Reg-${name.trim()}.pdf`, fileUrl: kennelRegDoc },
      { type: 'BREEDER_GOVT_ID', fileName: `Govt-ID-${name.trim()}.pdf`, fileUrl: govIdDoc },
      { type: 'BREEDER_TRADE_LICENSE', fileName: `Trade-License-${name.trim()}.pdf`, fileUrl: tradeLicenseDoc },
      { type: 'VET_AFFILIATION_MOU', fileName: `Vet-Affiliation-${name.trim()}.pdf`, fileUrl: vetAffiliationDoc },
      { type: 'BANK_ACCOUNT_PROOF', fileName: `Bank-Proof-${name.trim()}.pdf`, fileUrl: bankDetailsDoc },
    ];

    for (const d of docsToInsert) {
      await prisma.document.create({
        data: {
          type: d.type,
          visibility: 'ADMIN_ONLY',
          fileName: d.fileName,
          fileUrl: d.fileUrl,
          uploadedById: currentUser.id,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        action: 'VENDOR_ONBOARDED_ADMIN',
        userId: currentUser.id,
        metadata: JSON.stringify({
          vendorId: newVendor.id,
          name: newVendor.name,
          kennelRegNumber: newVendor.kennelRegNumber,
          onboardingStatus: newVendor.onboardingStatus,
        }),
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: newVendor,
        message: `Vendor ${newVendor.name} successfully onboarded.`,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to onboard vendor' },
      { status: 500 }
    );
  }
}
