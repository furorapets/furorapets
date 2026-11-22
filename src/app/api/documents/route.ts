import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { assertRole, rbacErrorResponse } from '@/lib/rbac';
import { getCurrentUser } from '@/lib/auth';
import { canAccessDocument } from '@/lib/document-visibility';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// GET /api/documents - Returns documents filtered by central Document Visibility Engine
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const url = new URL(req.url);
    const petId = url.searchParams.get('petId');
    const orderId = url.searchParams.get('orderId');

    const where: any = {};
    if (petId) where.petId = petId;
    if (orderId) where.orderId = orderId;

    const documents = await prisma.document.findMany({
      where,
      include: {
        order: { select: { id: true, vendorId: true, customerId: true, agentId: true } },
        pet: { select: { id: true, vendorId: true } },
      },
      orderBy: { uploadedAt: 'desc' },
    });

    // Central Visibility Filter (PRD §5 Module J)
    const accessibleDocuments = documents.filter((doc) => {
      return canAccessDocument(
        user,
        {
          id: doc.id,
          visibility: doc.visibility,
          uploadedById: doc.uploadedById,
          petId: doc.petId,
          orderId: doc.orderId,
        },
        {
          orderVendorId: doc.order?.vendorId,
          orderCustomerId: doc.order?.customerId,
          orderAgentId: doc.order?.agentId,
          petVendorId: doc.pet?.vendorId,
        }
      );
    });

    return NextResponse.json({ success: true, data: accessibleDocuments });
  } catch (error) {
    return rbacErrorResponse(error);
  }
}

// POST /api/documents - Upload document with mandatory visibility level
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const {
      petId,
      orderId,
      type,
      visibility,
      fileUrl,
      fileName,
      fileSize,
    } = body;

    const validVisibilities = [
      'ADMIN_ONLY',
      'INTERNAL_FURORA',
      'VENDOR_VISIBLE',
      'CUSTOMER_VISIBLE',
      'DELIVERY_AGENT_VISIBLE',
    ];

    if (!visibility || !validVisibilities.includes(visibility)) {
      return NextResponse.json(
        { error: `visibility must be one of [${validVisibilities.join(', ')}]` },
        { status: 400 }
      );
    }

    if (!type || !fileUrl || !fileName) {
      return NextResponse.json(
        { error: 'type, fileUrl, and fileName are required' },
        { status: 400 }
      );
    }

    // Role restrictions on visibility tags: Only Admin can create ADMIN_ONLY or INTERNAL_FURORA
    if ((visibility === 'ADMIN_ONLY' || visibility === 'INTERNAL_FURORA') && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only Admin can tag documents as ADMIN_ONLY or INTERNAL_FURORA' },
        { status: 403 }
      );
    }

    const doc = await prisma.document.create({
      data: {
        petId: petId || null,
        orderId: orderId || null,
        type,
        visibility,
        fileUrl,
        fileName,
        fileSize: fileSize || null,
        uploadedById: user.id,
      },
    });

    await logAudit({
      orderId: orderId || null,
      userId: user.id,
      action: 'DOCUMENT_UPLOADED',
      fromState: null,
      toState: visibility,
      metadata: {
        documentId: doc.id,
        type,
        fileName,
        petId,
      },
    });

    return NextResponse.json({ success: true, data: doc }, { status: 201 });
  } catch (error) {
    return rbacErrorResponse(error);
  }
}
