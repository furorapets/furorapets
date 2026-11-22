import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { assertRole, rbacErrorResponse } from '@/lib/rbac';
import { linkPetToOrder } from '@/lib/order-service';
import { logAudit } from '@/lib/audit';

// POST /api/orders/[id]/vendor-response - Vendor Accept or Reject assigned order
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const vendor = await assertRole(req, ['VENDOR']);
    const { id } = params;
    const body = await req.json();
    const { action, petId, rejectionReason } = body;

    if (!['ACCEPT', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: "Action must be 'ACCEPT' or 'REJECT'" }, { status: 400 });
    }

    const order = await prisma.order.findFirst({
      where: { OR: [{ id }, { orderId: id }] },
      include: { category: true, breed: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Role & Ownership check (PRD §3)
    if (order.vendorId !== vendor.id) {
      return NextResponse.json(
        { error: 'Vendor unauthorized: This order is not assigned to your facility' },
        { status: 403 }
      );
    }

    if (order.status !== 'VENDOR_ASSIGNED') {
      return NextResponse.json(
        { error: `Cannot respond to order in status '${order.status}'. Must be 'VENDOR_ASSIGNED'` },
        { status: 400 }
      );
    }

    // REJECT FLOW
    if (action === 'REJECT') {
      const updated = await prisma.order.update({
        where: { id: order.id },
        data: { status: 'VENDOR_REJECTED' },
      });

      await logAudit({
        orderId: order.id,
        userId: vendor.id,
        action: 'VENDOR_REJECTED',
        fromState: 'VENDOR_ASSIGNED',
        toState: 'VENDOR_REJECTED',
        metadata: {
          vendorId: vendor.id,
          reason: rejectionReason || 'Vendor declined assignment',
        },
      });

      return NextResponse.json({ success: true, data: updated });
    }

    // ACCEPT FLOW
    if (action === 'ACCEPT') {
      if (!petId) {
        return NextResponse.json(
          { error: 'A valid Pet ID from your inventory is required when accepting an order' },
          { status: 400 }
        );
      }

      // Verify pet belongs to this vendor and matches criteria
      const pet = await prisma.pet.findFirst({
        where: { OR: [{ id: petId }, { petId }] },
      });

      if (!pet) {
        return NextResponse.json({ error: 'Selected pet not found' }, { status: 404 });
      }

      if (pet.vendorId !== vendor.id) {
        return NextResponse.json(
          { error: 'Security violation: Selected pet does not belong to your vendor inventory' },
          { status: 403 }
        );
      }

      if (pet.status !== 'AVAILABLE') {
        return NextResponse.json(
          { error: `Pet ${pet.petId} is currently '${pet.status}' and not available for assignment` },
          { status: 400 }
        );
      }

      if (pet.categoryId !== order.categoryId || pet.breedId !== order.breedId) {
        return NextResponse.json(
          { error: 'Selected pet category or breed does not match the customer order' },
          { status: 400 }
        );
      }

      // Establish permanent link and transition to PET_ASSIGNED
      const updatedOrder = await linkPetToOrder(order.id, pet.id, vendor.id);

      // Register Kennel Origin Documents if provided
      const docsToCreate = [];
      if (body.vaccinationCardUrl) {
        docsToCreate.push({
          petId: pet.id,
          orderId: order.id,
          type: 'KENNEL_VACCINATION_CARD',
          visibility: 'CUSTOMER_VISIBLE',
          fileName: 'Breeder Puppy Vaccination Card.pdf',
          fileUrl: body.vaccinationCardUrl,
          uploadedById: vendor.id,
        });
      }
      if (body.dewormingRecordUrl) {
        docsToCreate.push({
          petId: pet.id,
          orderId: order.id,
          type: 'KENNEL_DEWORMING_RECORD',
          visibility: 'CUSTOMER_VISIBLE',
          fileName: 'Breeder Deworming Schedule.pdf',
          fileUrl: body.dewormingRecordUrl,
          uploadedById: vendor.id,
        });
      }
      if (body.kciPedigreeUrl) {
        docsToCreate.push({
          petId: pet.id,
          orderId: order.id,
          type: 'KENNEL_KCI_PEDIGREE',
          visibility: 'CUSTOMER_VISIBLE',
          fileName: 'Kennel Club Pedigree Certificate.pdf',
          fileUrl: body.kciPedigreeUrl,
          uploadedById: vendor.id,
        });
      }

      for (const doc of docsToCreate) {
        await prisma.document.create({ data: doc });
      }

      return NextResponse.json({ success: true, data: updatedOrder });
    }
  } catch (error) {
    return rbacErrorResponse(error);
  }
}
