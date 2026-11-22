import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { assertRole, rbacErrorResponse } from '@/lib/rbac';
import { getCurrentUser } from '@/lib/auth';
import { generatePetId } from '@/lib/id-generator';

// PUT /api/breeds/[id] - Admin only: edit breed name, activate/deactivate, or adjust quantity
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await assertRole(req, ['ADMIN']);
    const user = await getCurrentUser(req);
    const { id } = params;
    const body = await req.json();
    const { name, active, quantity } = body;

    const currentBreed = await prisma.breed.findUnique({ where: { id } });
    if (!currentBreed) {
      return NextResponse.json({ error: 'Breed not found' }, { status: 404 });
    }

    const data: { name?: string; active?: boolean } = {};
    if (typeof name === 'string' && name.trim()) {
      const trimmedName = name.trim();
      if (trimmedName.toLowerCase() !== currentBreed.name.toLowerCase()) {
        const conflict = await prisma.breed.findUnique({
          where: {
            categoryId_name: {
              categoryId: currentBreed.categoryId,
              name: trimmedName,
            },
          },
        });
        if (conflict) {
          return NextResponse.json(
            { error: 'A breed with this name already exists in this category' },
            { status: 409 }
          );
        }
      }
      data.name = trimmedName;
    }

    if (typeof active === 'boolean') {
      data.active = active;
    }

    const updated = await prisma.breed.update({
      where: { id },
      data,
      include: { category: true },
    });

    // Handle quantity update if provided
    if (quantity !== undefined && quantity !== null) {
      const targetQty = Math.max(0, parseInt(String(quantity), 10) || 0);
      const existingPets = await prisma.pet.findMany({
        where: { breedId: id },
        orderBy: { createdAt: 'desc' },
      });
      const currentQty = existingPets.length;

      if (targetQty > currentQty) {
        const diff = targetQty - currentQty;
        for (let i = 0; i < diff; i++) {
          const petId = await generatePetId();
          await prisma.pet.create({
            data: {
              petId,
              categoryId: updated.categoryId,
              breedId: id,
              dob: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
              sex: i % 2 === 0 ? 'Male' : 'Female',
              colour: 'Standard',
              status: 'AVAILABLE',
              inventoryOwner: 'FURORA',
              createdById: user?.id || 'usr_admin',
            },
          });
        }
      } else if (targetQty < currentQty) {
        const diff = currentQty - targetQty;
        // Safely remove only unassigned AVAILABLE pets
        const availablePets = existingPets.filter((p) => p.status === 'AVAILABLE');
        const toDelete = availablePets.slice(0, diff);
        for (const p of toDelete) {
          await prisma.pet.delete({ where: { id: p.id } });
        }
      }
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return rbacErrorResponse(error);
  }
}

// DELETE /api/breeds/[id] - Admin only
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await assertRole(req, ['ADMIN']);
    const { id } = params;

    // Check if any orders are referencing this breed
    const orderCount = await prisma.order.count({ where: { breedId: id } });
    if (orderCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete breed because it has linked customer orders. Please deactivate it instead.' },
        { status: 400 }
      );
    }

    // Check if any pets of this breed have order or medical history
    const pets = await prisma.pet.findMany({
      where: { breedId: id },
      include: { order: true, medicalRecords: true },
    });

    const hasLinkedPetHistory = pets.some(p => !!p.order || p.medicalRecords.length > 0);
    if (hasLinkedPetHistory) {
      return NextResponse.json(
        { error: 'Cannot delete breed because some pets have order or medical history. Please deactivate it instead.' },
        { status: 400 }
      );
    }

    // Delete unassigned stock pets belonging to this breed
    await prisma.pet.deleteMany({ where: { breedId: id } });

    await prisma.breed.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Breed deleted successfully' });
  } catch (error) {
    return rbacErrorResponse(error);
  }
}
