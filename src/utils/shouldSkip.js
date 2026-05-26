import { SKIP_TAGS } from '../config/constants.js';

export function shouldSkipProduct(product) {
  if (!product.tags) return false;
  
  const tags = product.tags
    .toLowerCase()
    .split(',')
    .map(t => t.trim());
  
  const shouldSkip = SKIP_TAGS.some(tag => tags.includes(tag));
  
  if (shouldSkip) {
    console.log(`⏭️  Skipped: "${product.title}" — already optimized`);
  }
  
  return shouldSkip;
}
