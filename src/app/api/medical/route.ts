import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { assertRole, rbacErrorResponse } from '@/lib/rbac';
import { submitMedicalExamination } from '@/lib/medical-service';

// POST /api/medical - Submit medical examination results and documents
export async function POST(req: NextRequest) {
  try {
    const user = await assertRole(req, ['ADMIN', 'DELIVERY_AGENT']);
    const body = await req.json();

    const {
      orderId,
      petId,
      result,
      reason,
      proofDocs = [],
      documents = [],
      vetClinicName,
      vetDoctorName,
    } = body;

    if (!orderId || !result) {
      return NextResponse.json({ error: 'orderId and result are required' }, { status: 400 });
    }

    const res = await submitMedicalExamination({
      orderId,
      petId,
      actorId: user.id,
      result,
      reason,
      proofDocs,
      documents,
      vetClinicName,
      vetDoctorName,
    });

    return NextResponse.json({ success: true, data: res }, { status: 201 });
  } catch (error: any) {
    return rbacErrorResponse(error);
  }
}
