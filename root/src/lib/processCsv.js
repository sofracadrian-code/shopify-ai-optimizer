import { readCsv } from '../services/csvReader.js';
import { writeCsv } from '../services/csvWriter.js';

import { processProduct } from './processProduct.js';

export async function processCsv() {
const products = await readCsv('./input/products.csv');

const optimizedProducts = [];

for (const product of products) {
console.log("Processing: ${product.Title}");

const optimized = await processProduct(product);

optimizedProducts.push(optimized);

}

await writeCsv(
'./output/optimized-products.csv',
optimizedProducts
);

console.log('CSV export completed.');
}
