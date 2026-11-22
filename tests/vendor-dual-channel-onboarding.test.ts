import { describe, it, expect, beforeAll } from 'vitest';
import prisma from '../src/lib/prisma';
import { GET as getVendors, POST as postVendor } from '../src/app/api/vendors/route';
import { PUT as updateVendor } from '../src/app/api/vendors/[id]/route';
import { GET as checkPartnerStatus, POST as submitPartnerApplication } from '../src/app/api/vendor-onboarding/route';
import { NextRequest } from 'next/server';

describe('Dual-Channel Vendor Onboarding & Verification Feedback Loop', () => {
  const testPartnerEmail = `partner_${Date.now()}@furoratest.com`;
  let partnerId = '';

  it('Channel 2 (Public Partner Landing Page): should allow a breeder kennel to submit an onboarding application with 5 compliance documents', async () => {
    const payload = {
      name: 'Blue Ridge K9 Academy & Kennel',
      email: testPartnerEmail,
      phone: '+91 9988776655',
      address: 'Plot 42, Devanahalli Highway, Bangalore',
      kennelRegNumber: 'KCI-BREED-2026-9901',
      kennelRegDoc: 'https://docs.furora.com/kci-cert-blueridge.pdf',
      govIdDoc: 'https://docs.furora.com/aadhaar-proprietor.pdf',
      tradeLicenseDoc: 'https://docs.furora.com/bbmp-trade-license.pdf',
      vetAffiliationDoc: 'https://docs.furora.com/vet-clinic-mou.pdf',
      bankDetailsDoc: 'https://docs.furora.com/canceled-cheque.pdf',
      ethicalDeclaration: true,
    };

    const req = new NextRequest('http://localhost:3000/api/vendor-onboarding', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const res = await submitPartnerApplication(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.onboardingStatus).toBe('PENDING');
    expect(json.data.kennelRegNumber).toBe('KCI-BREED-2026-9901');
    partnerId = json.data.id;
  });

  it('Partner Status Tracking: applicant should be able to query their status via email', async () => {
    const req = new NextRequest(`http://localhost:3000/api/vendor-onboarding?email=${encodeURIComponent(testPartnerEmail)}`, {
      method: 'GET',
    });

    const res = await checkPartnerStatus(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.email).toBe(testPartnerEmail);
    expect(json.data.onboardingStatus).toBe('PENDING');
  });

  it('Admin Review & Feedback: Admin inspects documents and requests re-submission with feedback notes', async () => {
    const req = new NextRequest(`http://localhost:3000/api/vendors/${partnerId}`, {
      method: 'PUT',
      headers: { 'x-furora-user-id': 'usr_admin' },
      body: JSON.stringify({
        action: 'REQUEST_CHANGES',
        onboardingNotes: 'Govt ID Aadhaar scan is partially blurred and Vet MoU expired on October 2026. Please upload clear, updated copies.',
      }),
    });

    const res = await updateVendor(req, { params: Promise.resolve({ id: partnerId }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.onboardingStatus).toBe('CHANGES_REQUESTED');
    expect(json.data.onboardingNotes).toContain('blurred');
  });

  it('Partner Re-submission: Partner updates flagged documents via public onboarding endpoint, resetting status to PENDING', async () => {
    const updatePayload = {
      name: 'Blue Ridge K9 Academy & Kennel',
      email: testPartnerEmail,
      phone: '+91 9988776655',
      address: 'Plot 42, Devanahalli Highway, Bangalore',
      kennelRegNumber: 'KCI-BREED-2026-9901',
      kennelRegDoc: 'https://docs.furora.com/kci-cert-blueridge.pdf',
      govIdDoc: 'https://docs.furora.com/aadhaar-proprietor-HD-CLEAR.pdf',
      tradeLicenseDoc: 'https://docs.furora.com/bbmp-trade-license.pdf',
      vetAffiliationDoc: 'https://docs.furora.com/vet-clinic-mou-RENEWED-2027.pdf',
      bankDetailsDoc: 'https://docs.furora.com/canceled-cheque.pdf',
      ethicalDeclaration: true,
      isResubmission: true,
    };

    const req = new NextRequest('http://localhost:3000/api/vendor-onboarding', {
      method: 'POST',
      body: JSON.stringify(updatePayload),
    });

    const res = await submitPartnerApplication(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.isResubmission).toBe(true);
    expect(json.data.onboardingStatus).toBe('PENDING');
  });

  it('Admin Approval: Admin verifies renewed documents and approves the kennel partner', async () => {
    const req = new NextRequest(`http://localhost:3000/api/vendors/${partnerId}`, {
      method: 'PUT',
      headers: { 'x-furora-user-id': 'usr_admin' },
      body: JSON.stringify({
        action: 'APPROVE',
        onboardingNotes: 'All 5 documents verified and compliant with Furora ethical breeding standard.',
      }),
    });

    const res = await updateVendor(req, { params: Promise.resolve({ id: partnerId }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.onboardingStatus).toBe('APPROVED');
  });

  it('Channel 1 (Admin Dashboard Direct Onboarding): Admin can onboard a vendor directly with complete compliance documents', async () => {
    const directEmail = `direct_vendor_${Date.now()}@furora.com`;
    const payload = {
      name: 'Grand Champion Siberian Kennels',
      email: directEmail,
      phone: '+91 9123456789',
      address: 'Sector 5, Alkapuri, Vadodara',
      kennelRegNumber: 'KCI-KEN-2026-4412',
      kennelRegDoc: 'https://docs.furora.com/kci-direct-cert.pdf',
      govIdDoc: 'https://docs.furora.com/pan-direct.pdf',
      tradeLicenseDoc: 'https://docs.furora.com/vmc-trade-license.pdf',
      vetAffiliationDoc: 'https://docs.furora.com/vadodara-vet-mou.pdf',
      bankDetailsDoc: 'https://docs.furora.com/direct-cheque.pdf',
      onboardingStatus: 'APPROVED',
    };

    const req = new NextRequest('http://localhost:3000/api/vendors', {
      method: 'POST',
      headers: { 'x-furora-user-id': 'usr_admin' },
      body: JSON.stringify(payload),
    });

    const res = await postVendor(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.onboardingStatus).toBe('APPROVED');
    expect(json.data.role).toBe('VENDOR');
  });
});
