import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isR2Configured } from '@/lib/r2';
import { isEmailConfigured } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rawTursoUrl = process.env.TURSO_DATABASE_URL || '';
    const rawToken = process.env.TURSO_AUTH_TOKEN || '';
    const isTursoConfigured = Boolean(rawTursoUrl && rawToken && !rawToken.includes('your_'));

    let dbStatus = 'DISCONNECTED';
    let userCount = 0;
    let categoryCount = 0;
    let breedCount = 0;
    let petCount = 0;
    let dbError: string | null = null;

    try {
      userCount = await prisma.user.count();
      categoryCount = await prisma.category.count();
      breedCount = await prisma.breed.count();
      petCount = await prisma.pet.count();
      dbStatus = 'CONNECTED';
    } catch (err: any) {
      dbError = err.message;
      dbStatus = 'ERROR';
    }

    return NextResponse.json({
      status: dbStatus === 'CONNECTED' ? 'HEALTHY' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatus,
        mode: isTursoConfigured ? 'TURSO_CLOUD_LIBSQL' : 'LOCAL_SQLITE_FALLBACK',
        userCount,
        categoryCount,
        breedCount,
        petCount,
        error: dbError,
      },
      storage: {
        r2Configured: isR2Configured(),
        bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME || 'furorapetsbucket',
      },
      email: {
        smtpConfigured: isEmailConfigured(),
        host: process.env.SMTP_HOST || 'smtp.hostinger.com',
      },
      environment: process.env.NODE_ENV,
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: 'ERROR', error: error.message },
      { status: 500 }
    );
  }
}
