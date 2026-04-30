import { hashPassword, verifyPassword } from '../password.js';

/**
 * Credentials-based authentication provider (username/password).
 *
 * @param {object} options
 * @param {Function} options.findUser - (identifier) => user object or null
 * @param {Function} [options.getPasswordHash] - (user) => stored hash string
 */
export function credentialsProvider(options) {
  const {
    findUser,
    getPasswordHash = (user) => user.passwordHash ?? user.password_hash,
  } = options;

  return {
    type: 'credentials',

    async authenticate(identifier, password) {
      const user = await findUser(identifier);
      if (!user) return { success: false, error: 'Invalid credentials' };

      const hash = getPasswordHash(user);
      if (!hash) return { success: false, error: 'Invalid credentials' };

      const valid = await verifyPassword(password, hash);
      if (!valid) return { success: false, error: 'Invalid credentials' };

      // Return user without password hash
      const { passwordHash: _passwordHash, password_hash: _password_hash, ...safeUser } = user;
      return { success: true, user: safeUser };
    },

    async register(userData, password) {
      const hash = await hashPassword(password);
      return { ...userData, passwordHash: hash };
    },
  };
}
