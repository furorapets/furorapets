import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, getAvailableUsers } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const currentUser = await getCurrentUser(req);
  const availableUsers = await getAvailableUsers();

  return NextResponse.json({
    success: true,
    user: currentUser,
    availableUsers,
  });
}
