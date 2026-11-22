import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { assertRole, rbacErrorResponse } from '@/lib/rbac';

// PUT /api/categories/[id] - Admin only update category
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await assertRole(req, ['ADMIN']);
    const { id } = params;
    const body = await req.json();
    const { name, active } = body;

    const existingCategory = await prisma.category.findUnique({ where: { id } });
    if (!existingCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const data: { name?: string; active?: boolean } = {};
    if (typeof name === 'string' && name.trim()) {
      const trimmedName = name.trim();
      if (trimmedName.toLowerCase() !== existingCategory.name.toLowerCase()) {
        const nameConflict = await prisma.category.findUnique({
          where: { name: trimmedName },
        });
        if (nameConflict) {
          return NextResponse.json(
            { error: 'A category with this name already exists' },
            { status: 409 }
          );
        }
      }
      data.name = trimmedName;
    }

    if (typeof active === 'boolean') {
      data.active = active;
    }

    const updated = await prisma.category.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return rbacErrorResponse(error);
  }
}

// DELETE /api/categories/[id] - Admin only delete category
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await assertRole(req, ['ADMIN']);
    const { id } = params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        breeds: true,
        orders: true,
        pets: {
          include: { order: true, medicalRecords: true },
        },
      },
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Protect historical order references
    if (category.orders.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category because it has linked customer orders. You can deactivate it instead.' },
        { status: 400 }
      );
    }

    // Protect pets with customer history
    const hasHistory = category.pets.some(p => !!p.order || p.medicalRecords.length > 0);
    if (hasHistory) {
      return NextResponse.json(
        { error: 'Cannot delete category because some pets have order or medical history. You can deactivate it instead.' },
        { status: 400 }
      );
    }

    // Cleanly delete unassigned pets in this category
    await prisma.pet.deleteMany({ where: { categoryId: id } });

    // Delete breeds in this category
    await prisma.breed.deleteMany({ where: { categoryId: id } });

    // Delete category
    await prisma.category.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    return rbacErrorResponse(error);
  }
}
