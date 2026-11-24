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

    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'breeder.furora.in';
    const protocol = req.headers.get('x-forwarded-proto') || 'https';
    let baseUrl = `${protocol}://${host}`;
    if (baseUrl.includes('localhost') && (process.env.VERCEL || process.env.NODE_ENV === 'production' || host?.includes('furora.in'))) {
      baseUrl = 'https://breeder.furora.in';
    }

    const cert = await generatePetCertificate(orderId, baseUrl);
    return NextResponse.json({ success: true, data: cert });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
