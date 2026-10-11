import { isValidPin, lockoutMs, shouldRelock, RELOCK_AFTER_MS } from '../src/utils/pinLock';

describe('pinLock', () => {
  it('accepts 4 to 6 digits only', () => {
    expect(isValidPin('1234')).toBe(true);
    expect(isValidPin('123456')).toBe(true);
    expect(isValidPin('123')).toBe(false);
    expect(isValidPin('1234567')).toBe(false);
    expect(isValidPin('12a4')).toBe(false);
    expect(isValidPin(undefined)).toBe(false);
  });

  it('backs off after the free attempts and caps the wait', () => {
    expect(lockoutMs(4)).toBe(0);
    expect(lockoutMs(5)).toBe(30000);
    expect(lockoutMs(6)).toBe(60000);
    expect(lockoutMs(20)).toBe(15 * 60 * 1000);
  });

  it('relocks only when enabled and away long enough', () => {
    const now = 1000000;
    expect(shouldRelock({ enabled: true, backgroundedAt: now - RELOCK_AFTER_MS, now })).toBe(true);
    expect(shouldRelock({ enabled: true, backgroundedAt: now - 5000, now })).toBe(false);
    expect(shouldRelock({ enabled: false, backgroundedAt: now - RELOCK_AFTER_MS, now })).toBe(false);
    expect(shouldRelock({ enabled: true, backgroundedAt: null, now })).toBe(false);
  });
});
