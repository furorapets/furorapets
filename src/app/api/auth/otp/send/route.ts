import { NextRequest, NextResponse } from 'next/server';
import { verifyCaptcha } from '@/lib/captcha';
import { generateOtp, sendOtpEmail } from '@/lib/otp';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, kennelName, captchaToken, captchaInput } = body;

    // 1. Basic validation
    if (!email || !email.trim() || !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid contact email address.' },
        { status: 400 }
      );
    }

    // 2. Captcha verification
    if (!captchaToken || !captchaInput) {
      return NextResponse.json(
        { success: false, error: 'Please enter the verification captcha.' },
        { status: 400 }
      );
    }

    const captchaCheck = verifyCaptcha(captchaToken, captchaInput);
    if (!captchaCheck.valid) {
      return NextResponse.json(
        { success: false, error: captchaCheck.error || 'Incorrect captcha. Please try again.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // 3. Check if user already exists with an approved status or different role
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser && existingUser.role !== 'VENDOR') {
      return NextResponse.json(
        { success: false, error: 'An account with this email already exists under another role.' },
        { status: 400 }
      );
    }

    if (existingUser && existingUser.onboardingStatus === 'APPROVED') {
      return NextResponse.json(
        {
          success: false,
          isApproved: true,
          error: 'This kennel is already verified and approved! You can log in directly.',
        },
        { status: 400 }
      );
    }

    // 4. Generate 6-digit OTP & signed token
    const { otp, token } = generateOtp(cleanEmail);

    console.log(`[OTP] Generated OTP for ${cleanEmail}: ${otp}`);

    // 5. Send OTP via Hostinger SMTP
    const emailResult = await sendOtpEmail(cleanEmail, kennelName || 'Kennel Partner', otp);
    if (!emailResult.success) {
      console.error('[OTP] Failed to send email via SMTP:', emailResult.error);
      // In development or if SMTP encounters an issue, return the token so user is not blocked
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({
          success: true,
          otpToken: token,
          devOtp: otp, // For local test convenience
          message: `OTP generated (Dev preview: ${otp}). SMTP: ${emailResult.error || 'configured'}`,
        });
      }
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to deliver verification code to this email address. Please ensure the email is correct.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      otpToken: token,
      message: `A 6-digit verification code has been sent to ${cleanEmail}.`,
    });
  } catch (error: any) {
    console.error('[OTP Send Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send verification code.' },
      { status: 500 }
    );
  }
}
