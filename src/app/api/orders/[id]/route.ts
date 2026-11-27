import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { assertRole, rbacErrorResponse } from '@/lib/rbac';
import { getCurrentUser } from '@/lib/auth';
import { linkPetToOrder } from '@/lib/order-service';
import { validateOrderTransition, validatePetTransition } from '@/lib/state-machine';
import { logAudit } from '@/lib/audit';
import { OrderStatus, PetStatus } from '@/types';

// GET /api/orders/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = params;

    const order = await prisma.order.findFirst({
      where: { OR: [{ id }, { orderId: id }] },
      include: {
        category: true,
        breed: true,
        pet: true,
        vendor: { select: { id: true, name: true, email: true, phone: true, address: true, mapUrl: true, secondaryAddress: true, secondaryMapUrl: true } },
        agent: { select: { id: true, name: true, email: true, phone: true } },
        inspections: true,
        medicalRecords: true,
        deliveryRecord: true,
        certificate: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Role-based authorization guard (PRD §3)
    if (user.role === 'VENDOR' && order.vendorId !== user.id) {
      return NextResponse.json({ error: 'Vendor unauthorized to view unassigned order' }, { status: 403 });
    }
    if (user.role === 'DELIVERY_AGENT' && order.agentId !== user.id) {
      return NextResponse.json({ error: 'Delivery agent unauthorized to view unassigned order' }, { status: 403 });
    }
    if (user.role === 'CUSTOMER' && order.customerId !== user.id) {
      return NextResponse.json({ error: 'Customer unauthorized to view other orders' }, { status: 403 });
    }
    if (user.role === 'SALES') {
      return NextResponse.json({ error: 'Sales team cannot view order processing' }, { status: 403 });
    }

    if (user.role === 'VENDOR') {
      const isPastKennelPickup = [
        'PICKUP_ACCEPTED',
        'MEDICAL_CHECK',
        'MEDICAL_APPROVED',
        'READY_FOR_DELIVERY',
        'DELIVERY_COMPLETED',
      ].includes(order.status);

      const sanitizedOrder = {
        ...order,
        customerName: 'Furora Direct Client',
        customerContact: 'Furora Escrow Protected',
        deliveryAddress: 'Furora Partner Logistics Hub',
        deliveryRecord: null,
        deliveryDriverLat: null,
        deliveryDriverLng: null,
        estimatedDeliveryTime: null,
        status: isPastKennelPickup ? 'HANDED_OVER' : order.status,
        rawStatus: order.status,
        vendorLifecycleStatus: isPastKennelPickup ? 'HANDED_OVER' : order.status,
      };
      return NextResponse.json({ success: true, data: sanitizedOrder });
    }

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    return rbacErrorResponse(error);
  }
}

// PUT /api/orders/[id] - Transition order status or assign vendor/agent/pet
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const { status, vendorId, agentId, petId, isMedicalReassignment, vetClinicName, vetDoctorName } = body;

    const existingOrder = await prisma.order.findFirst({
      where: { OR: [{ id }, { orderId: id }] },
      include: { pet: true },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // 1. Pet Linking request (delegates to permanent linking service)
    if (petId) {
      const updated = await linkPetToOrder(
        existingOrder.id,
        petId,
        user.id,
        Boolean(isMedicalReassignment)
      );
      return NextResponse.json({ success: true, data: updated });
    }

    // 2. Status Transition or Assignment
    const updateData: any = {};

    // Vendor assignment (Admin only)
    if (vendorId !== undefined) {
      if (user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Only Admin can assign vendor to order' }, { status: 403 });
      }
      updateData.vendorId = vendorId;
      if (existingOrder.status === 'ORDER_RECEIVED' || existingOrder.status === 'VENDOR_REJECTED') {
        updateData.status = 'VENDOR_ASSIGNED';
      }
    }

    // Quoted Vendor Procurement Price (Admin only)
    if (body.procurementCost !== undefined) {
      if (user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Only Admin can set quoted vendor price' }, { status: 403 });
      }
      updateData.procurementCost = body.procurementCost ? Number(body.procurementCost) : null;
      if (!existingOrder.vendorPayoutStatus || existingOrder.vendorPayoutStatus === 'UNASSIGNED') {
        updateData.vendorPayoutStatus = 'PENDING_PICKUP';
      }
    }

    // Vendor Payout Settlement (Admin only)
    if (body.vendorPayoutStatus !== undefined) {
      if (user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Only Admin can settle vendor payouts' }, { status: 403 });
      }
      updateData.vendorPayoutStatus = body.vendorPayoutStatus;
      if (body.vendorPayoutRef !== undefined) {
        updateData.vendorPayoutRef = body.vendorPayoutRef;
      }
    }

    // Delivery Agent assignment (Admin only)
    if (agentId !== undefined) {
      if (user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Only Admin can assign delivery agent' }, { status: 403 });
      }
      updateData.agentId = agentId;
      if (existingOrder.status === 'PET_ASSIGNED') {
        updateData.status = 'PICKUP_ASSIGNED';
        // Also update pet to PICKUP_PENDING
        if (existingOrder.petId) {
          await prisma.pet.update({
            where: { id: existingOrder.petId },
            data: { status: 'PICKUP_PENDING' },
          });
        }
      }
    }

    // Vet Clinic & Doctor Assignment (Admin only)
    if (vetClinicName !== undefined || vetDoctorName !== undefined) {
      if (user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Only Admin can assign vet clinic details' }, { status: 403 });
      }
      if (vetClinicName !== undefined) {
        updateData.vetClinicName = typeof vetClinicName === 'string' ? vetClinicName.trim() || null : vetClinicName;
      }
      if (vetDoctorName !== undefined) {
        updateData.vetDoctorName = typeof vetDoctorName === 'string' ? vetDoctorName.trim() || null : vetDoctorName;
      }
    }

    // Direct status change
    if (status && status !== existingOrder.status) {
      // Role permission check: Delivery Agent can transition status on their assigned order
      if (user.role === 'DELIVERY_AGENT') {
        if (existingOrder.agentId !== user.id) {
          return NextResponse.json({ error: 'Delivery agent unauthorized for this order' }, { status: 403 });
        }
      } else if (user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized to change order status' }, { status: 403 });
      }

      // Validate transition
      validateOrderTransition(
        existingOrder.status as OrderStatus,
        status as OrderStatus,
        user.role === 'ADMIN'
      );
      updateData.status = status;
    }

    const updated = await prisma.order.update({
      where: { id: existingOrder.id },
      data: updateData,
      include: { pet: true, vendor: true, agent: true },
    });

    // Log audit trail
    await logAudit({
      orderId: existingOrder.id,
      userId: user.id,
      action: 'ORDER_UPDATED',
      fromState: existingOrder.status,
      toState: updated.status,
      metadata: {
        vendorId: updateData.vendorId,
        agentId: updateData.agentId,
        vetClinicName: updateData.vetClinicName,
        vetDoctorName: updateData.vetDoctorName,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    if (error.name === 'OrderPetLinkImmutableError' || error.name === 'InvalidStateTransitionError') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return rbacErrorResponse(error);
  }
}
