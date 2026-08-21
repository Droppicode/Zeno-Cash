export const Logger = {
  error: (context, error) => {
    if (__DEV__) console.error(`[ERROR] ${context}:`, error);
  },
  warn: (context, msg) => {
    if (__DEV__) console.warn(`[WARN] ${context}:`, msg);
  },
  info: (context, msg) => {
    if (__DEV__) console.log(`[INFO] ${context}:`, msg);
  }
};
