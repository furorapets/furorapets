import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { sendVendorApprovalEmail, sendVendorDocumentUpdateEmail } from '@/lib/email';
import { generatePasswordProtectedVendorPdf } from '@/lib/vendor-credential-pdf';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const vendor = await prisma.user.findUnique({
      where: { id },
      include: {
        vendorOrders: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            procurementCost: true,
            pet: {
              select: {
                id: true,
                petId: true,
                breed: { select: { name: true } },
              },
            },
          },
        },
        vendorPets: {
          select: {
            id: true,
            petId: true,
            status: true,
            breed: { select: { name: true } },
            category: { select: { name: true } },
          },
        },
      },
    });

    if (!vendor || vendor.role !== 'VENDOR') {
      return NextResponse.json({ success: false, error: 'Vendor partner not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: vendor });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch vendor' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Only Furora Admins can verify or update vendor status' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { action, onboardingNotes, name, phone, address, kennelRegNumber, assignedCategories } = body;

    const vendor = await prisma.user.findUnique({
      where: { id },
    });

    if (!vendor || vendor.role !== 'VENDOR') {
      return NextResponse.json({ success: false, error: 'Vendor not found' }, { status: 404 });
    }

    let newStatus = vendor.onboardingStatus;
    let updatedNotes = vendor.onboardingNotes;

    // Prepare credentials if approving
    const baseUsername = (vendor.name || name || 'breeder')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    const phoneDigits = (vendor.phone || phone || '').replace(/[^0-9]/g, '');
    const phoneSuffix = phoneDigits.slice(-4) || '2026';
    const candidateUsername = vendor.username || `${baseUsername.slice(0, 14)}_${phoneSuffix}`;
    const randDigits = Math.floor(1000 + Math.random() * 9000);
    const candidateTempPassword = vendor.tempPassword || vendor.password || `Furora@${randDigits}`;

    if (action === 'APPROVE') {
      newStatus = 'APPROVED';
      updatedNotes = onboardingNotes || null;
    } else if (action === 'REQUEST_CHANGES') {
      if (!onboardingNotes || !onboardingNotes.trim()) {
        return NextResponse.json(
          { success: false, error: 'Please provide clear feedback/notes on what documents or details need correction' },
          { status: 400 }
        );
      }
      newStatus = 'CHANGES_REQUESTED';
      updatedNotes = onboardingNotes.trim();
    } else if (action === 'REJECT') {
      newStatus = 'REJECTED';
      updatedNotes = onboardingNotes?.trim() || 'Application does not meet Furora ethical breeder compliance guidelines';
    }

    const assignedCategoriesData =
      assignedCategories !== undefined
        ? Array.isArray(assignedCategories)
          ? JSON.stringify(assignedCategories)
          : String(assignedCategories)
        : undefined;

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(action && ['APPROVE', 'REQUEST_CHANGES', 'REJECT'].includes(action) ? { onboardingStatus: newStatus } : {}),
        ...(action === 'APPROVE'
          ? {
              username: candidateUsername,
              password: candidateTempPassword,
              tempPassword: candidateTempPassword,
            }
          : {}),
        ...(updatedNotes !== undefined ? { onboardingNotes: updatedNotes } : {}),
        ...(name ? { name: name.trim() } : {}),
        ...(phone ? { phone: phone.trim() } : {}),
        ...(address ? { address: address.trim() } : {}),
        ...(kennelRegNumber ? { kennelRegNumber: kennelRegNumber.trim() } : {}),
        ...(assignedCategoriesData !== undefined ? { assignedCategories: assignedCategoriesData } : {}),
      },
    });

    await prisma.auditLog.create({
      data: {
        action: `VENDOR_${action || 'UPDATED'}`,
        userId: currentUser.id,
        metadata: JSON.stringify({
          vendorId: vendor.id,
          vendorName: vendor.name,
          previousStatus: vendor.onboardingStatus,
          newStatus: updated.onboardingStatus,
          notes: updatedNotes,
        }),
      },
    });

    // Send email notification via Hostinger SMTP
    if (action === 'APPROVE') {
      const finalUsername = updated.username || candidateUsername;
      const finalPassword = updated.tempPassword || candidateTempPassword;
      const cleanPhone = (updated.phone || '').replace(/[^0-9]/g, '').slice(-10) || '1234567890';
      const pdfPassword = cleanPhone;

      (async () => {
        try {
          const pdfBuffer = await generatePasswordProtectedVendorPdf({
            vendorName: updated.name,
            email: updated.email,
            phone: updated.phone || cleanPhone,
            kennelRegNumber: updated.kennelRegNumber,
            address: updated.address,
            username: finalUsername,
            tempPassword: finalPassword,
            loginUrl: 'https://breeder.furora.in/vendor',
            pdfPassword,
          });

          await sendVendorApprovalEmail({
            vendorEmail: updated.email,
            vendorName: updated.name,
            phone: updated.phone,
            username: finalUsername,
            tempPassword: finalPassword,
            loginUrl: 'https://breeder.furora.in/vendor',
            attachmentBuffer: pdfBuffer,
            pdfPassword,
          });
          console.log(`[APPROVAL] Dispatched password-protected credentials PDF to ${updated.email}`);
        } catch (err: any) {
          console.error('Failed to dispatch vendor approval email with credential PDF:', err.message);
        }
      })();
    } else if (action === 'REQUEST_CHANGES') {
      sendVendorDocumentUpdateEmail(vendor.email, vendor.name, updatedNotes || '').catch((err) =>
        console.error('Failed to dispatch vendor document update email:', err.message)
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Vendor status updated to ${newStatus}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update vendor' },
      { status: 500 }
    );
  }
}
