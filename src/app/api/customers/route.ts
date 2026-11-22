import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('q');

    const where: any = {
      role: 'CUSTOMER',
    };

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q } },
        { email: { contains: q } },
        { phone: { contains: q } },
        { address: { contains: q } },
      ];
    }

    const customers = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            customerOrders: true,
          },
        },
        customerOrders: {
          orderBy: { createdAt: 'desc' },
          include: {
            category: { select: { id: true, name: true } },
            breed: { select: { id: true, name: true } },
            pet: {
              select: {
                id: true,
                petId: true,
                status: true,
                photos: true,
                sex: true,
                colour: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: customers,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Only Furora Admins can register or manage customer profiles' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, email, phone, address } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Customer name is required' },
        { status: 400 }
      );
    }

    if (!email || !email.trim()) {
      return NextResponse.json(
        { success: false, error: 'Customer email is required' },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: `A user with email ${email} already exists.` },
        { status: 400 }
      );
    }

    const customId = `usr_cust_${Date.now().toString(36)}`;
    const newCustomer = await prisma.user.create({
      data: {
        id: customId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: 'CUSTOMER',
        phone: phone ? phone.trim() : null,
        address: address ? address.trim() : null,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'CREATE_CUSTOMER_ACCOUNT',
        userId: currentUser.id,
        metadata: JSON.stringify({
          customerId: newCustomer.id,
          name: newCustomer.name,
          email: newCustomer.email,
        }),
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: newCustomer,
        message: `Customer ${newCustomer.name} created successfully.`,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create customer' },
      { status: 500 }
    );
  }
}
