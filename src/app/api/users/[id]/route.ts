import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            agentOrders: true,
            vendorOrders: true,
            petsCreated: true,
            deliveryRecords: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const currentUser = await getCurrentUser(req);
    const isAdmin = currentUser?.role === 'ADMIN';

    // Protect credentials from non-admin users
    if (!isAdmin) {
      const { password, tempPassword, ...rest } = user as any;
      return NextResponse.json({ success: true, data: rest });
    }

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Only Furora Admins can update staff accounts or reset passwords' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { name, phone, address, role, username, password, assignedHub } = body;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check username uniqueness if changed
    if (username && username.trim().toLowerCase() !== existing.username) {
      const formattedUsername = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
      const taken = await prisma.user.findUnique({ where: { username: formattedUsername } });
      if (taken && taken.id !== id) {
        return NextResponse.json(
          { success: false, error: `Username "${formattedUsername}" is already taken.` },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(phone !== undefined && { phone: phone ? phone.trim() : null }),
        ...(address !== undefined && { address: address ? address.trim() : null }),
        ...(role && { role }),
        ...(username && { username: username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') }),
        ...(assignedHub !== undefined && { assignedHub: assignedHub ? assignedHub.trim() : null }),
        // Password updates: Strictly admin controlled
        ...(password && {
          password: password.trim(),
          tempPassword: password.trim(),
        }),
      },
    });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        action: password ? 'RESET_STAFF_PASSWORD' : 'UPDATE_USER_ACCOUNT',
        userId: currentUser.id,
        metadata: JSON.stringify({
          updatedUserId: updated.id,
          name: updated.name,
          username: updated.username,
          passwordChanged: !!password,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: password ? 'Staff password successfully reset by Admin.' : 'User updated successfully.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Only Furora Admins can remove staff accounts' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Prevent deleting default root admin
    if (id === 'usr_admin') {
      return NextResponse.json(
        { success: false, error: 'The primary system admin account cannot be deleted.' },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            agentOrders: true,
            vendorOrders: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    if (existing._count.agentOrders > 0 || existing._count.vendorOrders > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete user with ${existing._count.agentOrders + existing._count.vendorOrders} linked operational orders. Reassign orders first or deactivate account.`,
        },
        { status: 400 }
      );
    }

    await prisma.user.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        action: 'DELETE_USER_ACCOUNT',
        userId: currentUser.id,
        metadata: JSON.stringify({
          deletedUserId: id,
          deletedUserName: existing.name,
          deletedUserRole: existing.role,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Account ${existing.name} removed successfully.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete user' },
      { status: 500 }
    );
  }
}
