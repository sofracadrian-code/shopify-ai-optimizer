import { shouldSkipProduct } from '../utils/shouldSkip.js';
import { generateSEO } from './generateSEO.js';
import { updateProduct } from '../services/shopify.js';
import { logSuccess, logError } from '../services/logger.js';

export async function processProduct(product) {
try {
if (shouldSkipProduct(product)) {
return {
skipped: true
};
}

const seo = await generateSEO(product);

await updateProduct(product.id, {
  product: {
    id: product.id,
    title: seo.title,
    body_html: seo.description
  }
});

logSuccess(`Updated product ${product.id}`);

return {
  success: true
};

} catch (error) {
logError(error.message);

return {
  success: false,
  error: error.message
};

}
}