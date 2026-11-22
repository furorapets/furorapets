import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { assertRole, rbacErrorResponse } from '@/lib/rbac';
import { getCurrentUser } from '@/lib/auth';
import { createOrder, linkPetToOrder } from '@/lib/order-service';

export const dynamic = 'force-dynamic';

// GET /api/orders - Lists orders with server-side scoping
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const url = new URL(req.url);
    const status = url.searchParams.get('status');

    const where: any = {};

    // Role-based data scoping (PRD §3)
    if (user.role === 'ADMIN') {
      if (status) where.status = status;
    } else if (user.role === 'VENDOR') {
      where.vendorId = user.id;
    } else if (user.role === 'DELIVERY_AGENT') {
      // Scoped strictly to assigned orders
      where.agentId = user.id;
    } else if (user.role === 'CUSTOMER') {
      where.customerId = user.id;
    } else if (user.role === 'SALES') {
      // Sales has no order modification access
      return NextResponse.json({ error: 'Sales team cannot view customer orders' }, { status: 403 });
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        breed: { select: { id: true, name: true } },
        pet: {
          select: {
            id: true,
            petId: true,
            sex: true,
            colour: true,
            status: true,
            photos: true,
            dob: true,
          },
        },
        vendor: { select: { id: true, name: true, email: true } },
        agent: { select: { id: true, name: true, email: true } },
        documents: { select: { id: true, type: true, fileName: true } },
        medicalRecords: { select: { id: true, result: true } },
        deliveryRecord: { select: { id: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: orders });
  } catch (error) {
    return rbacErrorResponse(error);
  }
}

// POST /api/orders - Create new order (Public Customer or Admin)
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const body = await req.json();

    const {
      categoryId,
      breedId,
      productOrPackage,
      customerName,
      customerContact,
      deliveryAddress,
      paymentStatus = 'PAID',
      orderSource = 'WEBSITE',
      adCampaign,
      advancePaid,
      paymentMode = 'FULL_PREPAID',
    } = body;

    if (!categoryId || !breedId || !customerName || !customerContact || !deliveryAddress) {
      return NextResponse.json(
        { error: 'Category, breed, name, contact phone, and delivery address are required' },
        { status: 400 }
      );
    }

    // Determine customer ID (Supports manual order creation for existing or new customer)
    const customerId = body.customerId || user?.id || 'usr_cust_1';

    const order = await createOrder({
      customerId,
      customerName,
      customerContact,
      deliveryAddress,
      categoryId,
      breedId,
      productOrPackage: productOrPackage || 'Standard Pet Delivery Package',
      paymentStatus,
      orderSource,
      adCampaign,
      advancePaid: advancePaid ? Number(advancePaid) : undefined,
      paymentMode,
    });

    let finalOrder: any = order;

    // Optional immediate assignments during manual order entry
    const updateData: any = {};
    if (body.vendorId) {
      updateData.vendorId = body.vendorId;
      updateData.status = 'VENDOR_ASSIGNED';
    }
    if (body.agentId) {
      updateData.agentId = body.agentId;
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.order.update({
        where: { id: order.id },
        data: updateData,
      });
    }

    if (body.petId) {
      finalOrder = await linkPetToOrder(order.id, body.petId, user?.id || customerId);
    }

    // Refetch complete order record with relations
    const completedOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        category: true,
        breed: true,
        pet: true,
        vendor: { select: { id: true, name: true, email: true } },
        agent: { select: { id: true, name: true, email: true } },
        customer: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ success: true, data: completedOrder || finalOrder }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
