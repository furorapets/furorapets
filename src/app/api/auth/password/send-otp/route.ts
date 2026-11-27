import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { generateOtp, sendPasswordChangeOtpEmail } from '@/lib/otp';
import { checkOtpRateLimit } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getCurrentUser(req);
    let targetEmail: string | undefined = undefined;
    let targetUser: any = null;

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Body may be empty if logged in user just triggers OTP
    }

    if (body.email && typeof body.email === 'string' && body.email.trim()) {
      targetEmail = body.email.trim().toLowerCase();
      targetUser = await prisma.user.findUnique({
        where: { email: targetEmail },
      });
    } else if (sessionUser && sessionUser.email) {
      targetEmail = sessionUser.email.toLowerCase();
      targetUser = await prisma.user.findUnique({
        where: { id: sessionUser.id },
      });
    }

    if (!targetUser || !targetEmail) {
      return NextResponse.json(
        { success: false, error: 'Could not resolve an active account with this email address.' },
        { status: 404 }
      );
    }

    // Rate limiting: max 3 OTP requests per 10 minutes per target
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rateLimitKey = `${targetEmail}:${ip}`;
    const rateLimit = checkOtpRateLimit(rateLimitKey);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many OTP requests. Please wait ${rateLimit.retryAfterSeconds} seconds before requesting a new code.`,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfterSeconds),
          },
        }
      );
    }

    // 1. Generate 6-digit OTP scoped for PASSWORD_CHANGE
    const { otp, token } = generateOtp(targetEmail, 'PASSWORD_CHANGE');

    console.log(`[PASSWORD_OTP] Generated OTP for ${targetEmail} (${targetUser.role}): ${otp}`);

    // 2. Send email via Hostinger SMTP
    const emailResult = await sendPasswordChangeOtpEmail(
      targetEmail,
      targetUser.name,
      targetUser.role,
      otp
    );

    // Masked email for display (e.g. g***n@furora.com)
    const [userPart, domainPart] = targetEmail.split('@');
    const maskedUser =
      userPart.length > 2
        ? `${userPart[0]}***${userPart[userPart.length - 1]}`
        : `${userPart[0]}*`;
    const maskedEmail = `${maskedUser}@${domainPart}`;

    if (!emailResult.success) {
      console.error('[PASSWORD_OTP] SMTP dispatch failed:', emailResult.error);
      // If running locally in development or SMTP fails, provide the token and dev preview so testing isn't blocked
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({
          success: true,
          otpToken: token,
          email: targetEmail,
          maskedEmail,
          devOtp: otp,
          message: `Verification code generated (Dev Preview: ${otp}). SMTP error: ${emailResult.error}`,
        });
      }

      return NextResponse.json(
        {
          success: false,
          error: `Failed to deliver verification email to ${maskedEmail}. Please verify your email configuration.`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      otpToken: token,
      email: targetEmail,
      maskedEmail,
      message: `A 6-digit verification code has been sent to ${maskedEmail}.`,
      ...(process.env.NODE_ENV === 'development' ? { devOtp: otp } : {}),
    });
  } catch (error: any) {
    console.error('[PASSWORD_OTP_ERROR]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to dispatch password change verification code.' },
      { status: 500 }
    );
  }
}
