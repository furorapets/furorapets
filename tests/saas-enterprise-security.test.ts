import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';
import { hashPassword, verifyPassword } from '../src/lib/password';
import { createSessionToken, verifySessionToken } from '../src/lib/auth';
import { checkRateLimit, resetRateLimit, checkLoginRateLimit, checkOtpRateLimit } from '../src/lib/rate-limiter';
import { POST as loginHandler } from '../src/app/api/auth/login/route';

describe('SaaS Enterprise Security Hardening & Zero-Trust Verification', () => {
  describe('Pillar 1: Complete Elimination of Prototype Persona Switchers', () => {
    it('verifies /api/auth/switch route file has been completely removed', () => {
      const switchRoutePath = path.join(process.cwd(), 'src/app/api/auth/switch/route.ts');
      expect(fs.existsSync(switchRoutePath)).toBe(false);
    });

    it('verifies PersonaSwitchModal component has been completely removed', () => {
      const modalPath = path.join(process.cwd(), 'src/components/persona-switch-modal.tsx');
      expect(fs.existsSync(modalPath)).toBe(false);
    });

    it('verifies /api/auth/me does not expose availableUsers directory', () => {
      const meRouteCode = fs.readFileSync(
        path.join(process.cwd(), 'src/app/api/auth/me/route.ts'),
        'utf8'
      );
      expect(meRouteCode).not.toContain('availableUsers');
      expect(meRouteCode).not.toContain('getAvailableUsers');
    });

    it('verifies DashboardSidebar no longer renders persona switch triggers', () => {
      const sidebarCode = fs.readFileSync(
        path.join(process.cwd(), 'src/components/dashboard-sidebar.tsx'),
        'utf8'
      );
      expect(sidebarCode).not.toContain('PersonaSwitchModal');
      expect(sidebarCode).not.toContain('onOpenSwitchModal');
      expect(sidebarCode).not.toContain('Sign In as Another User');
    });
  });

  describe('Pillar 2: Cryptographic Password Hashing (Node scrypt)', () => {
    it('hashes passwords using scrypt with unique random salt', async () => {
      const plain = 'FuroraSecure@2026';
      const hash1 = await hashPassword(plain);
      const hash2 = await hashPassword(plain);

      // Must start with scrypt prefix
      expect(hash1.startsWith('scrypt$')).toBe(true);
      expect(hash2.startsWith('scrypt$')).toBe(true);

      // Each hash must have a unique random salt
      expect(hash1).not.toBe(hash2);

      const parts1 = hash1.split('$');
      expect(parts1).toHaveLength(3);
      expect(parts1[1].length).toBe(32); // 16 bytes in hex = 32 chars
    });

    it('verifies valid password against modern scrypt hash', async () => {
      const plain = 'SecretAdminPass!123';
      const hash = await hashPassword(plain);

      const result = await verifyPassword(plain, hash);
      expect(result.valid).toBe(true);
      expect(result.needsUpgrade).toBe(false);
    });

    it('rejects invalid password against modern scrypt hash', async () => {
      const hash = await hashPassword('CorrectPass123');
      const result = await verifyPassword('WrongPass456', hash);
      expect(result.valid).toBe(false);
      expect(result.needsUpgrade).toBe(false);
    });

    it('seamlessly validates legacy plaintext and signals needsUpgrade', async () => {
      const legacyPlain = 'ganesan1234..';
      const result = await verifyPassword('ganesan1234..', legacyPlain);
      expect(result.valid).toBe(true);
      expect(result.needsUpgrade).toBe(true);

      const wrongPlain = await verifyPassword('wrongpassword', legacyPlain);
      expect(wrongPlain.valid).toBe(false);
      expect(wrongPlain.needsUpgrade).toBe(false);
    });
  });

  describe('Pillar 3: Cryptographic HMAC Session Tokens', () => {
    it('generates a valid signed session token', () => {
      const token = createSessionToken({ id: 'usr_admin', role: 'ADMIN' });
      expect(token).toBeDefined();
      expect(token).toContain('.');

      const payload = verifySessionToken(token);
      expect(payload).not.toBeNull();
      expect(payload?.userId).toBe('usr_admin');
      expect(payload?.role).toBe('ADMIN');
      expect(payload?.exp).toBeGreaterThan(Date.now());
    });

    it('rejects tampered session token payload', () => {
      const token = createSessionToken({ id: 'usr_agent_delivery', role: 'DELIVERY_AGENT' });
      const [payloadStr, signature] = token.split('.');

      // Attacker tampers payload to escalate privileges to ADMIN
      const parsed = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf8'));
      parsed.role = 'ADMIN';
      const forgedPayloadStr = Buffer.from(JSON.stringify(parsed)).toString('base64url');
      const forgedToken = `${forgedPayloadStr}.${signature}`;

      const verified = verifySessionToken(forgedToken);
      expect(verified).toBeNull();
    });

    it('rejects tampered signature', () => {
      const token = createSessionToken({ id: 'usr_admin', role: 'ADMIN' });
      const [payloadStr] = token.split('.');
      const bogusToken = `${payloadStr}.invalid_bogus_signature_abc123`;

      const verified = verifySessionToken(bogusToken);
      expect(verified).toBeNull();
    });

    it('rejects null, undefined, or empty token inputs', () => {
      expect(verifySessionToken(null)).toBeNull();
      expect(verifySessionToken('')).toBeNull();
      expect(verifySessionToken('no-dot-format')).toBeNull();
    });
  });

  describe('Pillar 4: Sliding-Window Rate Limiting', () => {
    const testKey = 'test_ip_192.168.1.100';

    beforeEach(() => {
      resetRateLimit(testKey);
      resetRateLimit(`login:test_login_user`);
      resetRateLimit(`otp:test_otp@furora.com`);
    });

    it('permits requests within maximum limit and tracks remaining attempts', () => {
      const r1 = checkRateLimit(testKey, 3, 60000);
      expect(r1.allowed).toBe(true);
      expect(r1.remaining).toBe(2);

      const r2 = checkRateLimit(testKey, 3, 60000);
      expect(r2.allowed).toBe(true);
      expect(r2.remaining).toBe(1);

      const r3 = checkRateLimit(testKey, 3, 60000);
      expect(r3.allowed).toBe(true);
      expect(r3.remaining).toBe(0);

      // 4th request exceeds threshold
      const r4 = checkRateLimit(testKey, 3, 60000);
      expect(r4.allowed).toBe(false);
      expect(r4.remaining).toBe(0);
      expect(r4.retryAfterSeconds).toBeGreaterThan(0);
    });

    it('resets rate limit on demand', () => {
      checkRateLimit(testKey, 1, 60000);
      const blocked = checkRateLimit(testKey, 1, 60000);
      expect(blocked.allowed).toBe(false);

      resetRateLimit(testKey);

      const allowedAgain = checkRateLimit(testKey, 1, 60000);
      expect(allowedAgain.allowed).toBe(true);
    });

    it('enforces login specific limits (max 5 attempts)', () => {
      const id = 'test_login_user';
      for (let i = 0; i < 5; i++) {
        expect(checkLoginRateLimit(id).allowed).toBe(true);
      }
      expect(checkLoginRateLimit(id).allowed).toBe(false);
    });

    it('enforces OTP specific limits (max 3 requests)', () => {
      const email = 'test_otp@furora.com';
      for (let i = 0; i < 3; i++) {
        expect(checkOtpRateLimit(email).allowed).toBe(true);
      }
      expect(checkOtpRateLimit(email).allowed).toBe(false);
    });
  });

  describe('Pillar 5: OWASP Standard Security Headers in Next.js Config', () => {
    it('verifies next.config.js specifies OWASP headers', () => {
      const configCode = fs.readFileSync(path.join(process.cwd(), 'next.config.js'), 'utf8');
      expect(configCode).toContain('X-Frame-Options');
      expect(configCode).toContain('DENY');
      expect(configCode).toContain('X-Content-Type-Options');
      expect(configCode).toContain('nosniff');
      expect(configCode).toContain('Referrer-Policy');
      expect(configCode).toContain('Strict-Transport-Security');
    });
  });

  describe('Pillar 6: End-to-End Authentication Route Hardening', () => {
    it('authenticates valid credentials, returns user details and signed session cookie', async () => {
      resetRateLimit('ganesan:unknown');
      const req = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: 'ganesan',
          password: 'ganesan1234..',
        }),
      });

      const res = await loginHandler(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.user.role).toBe('ADMIN');
      expect(data.redirectTo).toBe('/admin');

      // Verify signed cookie
      const sessionCookie = res.cookies.get('furora_session');
      expect(sessionCookie).toBeDefined();
      expect(sessionCookie?.httpOnly).toBe(true);

      const verified = verifySessionToken(sessionCookie?.value);
      expect(verified).not.toBeNull();
      expect(verified?.role).toBe('ADMIN');
    });

    it('rejects invalid password with 401 and generic security message', async () => {
      resetRateLimit('invalid_user_test:unknown');
      const req = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: 'ganesan',
          password: 'wrong_password_attempt',
        }),
      });

      const res = await loginHandler(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid username, email, or password.');
    });

    it('blocks rapid brute-force attacks with HTTP 429 Too Many Requests', async () => {
      const attackerId = 'brute_force_target';
      resetRateLimit(`${attackerId}:unknown`);

      for (let i = 0; i < 5; i++) {
        const req = new NextRequest('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier: attackerId,
            password: `attempt_${i}`,
          }),
        });
        await loginHandler(req);
      }

      // 6th attempt should be blocked by sliding window rate limiter
      const blockedReq = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: attackerId,
          password: 'blocked_attempt',
        }),
      });

      const blockedRes = await loginHandler(blockedReq);
      expect(blockedRes.status).toBe(429);
      const data = await blockedRes.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Too many login attempts');
      expect(blockedRes.headers.get('Retry-After')).toBeDefined();
    });
  });
});
