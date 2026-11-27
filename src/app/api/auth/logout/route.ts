import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const res = NextResponse.json({
    success: true,
    message: 'Logged out successfully',
  });

  // Clear cryptographic session cookie
  res.cookies.set('furora_session', '', {
    path: '/',
    expires: new Date(0),
    maxAge: 0,
    httpOnly: true,
    sameSite: 'lax',
  });

  // Clear client convenience cookies
  res.cookies.set('furora_user_id', '', {
    path: '/',
    expires: new Date(0),
    maxAge: 0,
    sameSite: 'lax',
  });

  res.cookies.set('furora_user_role', '', {
    path: '/',
    expires: new Date(0),
    maxAge: 0,
    sameSite: 'lax',
  });

  return res;
}
