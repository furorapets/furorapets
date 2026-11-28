import { PrismaClient } from '@prisma/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';

export interface PrismaDiagnostics {
  tursoUrlSet: boolean;
  tursoUrlMasked: string;
  tokenLength: number;
  hasValidTurso: boolean;
  mode: 'TURSO_CLOUD_LIBSQL' | 'FALLBACK_LOCAL_SQLITE';
  adapterError: string | null;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaDiagnostics?: PrismaDiagnostics;
};

export const CANONICAL_TURSO_URL = 'libsql://furora-pets-furorapets.aws-ap-south-1.turso.io';
export const CANONICAL_TURSO_AUTH_TOKEN =
  'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTUzNTM0OTUsImlkIjoiMDFhMjAzNjctYzgwMS03YWI5LTk1ZjItYWE3ZjY4MmIzMmJkIiwia2lkIjoicWZnWkN3SG1yckZxZ3JzWHgzaHdfenBZWHE2aGZtWUpVREkyY0U3STdYSSIsInJpZCI6ImU2MGIwZDdmLTdlZGUtNGE0Ny05YzI2LTk5NzI4ZjFiZTI4YiJ9.-g_LbOCHj-eICux2vR96g00M42FcSRLqVdu8VPapR_1dU6uxVm54KoYzdUXZn8GlBJsu02WXW39n44TwXWkgDw';

export function getCanonicalTursoConfig(): { url: string; authToken: string } {
  const rawTursoUrl =
    process.env.TURSO_DATABASE_URL ||
    (process.env.DATABASE_URL?.startsWith('libsql://') || process.env.DATABASE_URL?.startsWith('https://')
      ? process.env.DATABASE_URL
      : '');
  let tursoUrl = rawTursoUrl.replace(/[\r\n"']/g, '').trim();

  const rawToken =
    process.env.TURSO_AUTH_TOKEN ||
    process.env.TURSO_TOKEN ||
    process.env.LIBSQL_AUTH_TOKEN ||
    '';
  let tursoAuthToken = rawToken.replace(/[\r\n"']/g, '').trim();

  // If unconfigured or pointing to obsolete Phase 1 staging DB 'database-be', route to Phase 2 authoritative DB
  if (
    !tursoUrl ||
    tursoUrl.includes('database-be') ||
    !tursoAuthToken ||
    tursoAuthToken === 'your_turso_auth_token_here' ||
    tursoAuthToken.includes('your_')
  ) {
    tursoUrl = CANONICAL_TURSO_URL;
    tursoAuthToken = CANONICAL_TURSO_AUTH_TOKEN;
  }

  return { url: tursoUrl, authToken: tursoAuthToken };
}

function createPrismaClient(): PrismaClient {
  const { url: tursoUrl, authToken: tursoAuthToken } = getCanonicalTursoConfig();

  const hasValidTurso =
    Boolean(tursoUrl) &&
    Boolean(tursoAuthToken) &&
    tursoAuthToken !== 'your_turso_auth_token_here' &&
    !tursoAuthToken.includes('your_');

  globalForPrisma.prismaDiagnostics = {
    tursoUrlSet: Boolean(tursoUrl),
    tursoUrlMasked: tursoUrl ? `${tursoUrl.slice(0, 15)}...${tursoUrl.slice(-15)}` : 'EMPTY',
    tokenLength: tursoAuthToken.length,
    hasValidTurso,
    mode: hasValidTurso ? 'TURSO_CLOUD_LIBSQL' : 'FALLBACK_LOCAL_SQLITE',
    adapterError: null,
  };

  if (hasValidTurso) {
    try {
      console.log(`[Prisma] Connecting to Turso Cloud Database: ${tursoUrl.slice(0, 35)}...`);
      const libsql = createClient({
        url: tursoUrl,
        authToken: tursoAuthToken,
      });

      // Self-healing migration: ensure assignedCategories column exists on User table
      libsql
        .execute(`ALTER TABLE "User" ADD COLUMN "assignedCategories" TEXT DEFAULT '[]'`)
        .catch(() => {}); // safely ignore if already exists or during table creation

      // Self-healing migration: ensure microchipNumber column exists on Pet table
      libsql
        .execute(`ALTER TABLE "Pet" ADD COLUMN "microchipNumber" TEXT`)
        .catch(() => {});

      // Self-healing migrations: ensure location & maps columns exist on User table
      libsql
        .execute(`ALTER TABLE "User" ADD COLUMN "mapUrl" TEXT`)
        .catch(() => {});
      libsql
        .execute(`ALTER TABLE "User" ADD COLUMN "secondaryAddress" TEXT`)
        .catch(() => {});
      libsql
        .execute(`ALTER TABLE "User" ADD COLUMN "secondaryMapUrl" TEXT`)
        .catch(() => {});

      const adapter = new PrismaLibSQL(libsql);
      return new PrismaClient({
        adapter: adapter as any,
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      });
    } catch (err: any) {
      console.error('[Prisma] Error creating Turso LibSQL adapter:', err.message);
      if (globalForPrisma.prismaDiagnostics) {
        globalForPrisma.prismaDiagnostics.adapterError = err.message;
        globalForPrisma.prismaDiagnostics.mode = 'FALLBACK_LOCAL_SQLITE';
      }
    }
  }

  // Warning when running in production or on Vercel without Turso
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    console.error(
      '[Prisma] CRITICAL WARNING: Running in production without valid TURSO_DATABASE_URL / TURSO_AUTH_TOKEN!\n' +
      'Vercel serverless containers do not persist local SQLite database files, causing "no such table: main.User".\n' +
      'Please ensure TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are saved in Vercel Settings -> Environment Variables.'
    );
  }

  // Fallback to standard local SQLite client for local development & test runs
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

export function getPrismaDiagnostics(): PrismaDiagnostics {
  if (!globalForPrisma.prismaDiagnostics) {
    // If not initialized yet, trigger client creation
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = createPrismaClient();
    }
  }
  return (
    globalForPrisma.prismaDiagnostics || {
      tursoUrlSet: false,
      tursoUrlMasked: 'NOT_INITIALIZED',
      tokenLength: 0,
      hasValidTurso: false,
      mode: 'FALLBACK_LOCAL_SQLITE',
      adapterError: null,
    }
  );
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
