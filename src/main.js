import { detectCategory, detectCategoriesBatch } from './utils/detectCategory.js';
import { shouldSkipProduct } from './utils/shouldSkip.js';
import { AI_OPTIMIZER_TAG } from './config/constants.js';

import {
  SHOPIFY_ELECTRONICS_PROMPT,
  SHOPIFY_MOBILITY_PROMPT,
  SHOPIFY_FASHION_PROMPT,
  SHOPIFY_HOME_PROMPT,
  SHOPIFY_TOOLS_PROMPT,
  SHOPIFY_DEFAULT_PROMPT
} from './shopify/index.js';

import {
  GMC_ELECTRONICS_PROMPT,
  GMC_MOBILITY_PROMPT,
  GMC_FASHION_PROMPT,
  GMC_HOME_PROMPT,
  GMC_TOOLS_PROMPT,
  GMC_DEFAULT_PROMPT
} from './gmc/index.js';

// Prompt selectie
function selectPrompt(category, type) {
  const prompts = {
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
  return prompts[type][category] || prompts[type].default;
}

// GPT-4 API apel
async function callGPT(systemPrompt, productData) {
  const response = await fetch(
    'https://api.openai.com/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
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
        temperature: 0.3
      })
    }
  );

  if (!response.ok) {
    throw new Error(`GPT API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// Output parser
function parseOutput(raw) {
  const extract = (tag) => {
    const match = raw.match(
      new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[\\/${tag}\\]`, 'i')
    );
    return match ? match[1].trim() : '';
  };

  return {
    // Shopify fields
    title:       extract('TITLE'),
    body:        extract('BODY'),
    seoTitle:    extract('SEOTITLE'),
    seoDesc:     extract('SEODESC'),
    tags:        extract('TAGS'),
    alt:         extract('ALT'),
    // GMC fields
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

// Produs principal
async function processProduct(product) {
  // Step 1 — Skip check
  if (shouldSkipProduct(product)) return null;

  // Step 2 — Detectie categorie
  const category = await detectCategory(product);

  // Step 3 — Selectie prompturi
  const shopifyPrompt = selectPrompt(category, 'shopify');
  const gmcPrompt     = selectPrompt(category, 'gmc');

  console.log(`\n🔄 Processing: "${product.title}"`);
  console.log(`📂 Category: ${category}`);

  try {
    // Step 4 — Generare paralela Shopify + GMC
    const [shopifyRaw, gmcRaw] = await Promise.all([
      callGPT(shopifyPrompt, product),
      callGPT(gmcPrompt, product)
    ]);

    // Step 5 — Parse output
    const shopify = parseOutput(shopifyRaw);
    const gmc     = parseOutput(gmcRaw);

    // Step 6 — Validare tags
    if (!shopify.tags.includes(AI_OPTIMIZER_TAG)) {
      console.warn(`⚠️  Tag ${AI_OPTIMIZER_TAG} missing — adding manually`);
      shopify.tags = shopify.tags
        ? `${shopify.tags}, ${AI_OPTIMIZER_TAG}`
        : AI_OPTIMIZER_TAG;
    }

    console.log(`✅ Done: "${shopify.title}"`);

    return {
      original: product,
      category,
      shopify,
      gmc
    };

  } catch (error) {
    console.error(`❌ Error processing "${product.title}": ${error.message}`);
    return null;
  }
}

// Batch procesare CSV
async function processCsvProducts(products, batchSize = 3) {
  const results = [];
  let processed = 0;
  let skipped = 0;
  let errors = 0;

  console.log(`\n🚀 Starting: ${products.length} products`);
  console.log(`📦 Batch size: ${batchSize}\n`);

  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);

    const batchResults = await Promise.allSettled(
      batch.map(product => processProduct(product))
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        if (result.value === null) {
          skipped++;
        } else {
          results.push(result.value);
          processed++;
        }
      } else {
        errors++;
        console.error(`❌ Batch error: ${result.reason}`);
      }
    }

    // Progress
    console.log(`\n📊 Progress: ${i + batch.length}/${products.length}`);
    console.log(`   ✅ Processed: ${processed}`);
    console.log(`   ⏭️  Skipped:   ${skipped}`);
    console.log(`   ❌ Errors:    ${errors}`);

    // Rate limiting
    if (i + batchSize < products.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`\n🏁 Completed!`);
  console.log(`   ✅ Total processed: ${processed}`);
  console.log(`   ⏭️  Total skipped:  ${skipped}`);
  console.log(`   ❌ Total errors:   ${errors}`);

  return results;
}

export { processProduct, processCsvProducts };
