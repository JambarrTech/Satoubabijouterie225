import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

function generateToken(userId: string, role: string): string {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '7d' });
}

function verifyToken(token: string): { userId: string; role: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
  } catch {
    return null;
  }
}

describe('JWT Token', () => {
  it('generates a valid token', () => {
    const token = generateToken('user-1', 'CUSTOMER');
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
  });

  it('verifies a valid token', () => {
    const token = generateToken('user-1', 'ADMIN');
    const decoded = verifyToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded!.userId).toBe('user-1');
    expect(decoded!.role).toBe('ADMIN');
  });

  it('rejects an invalid token', () => {
    const decoded = verifyToken('invalid-token');
    expect(decoded).toBeNull();
  });

  it('rejects a token with wrong secret', () => {
    const token = jwt.sign({ userId: 'x', role: 'x' }, 'wrong-secret');
    const decoded = verifyToken(token);
    expect(decoded).toBeNull();
  });

  it('includes correct role in token', () => {
    const roles = ['CUSTOMER', 'ADMIN', 'ARTISAN'];
    for (const role of roles) {
      const token = generateToken('u1', role);
      const decoded = verifyToken(token);
      expect(decoded!.role).toBe(role);
    }
  });
});
