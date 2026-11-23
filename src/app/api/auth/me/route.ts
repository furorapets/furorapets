import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, getAvailableUsers } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const currentUser = await getCurrentUser(req);
  
  if (!currentUser) {
    return NextResponse.json({
      success: true,
      user: null,
      availableUsers: [],
    });
  }

  // Only Admin accounts can view all personas for switching / testing
  const availableUsers =
    currentUser.role === 'ADMIN' ? await getAvailableUsers() : [currentUser];

  return NextResponse.json({
    success: true,
    user: currentUser,
    availableUsers,
  });
}
