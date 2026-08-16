export const Logger = {
  error: (context, error) => {
    console.error(`[ERROR] ${context}:`, error);
  },
  warn: (context, msg) => {
    console.warn(`[WARN] ${context}:`, msg);
  },
  info: (context, msg) => {
    console.log(`[INFO] ${context}:`, msg);
  }
};
