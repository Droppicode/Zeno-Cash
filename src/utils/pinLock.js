export const PIN_MIN = 4;
export const PIN_MAX = 6;
export const FREE_ATTEMPTS = 5;
export const RELOCK_AFTER_MS = 30 * 1000;

export const isValidPin = pin => new RegExp(`^\\d{${PIN_MIN},${PIN_MAX}}$`).test(String(pin ?? ''));

export const lockoutMs = (failures) => {
  if (failures < FREE_ATTEMPTS) return 0;
  return Math.min(30 * 1000 * 2 ** (failures - FREE_ATTEMPTS), 15 * 60 * 1000);
};

export const shouldRelock = ({ enabled, backgroundedAt, now = Date.now() }) => (
  Boolean(enabled) && backgroundedAt !== null && now - backgroundedAt >= RELOCK_AFTER_MS
);
