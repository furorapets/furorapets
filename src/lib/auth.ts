import { NextRequest } from 'next/server';
import prisma from './prisma';
import { Role, SessionUser } from '@/types';

export const DEFAULT_DEMO_USER_ID = 'usr_admin';

/**
 * Resolves the authenticated user from request headers or cookies.
 * Supports:
 * - 'x-furora-user-id' header (great for tests & API requests)
 * - 'furora_user_id' cookie (for browser navigation)
 * Fallback in dev/test: Admin user
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
  }

  if (!userId) {
    userId = DEFAULT_DEMO_USER_ID;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
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
    onboardingStatus: u.onboardingStatus,
    onboardingNotes: u.onboardingNotes,
    kennelRegNumber: u.kennelRegNumber,
    assignedCategories: u.assignedCategories,
  }));
}
