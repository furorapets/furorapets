import crypto from 'crypto';

const SALT_LENGTH = 16;
const KEY_LENGTH = 64;

/**
 * Hashes a plaintext password using Node.js crypto.scrypt with a unique random salt.
 * Output format: scrypt$<salt_hex>$<hash_hex>
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, KEY_LENGTH, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`scrypt$${salt}$${derivedKey.toString('hex')}`);
    });
  });
}

/**
 * Verifies a plaintext password against a stored password string.
 * Supports both modern scrypt hashes and legacy plaintext records (for zero-downtime migration).
 */
export async function verifyPassword(
  password: string,
  storedHashOrPlain: string | null | undefined
): Promise<{ valid: boolean; needsUpgrade: boolean }> {
  if (!storedHashOrPlain || !password) {
    return { valid: false, needsUpgrade: false };
  }

  // 1. Modern scrypt format: scrypt$<salt>$<hash>
  if (storedHashOrPlain.startsWith('scrypt$')) {
    const parts = storedHashOrPlain.split('$');
    if (parts.length !== 3) {
      return { valid: false, needsUpgrade: false };
    }
    const salt = parts[1];
    const originalHash = parts[2];

    return new Promise((resolve) => {
      crypto.scrypt(password, salt, KEY_LENGTH, (err, derivedKey) => {
        if (err) return resolve({ valid: false, needsUpgrade: false });

        const originalBuffer = Buffer.from(originalHash, 'hex');
        const isMatch =
          originalBuffer.length === derivedKey.length &&
          crypto.timingSafeEqual(originalBuffer, derivedKey);

        resolve({ valid: isMatch, needsUpgrade: false });
      });
    });
  }

  // 2. Legacy plaintext verification with zero-downtime upgrade flag
  const isPlainMatch = password === storedHashOrPlain || password.trim() === storedHashOrPlain.trim();
  return { valid: isPlainMatch, needsUpgrade: isPlainMatch };
}
