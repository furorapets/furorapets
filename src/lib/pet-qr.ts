import QRCode from 'qrcode';

export function resolveBaseUrl(explicitUrl?: string): string {
  // If an explicit non-localhost URL is provided, use it
  if (explicitUrl && !explicitUrl.includes('localhost')) {
    return explicitUrl.replace(/\/$/, '');
  }

  // Next.js public app URL
  if (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('localhost')) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  }

  // Vercel deployment URLs
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`.replace(/\/$/, '');
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/$/, '');
  }

  // In browser context
  if (typeof window !== 'undefined' && window.location?.origin && !window.location.origin.includes('localhost')) {
    return window.location.origin.replace(/\/$/, '');
  }

  // In local development environment
  if (explicitUrl && process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    return explicitUrl.replace(/\/$/, '');
  }

  // Default production domain
  return 'https://breeder.furora.in';
}

export async function generatePetQr(petId: string, baseUrl?: string): Promise<{
  verificationUrl: string;
  qrCodeUrl: string;
}> {
  const rootUrl = resolveBaseUrl(baseUrl);
  const verificationUrl = `${rootUrl}/pets/${petId}`;
  const qrCodeUrl = await QRCode.toDataURL(verificationUrl, {
    width: 360,
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
