import { describe, it, expect } from 'vitest';
import prisma from '@/lib/prisma';
import { isR2Configured, getR2PublicUrl } from '@/lib/r2';
import { POST as storagePresignedHandler } from '@/app/api/storage/presigned-url/route';
import { NextRequest } from 'next/server';

describe('Turso & Cloudflare R2 Cloud Production Integration', () => {
  it('1. Prisma database connection works seamlessly with driver adapter setup', async () => {
    const userCount = await prisma.user.count();
    expect(typeof userCount).toBe('number');
    expect(userCount).toBeGreaterThan(0);

    const categoryCount = await prisma.category.count();
    expect(categoryCount).toBeGreaterThanOrEqual(6);

    const orderCount = await prisma.order.count();
    expect(typeof orderCount).toBe('number');
  });

  it('2. Cloudflare R2 URL generator formats public asset links cleanly', () => {
    const testKey = 'pets/FUR-PET-0001/pickup-12345.jpg';
    const publicUrl = getR2PublicUrl(testKey);
    expect(publicUrl).toContain(testKey);
    expect(publicUrl).toContain('pub-55b78e48e95d40789d68e450814345d4.r2.dev');
  });

  it('3. /api/storage/presigned-url returns secure upload parameters', async () => {
    const req = new NextRequest('http://localhost:3000/api/storage/presigned-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-furora-user-id': 'usr_admin',
      },
      body: JSON.stringify({
        fileName: 'medical-cert-clearance.pdf',
        fileType: 'application/pdf',
        folder: 'medical-records',
      }),
    });

    const res = await storagePresignedHandler(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.key).toContain('medical-records/');
    expect(json.data.uploadUrl).toBeDefined();
    expect(json.data.fileUrl).toBeDefined();
  });
});
