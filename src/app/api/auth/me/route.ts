import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    
    if (!currentUser) {
      return NextResponse.json({
        success: true,
        user: null,
      });
    }

    return NextResponse.json({
      success: true,
      user: currentUser,
    });
  } catch (error: any) {
    console.error('Auth /me error:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || 'Authentication lookup failed',
      user: null,
    }, { status: 500 });
  }
}
