import QRCode from 'qrcode';

export async function generatePetQr(petId: string, baseUrl = 'http://localhost:3000'): Promise<{
  verificationUrl: string;
  qrCodeUrl: string;
}> {
  const verificationUrl = `${baseUrl}/pets/${petId}`;
  const qrCodeUrl = await QRCode.toDataURL(verificationUrl, {
    width: 320,
    margin: 2,
    color: {
      dark: '#0f172a', // Slate 900
      light: '#ffffff',
    },
    errorCorrectionLevel: 'M',
  });

  return {
    verificationUrl,
    qrCodeUrl,
  };
}
