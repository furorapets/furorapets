import { NextRequest, NextResponse } from 'next/server';
import { verifyOtp } from '@/lib/otp';
import prisma from '@/lib/prisma';
import { sendVendorWelcomeEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, otp, otpToken, registrationData } = body;

    if (!email || !otp || !otpToken) {
      return NextResponse.json(
        { success: false, error: 'Email, verification code, and token are required.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Verify OTP
    const check = verifyOtp(otpToken, cleanEmail, otp);
    if (!check.valid) {
      return NextResponse.json(
        { success: false, error: check.error || 'Invalid verification code.' },
        { status: 400 }
      );
    }

    // 2. Fetch or create Partner User in Prisma
    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    const kennelName = registrationData?.kennelName || registrationData?.name || 'Verified Kennel';
    const contactName = registrationData?.contactName || '';
    const fullName = contactName.trim()
      ? `${kennelName.trim()} (${contactName.trim()})`
      : kennelName.trim();
    const phone = registrationData?.phone ? registrationData.phone.trim() : null;
    const city = registrationData?.city ? registrationData.city.trim() : '';
    const address = city || registrationData?.address || null;

    let partner = existing;

    if (!partner) {
      const customId = `usr_partner_${Date.now().toString(36)}`;
      partner = await prisma.user.create({
        data: {
          id: customId,
          name: fullName,
          email: cleanEmail,
          phone,
          address,
          role: 'VENDOR',
          onboardingStatus: 'DRAFT',
          onboardingNotes: null,
        },
      });

      // Send welcome email asynchronously
      sendVendorWelcomeEmail(partner.email, partner.name).catch((err) =>
        console.error('Failed to dispatch welcome email:', err.message)
      );
    } else {
      // Update phone/name if not set
      partner = await prisma.user.update({
        where: { id: partner.id },
        data: {
          name: fullName || partner.name,
          phone: phone || partner.phone,
          address: address || partner.address,
        },
      });
    }

    // 3. Log Audit Record
    await prisma.auditLog.create({
      data: {
        action: 'PARTNER_EMAIL_VERIFIED_OTP',
        userId: partner.id,
        metadata: JSON.stringify({
          vendorId: partner.id,
          name: partner.name,
          email: partner.email,
          verifiedAt: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: partner,
      message: 'Email verified successfully! Welcome to Furora onboarding.',
    });
  } catch (error: any) {
    console.error('[OTP Verify Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Verification failed. Please try again.' },
      { status: 500 }
    );
  }
}
