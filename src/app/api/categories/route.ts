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

    const { searchParams } = new URL(req.url);
    const vendorId = searchParams.get('vendorId');
    const all = searchParams.get('all') === 'true';

    // Non-admins only see active categories unless all=true
    let categories = await prisma.category.findMany({
      where: isAdmin && all ? undefined : { active: true },
      include: {
        breeds: {
          where: isAdmin && all ? undefined : { active: true },
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

    // Check if filtering for a vendor (either logged-in vendor or explicit ?vendorId parameter)
    const targetVendorId = user?.role === 'VENDOR' ? user.id : vendorId;
    if (targetVendorId && !all) {
      const vendorUser = await prisma.user.findUnique({
        where: { id: targetVendorId },
        select: { assignedCategories: true, role: true },
      });

      if (vendorUser && vendorUser.role === 'VENDOR') {
        let assignedIds: string[] = [];
        try {
          if (vendorUser.assignedCategories) {
            assignedIds = JSON.parse(vendorUser.assignedCategories);
          }
        } catch (e) {
          assignedIds = [];
        }

        // Filter categories strictly to assigned categories for this vendor
        const filtered = categories.filter((c) => assignedIds.includes(c.id));
        return NextResponse.json({
          success: true,
          data: filtered,
          vendorAssignedIds: assignedIds,
          totalAssigned: assignedIds.length,
        });
      }
    }

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
