import { detectCategory } from '../utils/detectCategory.js';
import { shouldSkipProduct } from '../utils/shouldSkip.js';
import { AI_OPTIMIZER_TAG } from '../config/constants.js';

import {
  SHOPIFY_ELECTRONICS_PROMPT,
  SHOPIFY_MOBILITY_PROMPT,
  SHOPIFY_FASHION_PROMPT,
  SHOPIFY_HOME_PROMPT,
  SHOPIFY_TOOLS_PROMPT,
  SHOPIFY_DEFAULT_PROMPT
} from '../prompts/shopify/index.js';

import {
  GMC_ELECTRONICS_PROMPT,
  GMC_MOBILITY_PROMPT,
  GMC_FASHION_PROMPT,
  GMC_HOME_PROMPT,
  GMC_TOOLS_PROMPT,
  GMC_DEFAULT_PROMPT
} from '../prompts/gmc/index.js';

function selectPrompt(category, type) {
  const map = {
    shopify: {
      electronics: SHOPIFY_ELECTRONICS_PROMPT,
      mobility:    SHOPIFY_MOBILITY_PROMPT,
      fashion:     SHOPIFY_FASHION_PROMPT,
      home:        SHOPIFY_HOME_PROMPT,
      tools:       SHOPIFY_TOOLS_PROMPT,
      default:     SHOPIFY_DEFAULT_PROMPT
    },
    gmc: {
      electronics: GMC_ELECTRONICS_PROMPT,
      mobility:    GMC_MOBILITY_PROMPT,
      fashion:     GMC_FASHION_PROMPT,
      home:        GMC_HOME_PROMPT,
      tools:       GMC_TOOLS_PROMPT,
      default:     GMC_DEFAULT_PROMPT
    }
  };
  return map[type][category] || map[type].default;
}

async function callGPT(systemPrompt, productData, apiKey) {
  const response = await fetch(
    'https://api.openai.com/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `PRODUKTDATEN:\n${JSON.stringify(productData, null, 2)}`
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`GPT error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

function parseOutput(raw) {
  const extract = (tag) => {
    const match = raw.match(
      new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[\\/${tag}\\]`, 'i')
    );
    return match ? match[1].trim() : '';
  };

  return {
    title:          extract('TITLE'),
    body:           extract('BODY'),
    seoTitle:       extract('SEOTITLE'),
    seoDesc:        extract('SEODESC'),
    tags:           extract('TAGS'),
    alt:            extract('ALT'),
    gmcTitle:       extract('GMC_TITLE'),
    gmcDescription: extract('GMC_DESCRIPTION'),
    productType:    extract('PRODUCT_TYPE'),
    googleCategory: extract('GOOGLE_CATEGORY'),
    brand:          extract('BRAND'),
    color:          extract('COLOR'),
    size:           extract('SIZE'),
    material:       extract('MATERIAL')
  };
}

function ensureOptimizerTag(tags) {
  if (!tags) return AI_OPTIMIZER_TAG;
  if (tags.toLowerCase().includes('syaioptimizer')) return tags;
  // Elimina claudeuniv daca exista
  const cleaned = tags
    .split(',')
    .map(t => t.trim())
    .filter(t => t.toLowerCase() !== 'claudeuniv')
    .join(', ');
  return `${cleaned}, ${AI_OPTIMIZER_TAG}`;
}

export async function processProduct(product, apiKey) {
  // Step 1 — Skip check
  if (shouldSkipProduct(product)) {
    return { skipped: true, title: product.title };
  }

  // Step 2 — Detectie categorie
  const category = await detectCategory(product, apiKey);

  // Step 3 — Selectie prompturi
  const shopifyPrompt = selectPrompt(category, 'shopify');
  const gmcPrompt     = selectPrompt(category, 'gmc');

  console.log(`\n🔄 "${product.title}" → ${category}`);

  // Step 4 — Generare paralela
  const [shopifyRaw, gmcRaw] = await Promise.all([
    callGPT(shopifyPrompt, product, apiKey),
    callGPT(gmcPrompt, product, apiKey)
  ]);

  // Step 5 — Parse
  const shopify = parseOutput(shopifyRaw);
  const gmc     = parseOutput(gmcRaw);

  // Step 6 — Asigura tag corect
  shopify.tags = ensureOptimizerTag(shopify.tags);

  console.log(`✅ "${shopify.title}" [${category}]`);

  return {
    skipped: false,
    original: product,
    category,
    shopify,
    gmc
  };
}

export async function processBatch(products, apiKey, batchSize = 3) {
  const results  = [];
  let processed  = 0;
  let skipped    = 0;
  let errors     = 0;

  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);

    const settled = await Promise.allSettled(
      batch.map(p => processProduct(p, apiKey))
    );

    for (const r of settled) {
      if (r.status === 'rejected') {
        errors++;
        console.error(`❌ ${r.reason}`);
        continue;
      }
      if (r.value?.skipped) {
        skipped++;
      } else {
        results.push(r.value);
        processed++;
      }
    }

    console.log(
      `📊 ${Math.min(i + batchSize, products.length)}/${products.length}` +
      ` | ✅${processed} ⏭️${skipped} ❌${errors}`
    );

    // Rate limiting
    if (i + batchSize < products.length) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  return { results, processed, skipped, errors };
}
