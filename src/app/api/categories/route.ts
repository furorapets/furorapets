import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { assertRole, rbacErrorResponse } from '@/lib/rbac';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/categories - Lists categories with active breed counts
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const isAdmin = user?.role === 'ADMIN';

    // Non-admins only see active categories
    const categories = await prisma.category.findMany({
      where: isAdmin ? undefined : { active: true },
      include: {
        breeds: {
          where: isAdmin ? undefined : { active: true },
          select: {
            id: true,
            name: true,
            active: true,
            _count: {
              select: { pets: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, data: categories });
  } catch (error) {
    return rbacErrorResponse(error);
  }
}

// POST /api/categories - Admin only creation of category
export async function POST(req: NextRequest) {
  try {
    await assertRole(req, ['ADMIN']);
    const body = await req.json();
    const { name, active = true } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Valid category name is required' }, { status: 400 });
    }

    const existing = await prisma.category.findUnique({
      where: { name: name.trim() },
    });

    if (existing) {
      return NextResponse.json({ error: 'Category with this name already exists' }, { status: 409 });
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        active: Boolean(active),
      },
    });

    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (error) {
    return rbacErrorResponse(error);
  }
}
