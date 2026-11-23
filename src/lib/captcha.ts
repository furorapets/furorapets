import crypto from 'crypto';

const SECRET = process.env.SESSION_SECRET || 'furora_secure_captcha_secret_2026';
const CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const PALETTE = ['#0f172a', '#1e3a8a', '#b45309', '#047857', '#7c2d12', '#4338ca'];

export interface CaptchaResult {
  svg: string;
  token: string;
}

export function generateCaptcha(): CaptchaResult {
  let text = '';
  for (let i = 0; i < 5; i++) {
    text += CHARS[crypto.randomInt(CHARS.length)];
  }

  // Draw 3 random bezier curves for noise
  let curves = '';
  for (let i = 0; i < 3; i++) {
    const x1 = crypto.randomInt(0, 30);
    const y1 = crypto.randomInt(5, 38);
    const x2 = crypto.randomInt(100, 130);
    const y2 = crypto.randomInt(5, 38);
    const cx = crypto.randomInt(30, 100);
    const cy = crypto.randomInt(5, 38);
    const stroke = PALETTE[i % PALETTE.length];
    curves += `<path d="M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}" stroke="${stroke}" stroke-width="1.2" fill="none" opacity="0.3" />`;
  }

  // Draw 12 scatter dots
  let dots = '';
  for (let i = 0; i < 12; i++) {
    const dx = crypto.randomInt(5, 125);
    const dy = crypto.randomInt(5, 37);
    const r = (crypto.randomInt(10, 25) / 10).toFixed(1);
    const color = PALETTE[i % PALETTE.length];
    dots += `<circle cx="${dx}" cy="${dy}" r="${r}" fill="${color}" opacity="0.25" />`;
  }

  // Render text characters with slight rotation
  let textSvg = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const x = 16 + i * 22;
    const y = 28 + crypto.randomInt(-2, 3);
    const rot = crypto.randomInt(-12, 13);
    const color = PALETTE[crypto.randomInt(PALETTE.length)];
    textSvg += `<text x="${x}" y="${y}" font-family="Courier, 'Courier New', monospace" font-size="22" font-weight="900" fill="${color}" transform="rotate(${rot}, ${x}, ${y})">${char}</text>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="130" height="42" viewBox="0 0 130 42" class="rounded-xl select-none"><rect width="100%" height="100%" fill="#f8fafc" rx="8" stroke="#e2e8f0" stroke-width="1"/>${curves}${dots}${textSvg}</svg>`;

  // Create HMAC token (valid for 10 minutes)
  const payload = {
    hash: crypto.createHmac('sha256', SECRET).update(text.toUpperCase()).digest('hex'),
    exp: Date.now() + 10 * 60 * 1000,
    nonce: crypto.randomBytes(6).toString('hex'),
  };
  const str = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(str).digest('base64url');
  const token = `${str}.${sig}`;

  return { svg, token };
}

export function verifyCaptcha(token: string, userInput: string): { valid: boolean; error?: string } {
  if (!token || !token.includes('.')) {
    return { valid: false, error: 'Missing or malformed captcha token' };
  }
  if (!userInput || !userInput.trim()) {
    return { valid: false, error: 'Please enter the captcha code' };
  }

  const [str, sig] = token.split('.');
  const expectedSig = crypto.createHmac('sha256', SECRET).update(str).digest('base64url');
  if (sig !== expectedSig) {
    return { valid: false, error: 'Invalid captcha verification signature' };
  }

  try {
    const payload = JSON.parse(Buffer.from(str, 'base64url').toString('utf8'));
    if (Date.now() > payload.exp) {
      return { valid: false, error: 'Captcha expired. Please refresh and try again.' };
    }

    const userHash = crypto.createHmac('sha256', SECRET).update(userInput.trim().toUpperCase()).digest('hex');
    if (userHash !== payload.hash) {
      return { valid: false, error: 'Incorrect captcha code. Please try again.' };
    }

    return { valid: true };
  } catch (err: any) {
    return { valid: false, error: 'Failed to verify captcha' };
  }
}
