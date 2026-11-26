import { describe, it, expect } from 'vitest';
import { generateOtp, verifyOtp } from '../src/lib/otp';
import { generatePasswordProtectedVendorPdf } from '../src/lib/vendor-credential-pdf';

describe('Self-Service Password Change via Email OTP', () => {
  const testEmail = 'staff.test@furora.in';

  it('generates a 6-digit OTP and HMAC signed token scoped for PASSWORD_CHANGE', () => {
    const { otp, token } = generateOtp(testEmail, 'PASSWORD_CHANGE');
    expect(otp).toMatch(/^\d{6}$/);
    expect(token).toContain('.');
  });

  it('successfully verifies OTP when valid code, email, and purpose match', () => {
    const { otp, token } = generateOtp(testEmail, 'PASSWORD_CHANGE');
    const result = verifyOtp(token, testEmail, otp, 'PASSWORD_CHANGE');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('rejects verification if OTP code is incorrect', () => {
    const { token } = generateOtp(testEmail, 'PASSWORD_CHANGE');
    const result = verifyOtp(token, testEmail, '000000', 'PASSWORD_CHANGE');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Incorrect verification code');
  });

  it('rejects verification if email does not match token', () => {
    const { otp, token } = generateOtp(testEmail, 'PASSWORD_CHANGE');
    const result = verifyOtp(token, 'attacker@evil.com', otp, 'PASSWORD_CHANGE');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Email mismatch');
  });

  it('rejects verification if security token purpose does not match', () => {
    const { otp, token } = generateOtp(testEmail, 'ONBOARDING_VERIFY');
    const result = verifyOtp(token, testEmail, otp, 'PASSWORD_CHANGE');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Security token context mismatch');
  });
});

describe('Password-Protected Vendor Credentials PDF Generation', () => {
  it('generates an encrypted PDF document requiring the vendor phone password', async () => {
    const pdfPassword = '9876543210';
    const pdfBuffer = await generatePasswordProtectedVendorPdf({
      vendorName: 'Royal Bengal Kennel',
      email: 'breeder@royalbengal.in',
      phone: '9876543210',
      kennelRegNumber: 'KCI-KEN-2024-9912',
      address: 'Bengaluru, Karnataka',
      username: 'royal_bengal_3210',
      tempPassword: 'Furora@7890',
      loginUrl: 'https://breeder.furora.in/vendor',
      pdfPassword,
    });

    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(1000);

    // Verify it is a valid PDF
    const pdfHeader = pdfBuffer.slice(0, 5).toString('ascii');
    expect(pdfHeader).toBe('%PDF-');

    // Verify it contains PDF encryption dictionary (/Encrypt)
    const pdfContent = pdfBuffer.toString('binary');
    expect(pdfContent.includes('/Encrypt')).toBe(true);
  });
});
