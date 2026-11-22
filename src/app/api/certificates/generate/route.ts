import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { generatePetCertificate } from '@/lib/certificate-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const baseUrl = `${protocol}://${host}`;

    const cert = await generatePetCertificate(orderId, baseUrl);
    return NextResponse.json({ success: true, data: cert });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
