import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { assertRole, rbacErrorResponse } from '@/lib/rbac';
import { logAudit } from '@/lib/audit';

// POST /api/pets/[id]/transfer - Admin only move between Furora and Vendor inventory
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await assertRole(req, ['ADMIN']);
    const { id } = params;
    const body = await req.json();
    const { targetOwner, targetVendorId, reason } = body;

    if (!['FURORA', 'VENDOR'].includes(targetOwner)) {
      return NextResponse.json({ error: "targetOwner must be 'FURORA' or 'VENDOR'" }, { status: 400 });
    }

    if (targetOwner === 'VENDOR' && !targetVendorId) {
      return NextResponse.json({ error: "targetVendorId is required when targetOwner is 'VENDOR'" }, { status: 400 });
    }

    const pet = await prisma.pet.findFirst({
      where: { OR: [{ id }, { petId: id }] },
    });

    if (!pet) {
      return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
    }

    const previousOwner = pet.inventoryOwner;
    const previousVendorId = pet.vendorId;

    const updated = await prisma.pet.update({
      where: { id: pet.id },
      data: {
        inventoryOwner: targetOwner,
        vendorId: targetOwner === 'VENDOR' ? targetVendorId : null,
      },
    });

    // Mandatory Audit Log (PRD §5 Module C, §8 Auditability)
    await logAudit({
      userId: admin.id,
      action: 'INVENTORY_OWNERSHIP_MOVE',
      fromState: `${previousOwner}${previousVendorId ? ` (${previousVendorId})` : ''}`,
      toState: `${targetOwner}${targetVendorId ? ` (${targetVendorId})` : ''}`,
      metadata: {
        petId: pet.petId,
        reason: reason || 'Admin inventory transfer',
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return rbacErrorResponse(error);
  }
}
