import nodemailer from 'nodemailer';

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
  encoding?: string;
}

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
}

/**
 * Checks whether SMTP email credentials are configured.
 */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

/**
 * Returns a configured Nodemailer transporter using Hostinger SMTP.
 */
export function getEmailTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.hostinger.com';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER || 'breeder@furora.in';
  const pass = process.env.SMTP_PASS || '';

  return nodemailer.createTransport({
    host,
    port,
    secure, // true for 465, false for 587
    auth: {
      user,
      pass,
    },
  });
}

/**
 * Sends an email via Hostinger SMTP.
 */
export async function sendEmail(payload: EmailPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const transporter = getEmailTransporter();
    const from = process.env.SMTP_FROM || `Furora Partner Network <${process.env.SMTP_USER || 'breeder@furora.in'}>`;

    const info = await transporter.sendMail({
      from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text || payload.html.replace(/<[^>]*>/g, ''),
      ...(payload.attachments && payload.attachments.length > 0 ? { attachments: payload.attachments } : {}),
    });

    console.log(`[SMTP] Email sent successfully to ${payload.to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error(`[SMTP] Failed to send email to ${payload.to}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 1. Sent to Breeder / Vendor when their onboarding application is received.
 */
export async function sendVendorWelcomeEmail(vendorEmail: string, vendorName: string) {
  const subject = `Welcome to Furora — Partner Application Received for ${vendorName}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background: #0f172a; padding: 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 22px; letter-spacing: 0.5px;">FURORA</h1>
        <p style="color: #94a3b8; margin: 4px 0 0; font-size: 13px;">Verified Ethical Breeder & Kennel Network</p>
      </div>
      <div style="padding: 32px 24px;">
        <h2 style="color: #1e293b; font-size: 18px; margin-top: 0;">Application Received, ${vendorName}!</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
          Thank you for applying to join Furora's verified breeder network. Your kennel details and compliance documents (KCI/AWBI registration, government ID, trade license, vet clinic tie-up, and bank proof) have been securely logged.
        </p>
        <div style="background: #f8fafc; border-left: 4px solid #3b82f6; padding: 14px 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
          <strong style="color: #1e293b; font-size: 13px;">What happens next?</strong>
          <p style="color: #64748b; font-size: 13px; margin: 4px 0 0;">
            Our compliance team verifies all AWBI codes and credentials within 24–48 hours. If any document requires clarification or renewal, you will receive an update email with a direct resubmission link.
          </p>
        </div>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
          Once verified, your dedicated Breeder Dashboard will be activated to list available pets and fulfill orders nationwide.
        </p>
      </div>
      <div style="background: #f1f5f9; padding: 16px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">
          Furora Partner Desk &bull; breeder@furora.in &bull; Chennai HQ
        </p>
      </div>
    </div>
  `;
  return sendEmail({ to: vendorEmail, subject, html });
}

export interface VendorApprovalEmailOptions {
  vendorEmail: string;
  vendorName: string;
  phone?: string | null;
  username?: string | null;
  tempPassword?: string | null;
  loginUrl?: string;
  attachmentBuffer?: Buffer;
  pdfPassword?: string;
}

/**
 * 2. Sent when Admin approves the Vendor's onboarding application.
 * Delivers the login portal link, username, and temporary password inside a password-protected file.
 */
export async function sendVendorApprovalEmail(
  optionsOrEmail: string | VendorApprovalEmailOptions,
  legacyName?: string
) {
  let vendorEmail: string;
  let vendorName: string;
  let phone: string | null = null;
  let username: string | null = null;
  let tempPassword: string | null = null;
  let loginUrl = 'https://breeder.furora.in/vendor';
  let attachmentBuffer: Buffer | undefined;
  let pdfPassword = '';

  if (typeof optionsOrEmail === 'string') {
    vendorEmail = optionsOrEmail;
    vendorName = legacyName || 'Verified Partner';
  } else {
    vendorEmail = optionsOrEmail.vendorEmail;
    vendorName = optionsOrEmail.vendorName;
    phone = optionsOrEmail.phone || null;
    username = optionsOrEmail.username || null;
    tempPassword = optionsOrEmail.tempPassword || null;
    if (optionsOrEmail.loginUrl) loginUrl = optionsOrEmail.loginUrl;
    attachmentBuffer = optionsOrEmail.attachmentBuffer;
    pdfPassword = optionsOrEmail.pdfPassword || phone?.replace(/[^0-9]/g, '').slice(-10) || '';
  }

  const subject = `Congratulations! Your Kennel Has Been Approved on Furora 🎉 [Access Credentials Attached]`;

  const safeFileName = `Furora_Breeder_Credentials_${vendorName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
      <!-- Header -->
      <div style="background: #0f172a; padding: 28px 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 1px;">FURORA</h1>
        <p style="color: #10b981; margin: 6px 0 0; font-size: 13px; font-weight: 700;">Verified Ethical Breeder & Kennel Partner Network</p>
      </div>

      <div style="padding: 36px 28px;">
        <!-- Status Badge -->
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="display: inline-block; background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; border-radius: 9999px; padding: 7px 20px; font-weight: 800; font-size: 13px; letter-spacing: 0.3px;">
            ✓ COMPLIANCE VERIFIED & APPROVED
          </span>
        </div>

        <h2 style="color: #0f172a; font-size: 20px; font-weight: 800; margin: 0 0 14px; text-align: center;">
          Welcome Aboard, ${vendorName}!
        </h2>

        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
          We are pleased to inform you that your kennel compliance documents, AWBI/KCI registration, and health certifications have been thoroughly verified and approved by the Furora Compliance Authority.
        </p>

        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
          Your dedicated <strong>Breeder Logistics & Inventory Portal</strong> is now active. You can now add your companion animals, upload high-resolution photos and videos, and receive orders directly from our verified customer network.
        </p>

        <!-- PASSWORD-PROTECTED CREDENTIAL FILE NOTICE -->
        <div style="background: #fffbeb; border: 1.5px solid #fde68a; border-radius: 14px; padding: 22px; margin: 0 0 26px;">
          <div style="display: flex; align-items: center; margin-bottom: 10px;">
            <span style="font-size: 16px; margin-right: 8px;">🔒</span>
            <strong style="color: #92400e; font-size: 14px; font-weight: 800;">
              Confidential Access Credentials Attached (Password Protected)
            </strong>
          </div>
          <p style="color: #78350f; font-size: 13px; line-height: 1.6; margin: 0 0 14px;">
            For your enterprise security, your confidential login link, username, and initial temporary password have been encrypted inside the attached PDF dossier: <strong style="color: #0f172a;">${safeFileName}</strong>.
          </p>

          <div style="background: #ffffff; border: 1px dashed #d97706; border-radius: 10px; padding: 14px 18px; margin-bottom: 12px;">
            <p style="color: #92400e; font-size: 12px; margin: 0 0 4px; font-weight: 600; text-transform: uppercase;">
              Password to Unlock the Attached PDF:
            </p>
            <p style="font-family: 'Courier New', Courier, monospace; font-size: 20px; font-weight: 800; color: #b45309; margin: 0;">
              ${pdfPassword || 'Your 10-digit registered mobile number'}
            </p>
            <p style="color: #94a3b8; font-size: 11px; margin: 4px 0 0;">
              (Enter your 10-digit mobile number without country code when prompted)
            </p>
          </div>

          <p style="color: #92400e; font-size: 12px; line-height: 1.5; margin: 0;">
            <strong>Security Reminder:</strong> Upon your first sign-in, please change your password using the "Change Password" button in your dashboard.
          </p>
        </div>

        <!-- Login Portal Call to Action -->
        <div style="text-align: center; margin: 28px 0;">
          <a href="${loginUrl}" style="background: #0f172a; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 800; font-size: 14px; display: inline-block; letter-spacing: 0.3px; box-shadow: 0 4px 12px rgba(15,23,42,0.15);">
            Open Breeder Logistics Portal &rarr;
          </a>
          <p style="color: #94a3b8; font-size: 11px; margin: 8px 0 0;">
            ${loginUrl}
          </p>
        </div>

        <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; text-align: left;">
          <p style="color: #64748b; font-size: 12px; line-height: 1.6; margin: 0;">
            If you require any assistance setting up your kennel inventory or accessing your account, reply directly to this email or reach us at <a href="mailto:breeder@furora.in" style="color: #3b82f6; font-weight: 600;">breeder@furora.in</a>.
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div style="background: #f8fafc; padding: 18px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="color: #94a3b8; font-size: 11px; margin: 0;">
          Furora Partner Network &bull; <a href="mailto:breeder@furora.in" style="color: #64748b; text-decoration: underline;">breeder@furora.in</a> &bull; Chennai HQ
        </p>
      </div>
    </div>
  `;

  const attachments = attachmentBuffer
    ? [
        {
          filename: safeFileName,
          content: attachmentBuffer,
          contentType: 'application/pdf',
        },
      ]
    : undefined;

  return sendEmail({
    to: vendorEmail,
    subject,
    html,
    attachments,
  });
}

/**
 * 3. Sent when Admin flags specific documents and requests vendor to update/resubmit.
 */
export async function sendVendorDocumentUpdateEmail(vendorEmail: string, vendorName: string, adminNotes: string) {
  const subject = `Action Required: Please Update Compliance Documents for ${vendorName}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background: #0f172a; padding: 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 22px; letter-spacing: 0.5px;">FURORA</h1>
        <p style="color: #f59e0b; margin: 4px 0 0; font-size: 13px; font-weight: bold;">Document Update Required</p>
      </div>
      <div style="padding: 32px 24px;">
        <h2 style="color: #1e293b; font-size: 18px; margin-top: 0;">Action Required on Your Application, ${vendorName}</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
          Our compliance team has reviewed your onboarding application. To complete verification and activate your breeder dashboard, please update the flagged document(s) below:
        </p>
        
        <div style="background: #fffbeb; border: 1px solid #fde68a; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <strong style="color: #92400e; font-size: 13px;">Admin Feedback & Required Updates:</strong>
          <p style="color: #78350f; font-size: 14px; margin: 8px 0 0; white-space: pre-wrap; line-height: 1.5;">${adminNotes}</p>
        </div>

        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
          You do not need to re-enter all details. Only the flagged documents are marked for re-upload. Click below to open your secure resubmission wizard:
        </p>

        <div style="text-align: center; margin: 28px 0;">
          <a href="https://furora.in/partner/onboard?email=${encodeURIComponent(vendorEmail)}" style="background: #f59e0b; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
            Update & Resubmit Documents &rarr;
          </a>
        </div>
      </div>
      <div style="background: #f1f5f9; padding: 16px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">
          Furora Compliance Team &bull; breeder@furora.in
        </p>
      </div>
    </div>
  `;
  return sendEmail({ to: vendorEmail, subject, html });
}
