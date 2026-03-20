import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

/**
 * Hash a password using scrypt (Node.js built-in, no external deps).
 * Returns a string in the format: algorithm:salt:hash
 */
export async function hashPassword(password, options = {}) {
  const {
    saltLength = 32,
    keyLength = 64,
    cost = 16384, // N
    blockSize = 8, // r
    parallelism = 1, // p
  } = options;

  const salt = randomBytes(saltLength);

  const hash = await new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, { N: cost, r: blockSize, p: parallelism }, (err, derived) => {
      if (err) reject(err);
      else resolve(derived);
    });
  });

  return `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`;
}

/**
 * Verify a password against a hash.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export async function verifyPassword(password, stored) {
  const parts = stored.split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    throw new Error('Invalid hash format. Expected scrypt:salt:hash');
  }

  const [, saltHex, hashHex] = parts;
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');

  const derived = await new Promise((resolve, reject) => {
    scrypt(password, salt, expected.length, { N: 16384, r: 8, p: 1 }, (err, derived) => {
      if (err) reject(err);
      else resolve(derived);
    });
  });

  return timingSafeEqual(derived, expected);
}
