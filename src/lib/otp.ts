import crypto from 'crypto';
import { sendEmail } from '@/lib/email';

const SECRET = process.env.SESSION_SECRET || 'furora_secure_otp_secret_2026';

export interface OtpTokenResult {
  otp: string;
  token: string;
}

/**
 * Generates a 6-digit numeric OTP and an HMAC signed verification token.
 */
export function generateOtp(email: string): OtpTokenResult {
  const cleanEmail = email.trim().toLowerCase();
  const otpNumber = crypto.randomInt(100000, 999999);
  const otp = otpNumber.toString();

  const payload = {
    email: cleanEmail,
    otpHash: crypto.createHmac('sha256', SECRET).update(otp).digest('hex'),
    exp: Date.now() + 10 * 60 * 1000, // Valid for 10 minutes
    nonce: crypto.randomBytes(8).toString('hex'),
  };

  const str = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(str).digest('base64url');
  const token = `${str}.${sig}`;

  return { otp, token };
}

/**
 * Validates a user-supplied 6-digit OTP against the signed token.
 */
export function verifyOtp(token: string, email: string, inputOtp: string): { valid: boolean; error?: string } {
  if (!token || !token.includes('.')) {
    return { valid: false, error: 'Missing or expired OTP token. Please request a new code.' };
  }
  if (!inputOtp || !inputOtp.trim()) {
    return { valid: false, error: 'Please enter the 6-digit verification code.' };
  }

  const [str, sig] = token.split('.');
  const expectedSig = crypto.createHmac('sha256', SECRET).update(str).digest('base64url');
  if (sig !== expectedSig) {
    return { valid: false, error: 'Invalid verification signature. Please request a new code.' };
  }

  try {
    const payload = JSON.parse(Buffer.from(str, 'base64url').toString('utf8'));

    if (Date.now() > payload.exp) {
      return { valid: false, error: 'Verification code expired (valid for 10 mins). Please request a new code.' };
    }

    if (payload.email !== email.trim().toLowerCase()) {
      return { valid: false, error: 'Email mismatch. Please request a code for this email.' };
    }

    const inputHash = crypto.createHmac('sha256', SECRET).update(inputOtp.trim()).digest('hex');
    if (inputHash !== payload.otpHash) {
      return { valid: false, error: 'Incorrect verification code. Please check your inbox and try again.' };
    }

    return { valid: true };
  } catch (err: any) {
    return { valid: false, error: 'Failed to verify OTP' };
  }
}

/**
 * Sends a high-conversion, professional HTML email containing the 6-digit OTP.
 */
export async function sendOtpEmail(email: string, kennelName: string, otp: string) {
  const subject = `Your Furora Partner Verification Code: ${otp}`;
  const formattedOtp = otp.split('').join(' ');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      <!-- Header -->
      <div style="background: #0f172a; padding: 28px 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 1px;">FURORA</h1>
        <p style="color: #94a3b8; margin: 6px 0 0; font-size: 13px; font-weight: 500;">Verified Ethical Breeder & Kennel Partner Network</p>
      </div>

      <!-- Content -->
      <div style="padding: 36px 28px; text-align: center;">
        <div style="display: inline-block; padding: 6px 14px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 9999px; font-size: 11px; font-weight: 700; color: #047857; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px;">
          Email Verification
        </div>
        
        <h2 style="color: #0f172a; font-size: 20px; font-weight: 700; margin: 0 0 10px;">Confirm Your Partner Registration</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
          You are registering <strong style="color: #0f172a;">${kennelName || 'your kennel'}</strong> on the Furora Partner Platform. Use the 6-digit verification code below to verify your email address:
        </p>

        <!-- Big OTP Card -->
        <div style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 14px; padding: 20px; margin: 0 auto 24px; max-width: 320px;">
          <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #d97706; display: block;">
            ${formattedOtp}
          </span>
          <span style="display: block; font-size: 11px; font-weight: 600; color: #64748b; margin-top: 8px;">
            ⏱ Valid for 10 minutes
          </span>
        </div>

        <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 0 0 20px;">
          Enter this code in your onboarding browser tab to continue filling your compliance details.
        </p>

        <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; text-align: left;">
          <p style="color: #94a3b8; font-size: 11px; line-height: 1.5; margin: 0;">
            <strong>Security Notice:</strong> Furora support staff will never ask for your verification code. If you did not request this code, please disregard this email.
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div style="background: #f8fafc; padding: 18px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="color: #94a3b8; font-size: 11px; margin: 0;">
          Furora Partner Desk &bull; <a href="mailto:breeder@furora.in" style="color: #64748b; text-decoration: underline;">breeder@furora.in</a> &bull; Chennai HQ
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to: email,
    subject,
    html,
  });
}
