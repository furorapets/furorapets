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

  // Always return all available demo personas so testers can switch between Admin, Vendor, Delivery Agent, and Sales
  const availableUsers = await getAvailableUsers();

  return NextResponse.json({
    success: true,
    user: currentUser,
    availableUsers,
  });
}
