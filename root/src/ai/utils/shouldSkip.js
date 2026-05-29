// src/ai/utils/shouldSkip.js

import { logger } from './logger.js';

/**
 * Evaluează dacă un produs are suficiente date brute pentru a merita procesarea AI.
 * Astfel salvăm tokeni și bani pe produse goale sau invalide.
 * * @param {Object} rawProduct - Datele brute ale produsului din Shopify/CSV
 * @returns {boolean} - True dacă produsul trebuie sărit
 */
export const shouldSkipProduct = (rawProduct) => {
  if (!rawProduct) {
    logger.warn('Produs nedefinit. Se sare peste.');
    return true;
  }

  // Verificăm dacă lipsește un titlu de bază sau o descriere minimă
  const title = rawProduct.title || rawProduct.Name || '';
  const description = rawProduct.body_html || rawProduct.Description || '';

  if (title.trim().length < 2) {
    logger.warn(`Titlu prea scurt sau inexistent pentru ID-ul: ${rawProduct.id || 'Necunoscut'}. Se sare peste.`);
    return true;
  }

  if (description.trim().length < 10) {
    // Dacă nu avem măcar 10 caractere în descrierea brută, AI-ul va halucina specificații
    logger.warn(`Descriere brută insuficientă pentru produsul: ${title}. Se sare peste.`);
    return true;
  }

  return false; // Produsul este valid pentru procesare
};
