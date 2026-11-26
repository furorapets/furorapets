import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyOtp } from '@/lib/otp';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, otp, otpToken, newPassword, confirmPassword } = body;

    // 1. Basic field checks
    if (!email || !email.trim()) {
      return NextResponse.json(
        { success: false, error: 'Email address is required.' },
        { status: 400 }
      );
    }

    if (!otp || !otp.trim()) {
      return NextResponse.json(
        { success: false, error: 'Please enter the 6-digit verification code.' },
        { status: 400 }
      );
    }

    if (!otpToken || !otpToken.trim()) {
      return NextResponse.json(
        { success: false, error: 'Missing or expired security session token. Please request a new code.' },
        { status: 400 }
      );
    }

    if (!newPassword || newPassword.trim().length < 6) {
      return NextResponse.json(
        { success: false, error: 'New password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'New password and confirmation do not match.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = newPassword.trim();

    // 2. Cryptographic OTP Verification
    const otpCheck = verifyOtp(otpToken, cleanEmail, otp, 'PASSWORD_CHANGE');
    if (!otpCheck.valid) {
      return NextResponse.json(
        { success: false, error: otpCheck.error || 'Invalid or expired verification code.' },
        { status: 400 }
      );
    }

    // 3. User Lookup
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No account found matching this email address.' },
        { status: 404 }
      );
    }

    // 4. Update Password in Database
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: cleanPassword,
        tempPassword: cleanPassword,
      },
    });

    // 5. Audit Logging
    await prisma.auditLog.create({
      data: {
        action: 'USER_PASSWORD_CHANGED_EMAIL_OTP',
        userId: user.id,
        metadata: JSON.stringify({
          userId: user.id,
          email: user.email,
          role: user.role,
          name: user.name,
          changedAt: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Account password changed successfully! Your new password is now active.',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
      },
    });
  } catch (error: any) {
    console.error('[PASSWORD_CHANGE_ERROR]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update account password.' },
      { status: 500 }
    );
  }
}
