import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { generateToken } from '../middleware/auth';

const TEST_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-vitest-only';

// Teste le vrai generateToken (expiry 15m via config) au lieu d'un doublon local en 7d.
describe('JWT Token', () => {
  it('generates a valid token', () => {
    const token = generateToken('user-1', 'CUSTOMER');
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
  });

  it('verifies a valid token', () => {
    const token = generateToken('user-1', 'ADMIN');
    const decoded = jwt.verify(token, TEST_SECRET) as any;
    expect(decoded.userId).toBe('user-1');
    expect(decoded.role).toBe('ADMIN');
  });

  it('rejects an invalid token', () => {
    expect(() => jwt.verify('invalid-token', TEST_SECRET)).toThrow();
  });

  it('rejects a token signed with a wrong secret', () => {
    const token = jwt.sign({ userId: 'x', role: 'x' }, 'wrong-secret');
    expect(() => jwt.verify(token, TEST_SECRET)).toThrow();
  });

  it('includes correct role in token', () => {
    const roles = ['CUSTOMER', 'ADMIN', 'ARTISAN'];
    for (const role of roles) {
      const token = generateToken('u1', role);
      const decoded = jwt.verify(token, TEST_SECRET) as any;
      expect(decoded.role).toBe(role);
    }
  });
});
