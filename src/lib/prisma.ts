import { PrismaClient } from '@prisma/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  // Normalize Turso URL
  const rawTursoUrl =
    process.env.TURSO_DATABASE_URL ||
    (process.env.DATABASE_URL?.startsWith('libsql://') || process.env.DATABASE_URL?.startsWith('https://')
      ? process.env.DATABASE_URL
      : '');
  const tursoUrl = rawTursoUrl.replace(/[\r\n"']/g, '').trim();

  // Normalize Turso Auth Token
  const rawToken =
    process.env.TURSO_AUTH_TOKEN ||
    process.env.TURSO_TOKEN ||
    process.env.LIBSQL_AUTH_TOKEN ||
    '';
  const tursoAuthToken = rawToken.replace(/[\r\n"']/g, '').trim();

  const hasValidTurso =
    Boolean(tursoUrl) &&
    Boolean(tursoAuthToken) &&
    tursoAuthToken !== 'your_turso_auth_token_here' &&
    !tursoAuthToken.includes('your_');

  if (hasValidTurso) {
    try {
      console.log(`[Prisma] Connecting to Turso Cloud Database: ${tursoUrl.slice(0, 35)}...`);
      const libsql = createClient({
        url: tursoUrl,
        authToken: tursoAuthToken,
      });
      const adapter = new PrismaLibSQL(libsql);
      return new PrismaClient({
        adapter: adapter as any,
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      });
    } catch (err: any) {
      console.error('[Prisma] Error creating Turso LibSQL adapter:', err.message);
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

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
