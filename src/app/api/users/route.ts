import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');
    const type = searchParams.get('type');
    const excludeRole = searchParams.get('excludeRole');

    const where: any = {};
    if (type === 'staff') {
      where.role = { in: ['ADMIN', 'SALES', 'DELIVERY_AGENT', 'VENDOR'] };
    } else if (role && role !== 'ALL') {
      where.role = role;
    } else if (excludeRole) {
      where.role = { not: excludeRole };
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            agentOrders: true,
            vendorOrders: true,
            petsCreated: true,
            deliveryRecords: true,
            customerOrders: true,
          },
        },
      },
    });

    const currentUser = await getCurrentUser(req);
    const isAdmin = currentUser?.role === 'ADMIN';

    // Strictly protect passwords: only Admin can view staff credentials
    const sanitizedUsers = users.map((u) => {
      if (!isAdmin) {
        const { password, tempPassword, ...rest } = u as any;
        return rest;
      }
      return u;
    });

    return NextResponse.json({
      success: true,
      data: sanitizedUsers,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Only Furora Admins can create staff and agent accounts' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      name,
      email,
      username,
      password,
      assignedHub,
      role,
      phone,
      address,
      kennelRegNumber,
      kennelRegDoc,
      govIdDoc,
      tradeLicenseDoc,
      vetAffiliationDoc,
      bankDetailsDoc,
      onboardingStatus,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Full name is required' },
        { status: 400 }
      );
    }

    if (!email || !email.trim()) {
      return NextResponse.json(
        { success: false, error: 'Email address is required' },
        { status: 400 }
      );
    }

    const validRoles = ['ADMIN', 'SALES', 'DELIVERY_AGENT', 'VENDOR', 'CUSTOMER'];
    if (!role || !validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      );
    }

    // Strict Vendor Onboarding Compliance Validation
    if (role === 'VENDOR') {
      if (!kennelRegNumber || !kennelRegNumber.trim()) {
        return NextResponse.json(
          { success: false, error: 'Kennel Club / AWBI registration number is mandatory before vendor onboarding.' },
          { status: 400 }
        );
      }
      if (!kennelRegDoc || !kennelRegDoc.trim()) {
        return NextResponse.json(
          { success: false, error: 'Kennel registration certificate document is mandatory before onboarding.' },
          { status: 400 }
        );
      }
      if (!govIdDoc || !govIdDoc.trim()) {
        return NextResponse.json(
          { success: false, error: 'Breeder Government ID proof (Aadhaar/PAN) is mandatory before onboarding.' },
          { status: 400 }
        );
      }
      if (!tradeLicenseDoc || !tradeLicenseDoc.trim()) {
        return NextResponse.json(
          { success: false, error: 'Breeder municipal / AWBI trade license document is mandatory before onboarding.' },
          { status: 400 }
        );
      }
      if (!vetAffiliationDoc || !vetAffiliationDoc.trim()) {
        return NextResponse.json(
          { success: false, error: 'Veterinary clinic affiliation certificate is mandatory before onboarding.' },
          { status: 400 }
        );
      }
      if (!bankDetailsDoc || !bankDetailsDoc.trim()) {
        return NextResponse.json(
          { success: false, error: 'Bank account proof / canceled cheque is mandatory before onboarding.' },
          { status: 400 }
        );
      }
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

    // Username validation / generation
    let finalUsername = username ? username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') : null;
    if (finalUsername) {
      const existingUsername = await prisma.user.findUnique({ where: { username: finalUsername } });
      if (existingUsername) {
        return NextResponse.json(
          { success: false, error: `Username "${finalUsername}" is already taken.` },
          { status: 400 }
        );
      }
    } else if (role === 'SALES' || role === 'DELIVERY_AGENT' || role === 'ADMIN') {
      finalUsername = email.trim().split('@')[0].toLowerCase().replace(/[^a-z0-9_-]/g, '');
    }

    // Password for staff accounts (Admin controlled)
    const initialPassword = password && password.trim() ? password.trim() : `Furora@${Math.floor(1000 + Math.random() * 9000)}`;

    // Auto-generate consistent ID prefix based on role
    const prefixMap: Record<string, string> = {
      ADMIN: 'usr_admin_',
      SALES: 'usr_sales_',
      DELIVERY_AGENT: 'usr_agent_',
      VENDOR: 'usr_vendor_',
      CUSTOMER: 'usr_cust_',
    };
    const prefix = prefixMap[role] || 'usr_';
    const customId = `${prefix}${Date.now().toString(36)}`;

    const newUser = await prisma.user.create({
      data: {
        id: customId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        username: finalUsername,
        password: initialPassword,
        tempPassword: initialPassword, // Stored strictly for Admin Credential Vault
        assignedHub: assignedHub ? assignedHub.trim() : null,
        role,
        phone: phone ? phone.trim() : null,
        address: address ? address.trim() : null,
        kennelRegNumber: kennelRegNumber ? kennelRegNumber.trim() : null,
        kennelRegDoc: kennelRegDoc ? kennelRegDoc.trim() : null,
        govIdDoc: govIdDoc ? govIdDoc.trim() : null,
        tradeLicenseDoc: tradeLicenseDoc ? tradeLicenseDoc.trim() : null,
        vetAffiliationDoc: vetAffiliationDoc ? vetAffiliationDoc.trim() : null,
        bankDetailsDoc: bankDetailsDoc ? bankDetailsDoc.trim() : null,
        onboardingStatus: onboardingStatus || 'APPROVED',
      },
    });

    // Automatically record onboarding documents in Document visibility engine (Admin Only)
    if (role === 'VENDOR') {
      const docsToInsert = [
        { type: 'KENNEL_REGISTRATION_CERTIFICATE', fileName: `Kennel-Reg-${name.trim()}.pdf`, fileUrl: kennelRegDoc },
        { type: 'BREEDER_GOVT_ID', fileName: `Govt-ID-${name.trim()}.pdf`, fileUrl: govIdDoc },
        { type: 'BREEDER_TRADE_LICENSE', fileName: `Trade-License-${name.trim()}.pdf`, fileUrl: tradeLicenseDoc },
        { type: 'VET_AFFILIATION_MOU', fileName: `Vet-Affiliation-${name.trim()}.pdf`, fileUrl: vetAffiliationDoc },
        { type: 'BANK_ACCOUNT_PROOF', fileName: `Bank-Proof-${name.trim()}.pdf`, fileUrl: bankDetailsDoc },
      ];

      for (const d of docsToInsert) {
        if (d.fileUrl) {
          await prisma.document.create({
            data: {
              type: d.type,
              visibility: 'ADMIN_ONLY', // Strict backend visibility protection
              fileName: d.fileName,
              fileUrl: d.fileUrl,
              uploadedById: currentUser.id,
            },
          });
        }
      }
    }

    // Record audit log
    await prisma.auditLog.create({
      data: {
        action: 'CREATE_USER_ACCOUNT',
        userId: currentUser.id,
        metadata: JSON.stringify({
          createdUserId: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          phone: newUser.phone,
          address: newUser.address,
        }),
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: newUser,
        message: `Account for ${newUser.name} (${newUser.role}) successfully created.`,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create user account' },
      { status: 500 }
    );
  }
}
