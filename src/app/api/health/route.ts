import { NextResponse } from 'next/server';
import { prisma, getPrismaDiagnostics, getCanonicalTursoConfig } from '@/lib/prisma';
import { isR2Configured } from '@/lib/r2';
import { isEmailConfigured } from '@/lib/email';
import { createClient } from '@libsql/client';
import { ensureDatabaseSchema } from '@/lib/db-init';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { url: tursoUrl, authToken: tursoAuthToken } = getCanonicalTursoConfig();

    const hasValidTurso =
      Boolean(tursoUrl) &&
      Boolean(tursoAuthToken) &&
      tursoAuthToken !== 'your_turso_auth_token_here' &&
      !tursoAuthToken.includes('your_');

    let directTables: string[] = [];
    let directError: string | null = null;
    let autoMigrated = false;

    // Direct LibSQL test & Self-Healing Table Creation
    if (hasValidTurso) {
      try {
        const directClient = createClient({
          url: tursoUrl,
          authToken: tursoAuthToken,
        });

        const res = await directClient.execute("SELECT name FROM sqlite_master WHERE type='table'");
        directTables = res.rows.map((r) => String(r.name));

        // If User or Category table is missing, automatically initialize the schema and seed!
        if (!directTables.includes('User') || !directTables.includes('Category')) {
          console.log('[api/health] Tables missing in connected database! Running auto-migration...');
          const migrationRes = await ensureDatabaseSchema(directClient);
          if (migrationRes.success) {
            autoMigrated = true;
            const updated = await directClient.execute("SELECT name FROM sqlite_master WHERE type='table'");
            directTables = updated.rows.map((r) => String(r.name));
          }
        }

        // Self-healing check: ensure assignedCategories column exists on User table
        if (directTables.includes('User')) {
          const tableInfo = await directClient.execute('PRAGMA table_info("User")');
          const cols = tableInfo.rows.map((r) => String(r.name));
          if (!cols.includes('assignedCategories')) {
            console.log('[api/health] assignedCategories column missing on User table. Adding...');
            try {
              await directClient.execute(`ALTER TABLE "User" ADD COLUMN "assignedCategories" TEXT DEFAULT '[]'`);
              console.log('[api/health] assignedCategories column added successfully.');
            } catch (err: any) {
              console.error('[api/health] Error adding assignedCategories column:', err.message);
            }
          }
        }

        // Self-healing check: ensure microchipNumber column exists on Pet table
        if (directTables.includes('Pet')) {
          const tableInfo = await directClient.execute('PRAGMA table_info("Pet")');
          const cols = tableInfo.rows.map((r) => String(r.name));
          if (!cols.includes('microchipNumber')) {
            console.log('[api/health] microchipNumber column missing on Pet table. Adding...');
            try {
              await directClient.execute(`ALTER TABLE "Pet" ADD COLUMN "microchipNumber" TEXT`);
              console.log('[api/health] microchipNumber column added successfully.');
            } catch (err: any) {
              console.error('[api/health] Error adding microchipNumber column:', err.message);
            }
          }
        }
      } catch (err: any) {
        directError = err.message;
      }
    }

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

    const prismaDiagnostics = getPrismaDiagnostics();

    return NextResponse.json({
      status: dbStatus === 'CONNECTED' ? 'HEALTHY' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatus,
        mode: prismaDiagnostics.mode,
        userCount,
        categoryCount,
        breedCount,
        petCount,
        error: dbError,
        diagnostics: {
          prismaMode: prismaDiagnostics.mode,
          adapterError: prismaDiagnostics.adapterError,
          tursoUrlSet: Boolean(tursoUrl),
          tursoUrlMasked: tursoUrl ? `${tursoUrl.slice(0, 20)}...${tursoUrl.slice(-15)}` : 'NOT_CONFIGURED',
          tokenLength: tursoAuthToken.length,
          tokenStart: tursoAuthToken ? tursoAuthToken.slice(0, 10) : 'NONE',
          directLibsql: {
            success: directTables.length > 0,
            tablesCount: directTables.length,
            tables: directTables,
            error: directError,
            autoMigrated,
          },
        },
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

export async function POST() {
  try {
    const { url: tursoUrl, authToken: tursoAuthToken } = getCanonicalTursoConfig();

    if (!tursoUrl || !tursoAuthToken) {
      return NextResponse.json(
        { success: false, error: 'TURSO_DATABASE_URL or TURSO_AUTH_TOKEN not configured' },
        { status: 400 }
      );
    }

    const directClient = createClient({
      url: tursoUrl,
      authToken: tursoAuthToken,
    });

    const result = await ensureDatabaseSchema(directClient);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
