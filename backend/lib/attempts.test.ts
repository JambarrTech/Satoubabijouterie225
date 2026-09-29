import { describe, it, expect } from 'vitest';
import { clearAttempts, countAttempt } from './attempts';

// Sans UPSTASH configuré en test, exerce le fallback mémoire.
describe('countAttempt', () => {
  it('compte 1, 2, 3 dans la fenêtre', async () => {
    const key = `test-${Date.now()}`;
    expect(await countAttempt(key, 60_000)).toBe(1);
    expect(await countAttempt(key, 60_000)).toBe(2);
    expect(await countAttempt(key, 60_000)).toBe(3);
    await clearAttempts(key);
  });

  it('clearAttempts remet à 1', async () => {
    const key = `test-clear-${Date.now()}`;
    expect(await countAttempt(key, 60_000)).toBe(1);
    expect(await countAttempt(key, 60_000)).toBe(2);
    await clearAttempts(key);
    expect(await countAttempt(key, 60_000)).toBe(1);
    await clearAttempts(key);
  });
});
