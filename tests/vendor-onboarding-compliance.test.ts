import { describe, it, expect } from 'vitest';
import prisma from '../src/lib/prisma';
import { POST } from '../src/app/api/users/route';
import { NextRequest } from 'next/server';

describe('Vendor Onboarding Compliance & Mandatory Documents', () => {
  it('should reject vendor creation if mandatory compliance documents are missing', async () => {
    // Missing kennelRegDoc
    const req = new NextRequest('http://localhost:3000/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'ADMIN',
        'x-user-id': 'usr_admin',
      },
      body: JSON.stringify({
        name: 'Incomplete Kennel',
        email: `incomplete_${Date.now()}@kennel.com`,
        role: 'VENDOR',
        kennelRegNumber: 'KCI-9999',
        // kennelRegDoc omitted!
        govIdDoc: 'https://docs.test/id.pdf',
        tradeLicenseDoc: 'https://docs.test/trade.pdf',
        vetAffiliationDoc: 'https://docs.test/vet.pdf',
        bankDetailsDoc: 'https://docs.test/bank.pdf',
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Kennel registration certificate document is mandatory');
  });

  it('should successfully onboard vendor with all 5 mandatory compliance docs and lock visibility to ADMIN_ONLY', async () => {
    const testEmail = `verified_kennel_${Date.now()}@furora.com`;
    const req = new NextRequest('http://localhost:3000/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'ADMIN',
        'x-user-id': 'usr_admin',
      },
      body: JSON.stringify({
        name: 'Apex Canine Breeding & Kennels',
        email: testEmail,
        role: 'VENDOR',
        phone: '+91 9888877777',
        address: 'Sector 4, Whitefield, Bangalore',
        kennelRegNumber: 'KCI-BLR-2024-8871',
        kennelRegDoc: 'https://furora-docs.storage/vendors/kci-apex-cert.pdf',
        govIdDoc: 'https://furora-docs.storage/vendors/owner-aadhaar-pan.pdf',
        tradeLicenseDoc: 'https://furora-docs.storage/vendors/bbmp-trade-license.pdf',
        vetAffiliationDoc: 'https://furora-docs.storage/vendors/vet-care-mou.pdf',
        bankDetailsDoc: 'https://furora-docs.storage/vendors/hdfc-canceled-cheque.pdf',
        onboardingStatus: 'APPROVED',
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.name).toBe('Apex Canine Breeding & Kennels');
    expect(data.data.kennelRegNumber).toBe('KCI-BLR-2024-8871');
    expect(data.data.onboardingStatus).toBe('APPROVED');

    // Verify documents exist in database with ADMIN_ONLY visibility
    const createdDocs = await prisma.document.findMany({
      where: {
        fileUrl: {
          in: [
            'https://furora-docs.storage/vendors/kci-apex-cert.pdf',
            'https://furora-docs.storage/vendors/owner-aadhaar-pan.pdf',
            'https://furora-docs.storage/vendors/bbmp-trade-license.pdf',
            'https://furora-docs.storage/vendors/vet-care-mou.pdf',
            'https://furora-docs.storage/vendors/hdfc-canceled-cheque.pdf',
          ],
        },
      },
    });

    expect(createdDocs.length).toBe(5);
    for (const doc of createdDocs) {
      expect(doc.visibility).toBe('ADMIN_ONLY');
    }

    // Clean up
    await prisma.document.deleteMany({
      where: {
        fileUrl: {
          in: [
            'https://furora-docs.storage/vendors/kci-apex-cert.pdf',
            'https://furora-docs.storage/vendors/owner-aadhaar-pan.pdf',
            'https://furora-docs.storage/vendors/bbmp-trade-license.pdf',
            'https://furora-docs.storage/vendors/vet-care-mou.pdf',
            'https://furora-docs.storage/vendors/hdfc-canceled-cheque.pdf',
          ],
        },
      },
    });
    await prisma.user.delete({ where: { email: testEmail } });
  });
});
