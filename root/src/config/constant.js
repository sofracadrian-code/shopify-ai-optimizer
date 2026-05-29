// src/config/constants.js

export const AI_MODELS = {
  PRIMARY: 'gpt-4o',          // Modelul principal pentru task-uri complexe
  FALLBACK: 'gpt-4-turbo',    // Model de rezervă
  FAST: 'gpt-3.5-turbo'       // Pentru task-uri simple și rapide (ex: detectare limbă)
};

export const PLATFORM_LIMITS = {
  // Limite Google Merchant Center
  GMC: {
    MAX_TITLE_LENGTH: 150,
    MAX_DESC_LENGTH: 5000,
  },
  // Limite SEO & Shopify
  SEO: {
    MAX_META_TITLE: 60,
    MAX_META_DESC: 160,
    MAX_HANDLE_LENGTH: 255
  }
};

export const SYSTEM_SETTINGS = {
  MAX_RETRIES: 3,             // De câte ori va încerca OpenAI dacă pică rețeaua
  DEFAULT_LANGUAGE: 'de',     // Setat nativ pentru piața germană
  MIN_CONFIDENCE_SCORE: 90    // Pragul de încredere pentru validări viitoare
};
