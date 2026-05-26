// main.js
import { shouldSkipProduct } from './utils/shouldSkip.js';
import { SHOPIFY_ELECTRONICS_PROMPT, SHOPIFY_MOBILITY_PROMPT,
         SHOPIFY_FASHION_PROMPT, SHOPIFY_HOME_PROMPT,
         SHOPIFY_TOOLS_PROMPT, SHOPIFY_DEFAULT_PROMPT } from './shopify/index.js';
import { GMC_ELECTRONICS_PROMPT, GMC_MOBILITY_PROMPT,
         GMC_FASHION_PROMPT, GMC_HOME_PROMPT,
         GMC_TOOLS_PROMPT, GMC_DEFAULT_PROMPT } from './gmc/index.js';
import { AI_OPTIMIZER_TAG } from './config/constants.js';

function selectPrompt(category, type) {
  const prompts = {
    shopify: {
      electronics: SHOPIFY_ELECTRONICS_PROMPT,
      mobility: SHOPIFY_MOBILITY_PROMPT,
      fashion: SHOPIFY_FASHION_PROMPT,
      home: SHOPIFY_HOME_PROMPT,
      tools: SHOPIFY_TOOLS_PROMPT,
      default: SHOPIFY_DEFAULT_PROMPT
    },
    gmc: {
      electronics: GMC_ELECTRONICS_PROMPT,
      mobility: GMC_MOBILITY_PROMPT,
      fashion: GMC_FASHION_PROMPT,
      home: GMC_HOME_PROMPT,
      tools: GMC_TOOLS_PROMPT,
      default: GMC_DEFAULT_PROMPT
    }
  };
  return prompts[type][category] || prompts[type].default;
}

async function processProduct(product, category) {
  // Skip dacă deja optimizat
  if (shouldSkipProduct(product)) return null;

  const shopifyPrompt = selectPrompt(category, 'shopify');
  const gmcPrompt = selectPrompt(category, 'gmc');

  // Apel GPT-4 Shopify
  const shopifyResult = await fetch(
    'https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: shopifyPrompt },
        { role: 'user', content: `PRODUKTDATEN:\n${JSON.stringify(product)}` }
      ],
      temperature: 0.3
    })
  });

  // Apel GPT-4 GMC
  const gmcResult = await fetch(
    'https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: gmcPrompt },
        { role: 'user', content: `PRODUKTDATEN:\n${JSON.stringify(product)}` }
      ],
      temperature: 0.3
    })
  });

  return { shopify: await shopifyResult.json(),
           gmc: await gmcResult.json() };
}
