import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendVendorWelcomeEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

// GET /api/vendor-onboarding?email=...&phone=...
// Allows partner applicants to check their verification status or resume an existing application
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');
    const phone = searchParams.get('phone');

    if (!email && !phone) {
      return NextResponse.json({ success: false, error: 'Email or phone parameter is required' }, { status: 400 });
    }

    const whereClause: any = {};
    if (email && email.trim()) {
      whereClause.email = email.trim().toLowerCase();
    } else if (phone && phone.trim()) {
      whereClause.phone = phone.trim();
    }

    const partner = await prisma.user.findFirst({
      where: {
        ...whereClause,
        role: 'VENDOR',
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        mapUrl: true,
        secondaryAddress: true,
        secondaryMapUrl: true,
        role: true,
        kennelRegNumber: true,
        kennelRegDoc: true,
        govIdDoc: true,
        tradeLicenseDoc: true,
        vetAffiliationDoc: true,
        bankDetailsDoc: true,
        onboardingStatus: true,
        onboardingNotes: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!partner) {
      return NextResponse.json({ success: false, error: 'No partner account found for these details' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: partner });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to check status' },
      { status: 500 }
    );
  }
}

// POST /api/vendor-onboarding
// 1. Initial quick registration with mobile & email
// 2. Full compliance submission & re-submission
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      action = 'SUBMIT_APPLICATION',
      name,
      email,
      phone,
      address,
      city,
      mapUrl,
      secondaryAddress,
      secondaryMapUrl,
      kennelRegNumber,
      kennelRegDoc,
      govIdDoc,
      tradeLicenseDoc,
      vetAffiliationDoc,
      bankDetailsDoc,
    } = body;

    if (!email || !email.trim()) {
      return NextResponse.json({ success: false, error: 'Contact email address is required' }, { status: 400 });
    }
    if (!phone || !phone.trim()) {
      return NextResponse.json({ success: false, error: 'Contact phone number is required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();
    const formattedAddress = city ? `${address || ''}, ${city}`.replace(/^,\s*/, '') : (address || '').trim();

    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    // --- CASE A: QUICK REGISTRATION (Step 1 on Landing Page) ---
    if (action === 'QUICK_REGISTER') {
      if (!name || !name.trim()) {
        return NextResponse.json({ success: false, error: 'Kennel / Breeder name is required' }, { status: 400 });
      }

      if (existing) {
        if (existing.role !== 'VENDOR') {
          return NextResponse.json(
            { success: false, error: 'An account with this email already exists under another role.' },
            { status: 400 }
          );
        }

        if (existing.onboardingStatus === 'APPROVED') {
          return NextResponse.json({
            success: true,
            isApproved: true,
            data: existing,
            message: 'Your kennel is already approved! You can log in directly to your vendor dashboard.',
          });
        }

        // Return existing partner to resume filling details
        return NextResponse.json({
          success: true,
          isExisting: true,
          data: existing,
          message: 'Welcome back! Please continue filling your kennel onboarding details.',
        });
      }

      // Create new draft partner user
      const customId = `usr_partner_${Date.now().toString(36)}`;
      const newPartner = await prisma.user.create({
        data: {
          id: customId,
          name: name.trim(),
          email: cleanEmail,
          phone: cleanPhone,
          address: formattedAddress || null,
          mapUrl: mapUrl ? mapUrl.trim() : null,
          secondaryAddress: secondaryAddress ? secondaryAddress.trim() : null,
          secondaryMapUrl: secondaryMapUrl ? secondaryMapUrl.trim() : null,
          role: 'VENDOR',
          onboardingStatus: 'DRAFT',
          onboardingNotes: null,
        },
      });

      await prisma.auditLog.create({
        data: {
          action: 'PARTNER_QUICK_REGISTERED',
          userId: newPartner.id,
          metadata: JSON.stringify({
            vendorId: newPartner.id,
            name: newPartner.name,
            email: newPartner.email,
            phone: newPartner.phone,
          }),
        },
      });

      // Send Welcome Email asynchronously
      sendVendorWelcomeEmail(newPartner.email, newPartner.name).catch((err) =>
        console.error('Failed to dispatch welcome email:', err.message)
      );

      return NextResponse.json({
        success: true,
        isNew: true,
        data: newPartner,
        message: 'Account registered successfully! Now please submit your compliance documents to activate your dashboard.',
      });
    }

    // --- CASE B: FULL COMPLIANCE SUBMISSION (Wizard completion) ---
    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Breeder / Facility name is required' }, { status: 400 });
    }
    if (!formattedAddress) {
      return NextResponse.json({ success: false, error: 'Facility location address is required' }, { status: 400 });
    }
    if (!kennelRegNumber || !kennelRegNumber.trim()) {
      return NextResponse.json({ success: false, error: 'Kennel Club / AWBI registration number is required' }, { status: 400 });
    }
    if (!kennelRegDoc || !govIdDoc || !tradeLicenseDoc || !vetAffiliationDoc || !bankDetailsDoc) {
      return NextResponse.json(
        { success: false, error: 'All 5 compliance documents are mandatory to complete partner onboarding' },
        { status: 400 }
      );
    }

    if (existing) {
      if (existing.role !== 'VENDOR') {
        return NextResponse.json(
          { success: false, error: 'An account with this email already exists under another role.' },
          { status: 400 }
        );
      }

      if (existing.onboardingStatus === 'APPROVED') {
        return NextResponse.json(
          {
            success: false,
            error: 'This partner facility is already approved and active. You can log in directly to your vendor dashboard.',
            isApproved: true,
          },
          { status: 400 }
        );
      }

      // Update existing record
      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: name.trim(),
          phone: cleanPhone,
          address: formattedAddress,
          mapUrl: mapUrl ? mapUrl.trim() : (existing.mapUrl || null),
          secondaryAddress: secondaryAddress ? secondaryAddress.trim() : (existing.secondaryAddress || null),
          secondaryMapUrl: secondaryMapUrl ? secondaryMapUrl.trim() : (existing.secondaryMapUrl || null),
          kennelRegNumber: kennelRegNumber.trim(),
          kennelRegDoc: kennelRegDoc.trim(),
          govIdDoc: govIdDoc.trim(),
          tradeLicenseDoc: tradeLicenseDoc.trim(),
          vetAffiliationDoc: vetAffiliationDoc.trim(),
          bankDetailsDoc: bankDetailsDoc.trim(),
          onboardingStatus: 'PENDING', // Ready for admin review
          onboardingNotes: existing.onboardingNotes
            ? `[Re-submitted on ${new Date().toLocaleDateString()}] Previous notes: ${existing.onboardingNotes}`
            : null,
        },
      });

      // Insert new documents into Document table
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
            uploadedById: existing.id,
          },
        });
      }

      await prisma.auditLog.create({
        data: {
          action: 'PARTNER_APPLICATION_SUBMITTED',
          userId: existing.id,
          metadata: JSON.stringify({
            vendorId: updated.id,
            name: updated.name,
            email: updated.email,
          }),
        },
      });

      return NextResponse.json({
        success: true,
        isResubmission: true,
        data: updated,
        message: 'Your compliance documents have been submitted successfully. Furora Admins will verify your application within 24–48 hours.',
      });
    }

    // Direct new full submission (if vendor submitted all in one shot)
    const customId = `usr_partner_${Date.now().toString(36)}`;
    const newPartner = await prisma.user.create({
      data: {
        id: customId,
        name: name.trim(),
        email: cleanEmail,
        role: 'VENDOR',
        phone: cleanPhone,
        address: formattedAddress,
        mapUrl: mapUrl ? mapUrl.trim() : null,
        secondaryAddress: secondaryAddress ? secondaryAddress.trim() : null,
        secondaryMapUrl: secondaryMapUrl ? secondaryMapUrl.trim() : null,
        kennelRegNumber: kennelRegNumber.trim(),
        kennelRegDoc: kennelRegDoc.trim(),
        govIdDoc: govIdDoc.trim(),
        tradeLicenseDoc: tradeLicenseDoc.trim(),
        vetAffiliationDoc: vetAffiliationDoc.trim(),
        bankDetailsDoc: bankDetailsDoc.trim(),
        onboardingStatus: 'PENDING',
        onboardingNotes: null,
      },
    });

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
          uploadedById: newPartner.id,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        action: 'PARTNER_APPLICATION_SUBMITTED',
        userId: newPartner.id,
        metadata: JSON.stringify({
          vendorId: newPartner.id,
          name: newPartner.name,
          email: newPartner.email,
          kennelRegNumber: newPartner.kennelRegNumber,
        }),
      },
    });

    sendVendorWelcomeEmail(newPartner.email, newPartner.name).catch((err) =>
      console.error('Failed to dispatch vendor welcome email:', err.message)
    );

    return NextResponse.json(
      {
        success: true,
        data: newPartner,
        message: 'Partner registration submitted successfully! Our compliance team will review your application within 24–48 hours.',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Vendor onboarding error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to submit partner application' },
      { status: 500 }
    );
  }
}
