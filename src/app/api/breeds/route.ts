import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { assertRole, rbacErrorResponse } from '@/lib/rbac';
import { getCurrentUser } from '@/lib/auth';
import { generatePetId } from '@/lib/id-generator';

export const dynamic = 'force-dynamic';

// GET /api/breeds?categoryId=...&activeOnly=...
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const isAdmin = user?.role === 'ADMIN';

    const url = new URL(req.url);
    const categoryId = url.searchParams.get('categoryId');
    const activeOnly = url.searchParams.get('activeOnly') === 'true' || !isAdmin;

    const where: any = {};
    if (categoryId) {
      where.categoryId = categoryId;
    }
    if (activeOnly) {
      where.active = true;
    }

    const breeds = await prisma.breed.findMany({
      where,
      include: {
        category: {
          select: { id: true, name: true, active: true },
        },
      },
      orderBy: [{ categoryId: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json({ success: true, data: breeds });
  } catch (error) {
    return rbacErrorResponse(error);
  }
}

// POST /api/breeds - Admin only: Add breed under a category
export async function POST(req: NextRequest) {
  try {
    await assertRole(req, ['ADMIN']);
    const body = await req.json();
    const { categoryId, name, active = true, quantity = 0 } = body;

    if (!categoryId || !name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Both categoryId and breed name are required' },
        { status: 400 }
      );
    }

    // Verify category exists
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      return NextResponse.json({ error: 'Referenced category not found' }, { status: 404 });
    }

    // Verify uniqueness under category
    const existing = await prisma.breed.findUnique({
      where: {
        categoryId_name: {
          categoryId,
          name: name.trim(),
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A breed with this name already exists under this category' },
        { status: 409 }
      );
    }

    const breed = await prisma.breed.create({
      data: {
        categoryId,
        name: name.trim(),
        active: Boolean(active),
      },
      include: {
        category: true,
      },
    });

    const qty = parseInt(String(quantity), 10) || 0;
    if (qty > 0) {
      const user = await getCurrentUser(req);
      for (let i = 0; i < qty; i++) {
        const petId = await generatePetId();
        await prisma.pet.create({
          data: {
            petId,
            categoryId,
            breedId: breed.id,
            dob: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
            sex: i % 2 === 0 ? 'Male' : 'Female',
            colour: 'Standard',
            status: 'AVAILABLE',
            inventoryOwner: 'FURORA',
            createdById: user?.id || 'usr_admin',
          },
        });
      }
    }

    return NextResponse.json({ success: true, data: breed }, { status: 201 });
  } catch (error) {
    return rbacErrorResponse(error);
  }
}
