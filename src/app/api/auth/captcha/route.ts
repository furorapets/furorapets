import { NextResponse } from 'next/server';
import { generateCaptcha } from '@/lib/captcha';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const captcha = generateCaptcha();
    return NextResponse.json({
      success: true,
      svg: captcha.svg,
      token: captcha.token,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Failed to generate captcha' },
      { status: 500 }
    );
  }
}
