// src/ai/generator/runGeneration.js

import { detectCategory } from '../classifier/detectCategory.js';
import { fetchCompletion } from '../../services/openai/client.js';
import { logger } from '../utils/logger.js';
import { shouldSkipProduct } from '../utils/shouldSkip.js';

/**
 * Orchestratorul principal: Procesează un produs de la A la Z
 */
export const runGeneration = async (product) => {
  // 1. Verificăm dacă produsul merită procesat
  if (shouldSkipProduct(product)) {
    return { status: 'skipped', id: product.id };
  }

  try {
    logger.step(`Procesare produs: ${product.title || 'Fără titlu'}`);

    // 2. Clasificăm produsul
    const category = await detectCategory(product);
    
    // 3. Construim promptul (în viitor va fi compus din module)
    const prompt = `
      Ești un expert în e-commerce pentru piața din Germania.
      Generează un titlu optimizat SEO și o descriere profesională pentru:
      ${product.title}
      
      Date brute: ${product.body_html || product.Description}
      
      Reguli:
      - Ton: Profesional, convingător.
      - Limba: Germană.
      - Nu folosi superlative nefondate.
      - Include specificații tehnice clare.
    `;

    // 4. Generăm conținutul
    const content = await fetchCompletion({
      messages: [{ role: 'user', content: prompt }],
      model: 'gpt-4o'
    });

    logger.success(`Generare completă pentru: ${product.title}`);

    return {
      status: 'success',
      category,
      content,
      rawTitle: product.title
    };

  } catch (error) {
    logger.error(`Eșec la procesarea produsului: ${product.title}`, error);
    return { status: 'error', error: error.message };
  }
};
