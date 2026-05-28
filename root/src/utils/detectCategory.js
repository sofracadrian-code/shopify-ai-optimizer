export function detectCategory(product) {
const title = product.title.toLowerCase();

if (title.includes('smartphone')) return 'smartphone';
if (title.includes('tablet')) return 'tablet';
if (title.includes('roller')) return 'escooter';

return 'general';
}