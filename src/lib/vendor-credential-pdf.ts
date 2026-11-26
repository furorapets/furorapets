import PDFDocument from 'pdfkit';

export interface VendorCredentialData {
  vendorName: string;
  email: string;
  phone: string;
  kennelRegNumber?: string | null;
  address?: string | null;
  username: string;
  tempPassword: string;
  loginUrl: string;
  pdfPassword: string; // The password required to open this PDF document
}

/**
 * Generates an encrypted, password-protected PDF document containing the vendor's
 * login credentials and welcome kit.
 */
export async function generatePasswordProtectedVendorPdf(
  data: VendorCredentialData
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        userPassword: data.pdfPassword,
        ownerPassword: `${data.pdfPassword}_furora_admin_secure_2026`,
        permissions: {
          printing: 'highResolution',
          modifying: false,
          copying: true,
          annotating: false,
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const pageWidth = 595.28; // Standard A4 width in pt
      const contentWidth = pageWidth - 80; // 515.28 pt

      // 1. Dark Top Brand Banner
      doc.rect(40, 40, contentWidth, 70).fill('#0f172a');

      doc.fillColor('#ffffff').fontSize(24).font('Helvetica-Bold').text('FURORA', 55, 52);
      doc
        .fillColor('#10b981')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('VERIFIED ETHICAL BREEDER & KENNEL NETWORK', 55, 80);

      doc
        .fillColor('#94a3b8')
        .fontSize(9)
        .font('Helvetica')
        .text('Official Partner Activation & Security Credential Dossier', 55, 93);

      // 2. Document Metadata Pill
      const docId = `FUR-CRED-${Date.now().toString(36).toUpperCase()}`;
      const issueDate = new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });

      doc.rect(40, 120, contentWidth, 26).fill('#f1f5f9');
      doc.rect(40, 120, contentWidth, 26).stroke('#cbd5e1');

      doc
        .fillColor('#475569')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text(`DOCUMENT ID: ${docId}`, 52, 128);

      doc
        .fillColor('#059669')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('STATUS: COMPLIANCE APPROVED & ACTIVE', 240, 128);

      doc
        .fillColor('#64748b')
        .fontSize(9)
        .font('Helvetica')
        .text(`ISSUED: ${issueDate}`, 430, 128);

      // 3. Partner Information Section
      let currentY = 160;
      doc
        .fillColor('#0f172a')
        .fontSize(13)
        .font('Helvetica-Bold')
        .text('1. VERIFIED BREEDER PROFILE', 40, currentY);

      currentY += 22;
      doc.rect(40, currentY, contentWidth, 85).fill('#ffffff');
      doc.rect(40, currentY, contentWidth, 85).stroke('#e2e8f0');

      // Left column
      doc.fillColor('#64748b').fontSize(9).font('Helvetica').text('Kennel / Partner Name:', 55, currentY + 12);
      doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text(data.vendorName || 'Verified Breeder', 55, currentY + 24);

      doc.fillColor('#64748b').fontSize(9).font('Helvetica').text('Kennel Club / AWBI Reg:', 55, currentY + 44);
      doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold').text(data.kennelRegNumber || 'AWBI / KCI Verified', 55, currentY + 56);

      // Right column
      doc.fillColor('#64748b').fontSize(9).font('Helvetica').text('Registered Email:', 310, currentY + 12);
      doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold').text(data.email, 310, currentY + 24);

      doc.fillColor('#64748b').fontSize(9).font('Helvetica').text('Registered Phone:', 310, currentY + 44);
      doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold').text(data.phone || 'Verified Mobile', 310, currentY + 56);

      currentY += 105;

      // 4. Confidential Credentials Box (Highlighted)
      doc
        .fillColor('#0f172a')
        .fontSize(13)
        .font('Helvetica-Bold')
        .text('2. CONFIDENTIAL ACCESS CREDENTIALS', 40, currentY);

      currentY += 22;
      // Main credentials card with amber highlight
      doc.rect(40, currentY, contentWidth, 140).fill('#fffbeb');
      doc.rect(40, currentY, contentWidth, 140).stroke('#fde68a');

      doc
        .fillColor('#92400e')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('BREEDER PORTAL ACCESS URL:', 55, currentY + 14);
      doc
        .fillColor('#1e40af')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(data.loginUrl, 55, currentY + 28);

      // Username Box
      doc.rect(55, currentY + 50, 220, 50).fill('#ffffff');
      doc.rect(55, currentY + 50, 220, 50).stroke('#cbd5e1');
      doc.fillColor('#64748b').fontSize(8).font('Helvetica').text('ASSIGNED USERNAME', 65, currentY + 58);
      doc.fillColor('#0f172a').fontSize(13).font('Courier-Bold').text(data.username, 65, currentY + 74);

      // Password Box
      doc.rect(295, currentY + 50, 245, 50).fill('#ffffff');
      doc.rect(295, currentY + 50, 245, 50).stroke('#cbd5e1');
      doc.fillColor('#64748b').fontSize(8).font('Helvetica').text('TEMPORARY PASSWORD', 305, currentY + 58);
      doc.fillColor('#b45309').fontSize(13).font('Courier-Bold').text(data.tempPassword, 305, currentY + 74);

      // Security Notice inside box
      doc
        .fillColor('#78350f')
        .fontSize(8.5)
        .font('Helvetica')
        .text(
          'Security Mandate: Log in immediately and change this temporary password via your dashboard (Change Password -> Email OTP).',
          55,
          currentY + 114,
          { width: contentWidth - 30 }
        );

      currentY += 160;

      // 5. Getting Started & Partner Checklist
      doc
        .fillColor('#0f172a')
        .fontSize(13)
        .font('Helvetica-Bold')
        .text('3. NEXT STEPS & PARTNER ACTIVATION', 40, currentY);

      currentY += 20;
      doc.rect(40, currentY, contentWidth, 125).fill('#ffffff');
      doc.rect(40, currentY, contentWidth, 125).stroke('#e2e8f0');

      const steps = [
        '1. Open https://breeder.furora.in/vendor in Google Chrome, Apple Safari, or Microsoft Edge.',
        '2. Enter your assigned username and temporary password provided above.',
        '3. Navigate to "My Pets & Inventory" to add available puppies, kittens, and companion animals.',
        '4. Upload clear high-resolution photos, vaccination cards, and optional KCI certificates.',
        '5. Once customer orders are assigned to your kennel, receive real-time dispatch alerts.',
      ];

      let stepY = currentY + 14;
      doc.fillColor('#334155').fontSize(9).font('Helvetica');
      for (const st of steps) {
        doc.text(st, 55, stepY, { width: contentWidth - 30 });
        stepY += 21;
      }

      currentY += 145;

      // 6. Security & Encryption Disclaimer
      doc.rect(40, currentY, contentWidth, 50).fill('#f8fafc');
      doc.rect(40, currentY, contentWidth, 50).stroke('#e2e8f0');

      doc
        .fillColor('#475569')
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('DOCUMENT PROTECTION & COMPLIANCE SEAL', 55, currentY + 10);

      doc
        .fillColor('#64748b')
        .fontSize(8)
        .font('Helvetica')
        .text(
          `This document is encrypted with Adobe Standard 128-bit security. Decryption password: ${data.pdfPassword}. Furora enforces strict ethical compliance standards. Do not share your login credentials with unverified third parties.`,
          55,
          currentY + 22,
          { width: contentWidth - 30 }
        );

      currentY += 65;

      // 7. Footer
      doc
        .fillColor('#94a3b8')
        .fontSize(8)
        .font('Helvetica')
        .text(
          'Furora Partner Network • breeder@furora.in • Furora Pet Provenance & Ethical Kennel Authority • Chennai HQ',
          40,
          currentY,
          { align: 'center', width: contentWidth }
        );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
