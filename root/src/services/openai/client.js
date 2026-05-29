// src/services/openai/client.js

import { ENV } from '../../config/env.js';
import { SYSTEM_SETTINGS } from '../../config/constants.js';
import { logger } from '../../ai/utils/logger.js';
// Notă: Dacă folosești pachetul oficial 'openai', asigură-te că rulezi: npm install openai
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: ENV.OPENAI_API_KEY,
});

/**
 * Execută un apel către OpenAI cu mecanism de retry inclus
 * @param {Object} params - Parametrii pentru modelul AI (messages, model, temperature etc.)
 * @param {number} attempt - Încercarea curentă (folosit intern pentru recursivitate)
 * @returns {Promise<string>} - Răspunsul text generat de AI
 */
export const fetchCompletion = async (params, attempt = 1) => {
  try {
    const response = await openai.chat.completions.create({
      temperature: 0.2, // Temperatură joasă pentru output predictibil/ enterprise
      ...params,
    });

    return response.choices[0].message.content.trim();

  } catch (error) {
    logger.error(`Eroare OpenAI (Încercarea ${attempt}/${SYSTEM_SETTINGS.MAX_RETRIES}):`, error.message);

    if (attempt < SYSTEM_SETTINGS.MAX_RETRIES) {
      const delay = attempt * 1500; // Exponential backoff: 1.5s, 3s, 4.5s
      logger.info(`Se reîncearcă în ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchCompletion(params, attempt + 1);
    }

    throw new Error('Eșec critic la generarea OpenAI după multiple încercări.');
  }
};
