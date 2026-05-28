import { generateSEO } from './generateSEO.js';

export async function processProduct(product) {
const seo = await generateSEO(product);

return {
...product,

Title: seo.title,

Body_HTML: seo.description

};
}
