import nodemailer from 'nodemailer';

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
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

/**
 * 2. Sent when Admin approves the Vendor's onboarding application.
 */
export async function sendVendorApprovalEmail(vendorEmail: string, vendorName: string) {
  const subject = `Congratulations! Your Kennel Has Been Approved on Furora 🎉`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background: #0f172a; padding: 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 22px; letter-spacing: 0.5px;">FURORA</h1>
        <p style="color: #10b981; margin: 4px 0 0; font-size: 13px; font-weight: bold;">Verified Breeder Partner</p>
      </div>
      <div style="padding: 32px 24px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <span style="display: inline-block; background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; border-radius: 9999px; padding: 6px 16px; font-weight: bold; font-size: 13px;">
            ✓ Compliance Verified & Approved
          </span>
        </div>
        <h2 style="color: #1e293b; font-size: 18px; margin-top: 0; text-align: center;">Welcome Aboard, ${vendorName}!</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
          We are pleased to inform you that your kennel compliance documents and registration have been thoroughly verified and approved by the Furora Admin Team.
        </p>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
          Your dedicated <strong>Vendor Portal</strong> is now active. You can now add your live pet inventory, upload high-res photos and videos, and receive customer assignments directly.
        </p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="https://furora.in/vendor/pets" style="background: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
            Open Vendor Dashboard &rarr;
          </a>
        </div>
        <p style="color: #64748b; font-size: 13px;">
          If you have any questions or require assistance setting up your kennel profile, reply directly to this email.
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
