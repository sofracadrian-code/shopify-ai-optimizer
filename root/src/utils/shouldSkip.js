import { SKIP_TAGS } from '../config/tags.js';

export function shouldSkipProduct(product) {
if (!product?.tags) return false;

const tags = product.tags
.split(',')
.map(tag => tag.trim().toLowerCase());

return tags.some(tag => SKIP_TAGS.includes(tag));
}