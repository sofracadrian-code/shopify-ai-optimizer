// src/ai/utils/logger.js

/**
 * Un sistem simplu de logging pentru a uniformiza output-ul în consola Vercel/Terminal
 * Pe viitor, poate fi conectat la servicii externe (ex: Datadog, Sentry)
 */
export const logger = {
  info: (message, ...args) => {
    console.log(`[INFO] 🔵 ${message}`, ...args);
  },
  success: (message, ...args) => {
    console.log(`[SUCCESS] ✅ ${message}`, ...args);
  },
  warn: (message, ...args) => {
    console.warn(`[WARN] ⚠️ ${message}`, ...args);
  },
  error: (message, ...args) => {
    console.error(`[ERROR] ❌ ${message}`, ...args);
  },
  step: (stepName) => {
    console.log(`\n--- ⚙️ EXECUȚIE: ${stepName} ---`);
  }
};
