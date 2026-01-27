/**
 * Production-safe logging utility
 * Only logs in development mode to keep production builds clean
 */

const isDev = typeof process !== 'undefined' 
  ? process.env.NODE_ENV === 'development' 
  : (import.meta.env?.DEV ?? false);

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    // Errors should always be logged, even in production
    console.error(...args);
  },
  debug: (...args: unknown[]) => {
    if (isDev) console.debug(...args);
  },
  info: (...args: unknown[]) => {
    if (isDev) console.info(...args);
  },
};
