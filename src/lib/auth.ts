import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import prisma from './prisma';
import { Role, SessionUser } from '@/types';

export const DEFAULT_DEMO_USER_ID = 'usr_admin';

/**
 * Resolves the authenticated user from request headers or cookies.
 * Supports:
 * - 'x-furora-user-id' header (for API requests / tests)
 * - 'furora_user_id' cookie (for browser navigation)
 * If unauthenticated, returns null (enforcing strict security).
 */
export async function getCurrentUser(req?: NextRequest): Promise<SessionUser | null> {
  let userId: string | null = null;

  if (req) {
    userId = req.headers.get('x-furora-user-id') || req.headers.get('x-user-id');
    if (!userId) {
      const cookie = req.cookies.get('furora_user_id');
      if (cookie) {
        userId = cookie.value;
      }
    }
  } else {
    // If req is not passed (e.g. in React Server Components), read from next/headers cookies
    try {
      const cookieStore = cookies();
      const cookie = cookieStore.get('furora_user_id');
      if (cookie) {
        userId = cookie.value;
      }
    } catch {
      // Outside of request scope
    }
  }

  // If no user ID is provided, user is unauthenticated
  if (!userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      address: true,
      assignedHub: true,
      onboardingStatus: true,
      onboardingNotes: true,
      kennelRegNumber: true,
      assignedCategories: true,
    },
  });

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as Role,
    phone: user.phone,
    address: user.address,
    assignedHub: user.assignedHub,
    onboardingStatus: user.onboardingStatus,
    onboardingNotes: user.onboardingNotes,
    kennelRegNumber: user.kennelRegNumber,
    assignedCategories: user.assignedCategories,
  };
}

/**
 * Returns all available demo users to power the persona switcher in the UI header.
 */
export async function getAvailableUsers(): Promise<SessionUser[]> {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      address: true,
      assignedHub: true,
      onboardingStatus: true,
      onboardingNotes: true,
      kennelRegNumber: true,
      assignedCategories: true,
    },
    orderBy: { role: 'asc' },
  });
  return users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role as Role,
    phone: u.phone,
    address: u.address,
    assignedHub: u.assignedHub,
    onboardingStatus: u.onboardingStatus,
    onboardingNotes: u.onboardingNotes,
    kennelRegNumber: u.kennelRegNumber,
    assignedCategories: u.assignedCategories,
  }));
}
