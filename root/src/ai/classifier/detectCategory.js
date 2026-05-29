// src/ai/classifier/detectCategory.js

import { fetchCompletion } from '../../services/openai/client.js';
import { logger } from '../utils/logger.js';

export const detectCategory = async (product) => {
  const prompt = `
    Analizează următorul produs și decide în ce categorie se încadrează din lista: 
    ELECTRONICS, HOME, MOBILITY.
    
    Produs: ${product.title || product.Name}
    Descriere: ${product.body_html || product.Description}
    
    Răspunde DOAR cu numele categoriei.
  `;

  try {
    const category = await fetchCompletion({
      messages: [{ role: 'user', content: prompt }],
      model: 'gpt-4o'
    });
    
    logger.info(`Produsul "${product.title}" clasificat ca: ${category}`);
    return category;
  } catch (error) {
    logger.error('Eroare la detectarea categoriei:', error);
    return 'DEFAULT'; // Fallback dacă AI-ul nu poate decide
  }
};
