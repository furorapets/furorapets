/**
 * High-performance, sliding-window in-memory rate limiter for SaaS API endpoints.
 * Protects against brute-force credential stuffing, password cracking, and SMTP email exhaustion.
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const memoryStore = new Map<string, RateLimitRecord>();

// Periodic cleanup of expired rate limit buckets every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    memoryStore.forEach((record, key) => {
      if (now > record.resetTime) {
        memoryStore.delete(key);
      }
    });
  }, 5 * 60 * 1000).unref?.();
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const record = memoryStore.get(key);

  if (!record || now > record.resetTime) {
    const newRecord: RateLimitRecord = {
      count: 1,
      resetTime: now + windowMs,
    };
    memoryStore.set(key, newRecord);
    return {
      allowed: true,
      remaining: maxAttempts - 1,
      resetTime: newRecord.resetTime,
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    };
  }

  if (record.count >= maxAttempts) {
    const retryAfterSeconds = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
      retryAfterSeconds,
    };
  }

  record.count += 1;
  return {
    allowed: true,
    remaining: maxAttempts - record.count,
    resetTime: record.resetTime,
    retryAfterSeconds: Math.max(1, Math.ceil((record.resetTime - now) / 1000)),
  };
}

/**
 * Resets the rate limit bucket for a key (e.g. after a successful login).
 */
export function resetRateLimit(key: string): void {
  memoryStore.delete(key);
}

/**
 * Convenience helper for Login attempts:
 * Max 5 attempts per 5 minutes per IP/Identifier.
 */
export function checkLoginRateLimit(identifier: string): RateLimitResult {
  const key = `login:${identifier.toLowerCase().trim()}`;
  return checkRateLimit(key, 5, 5 * 60 * 1000);
}

/**
 * Convenience helper for OTP dispatch:
 * Max 3 OTP requests per 10 minutes per Email/IP.
 */
export function checkOtpRateLimit(identifier: string): RateLimitResult {
  const key = `otp:${identifier.toLowerCase().trim()}`;
  return checkRateLimit(key, 3, 10 * 60 * 1000);
}

/**
 * Convenience helper for public onboarding applications:
 * Max 10 submissions per hour per IP.
 */
export function checkPublicSubmissionRateLimit(ip: string): RateLimitResult {
  const key = `onboard:${ip.trim()}`;
  return checkRateLimit(key, 10, 60 * 60 * 1000);
}
