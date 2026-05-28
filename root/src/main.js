import dotenv from 'dotenv';

import { processCsv } from './src/lib/processCsv.js';

dotenv.config();

async function start() {
try {
console.log('Starting CSV processing...');

await processCsv();

console.log('Finished.');

} catch (error) {
console.error(error);
}
}

start();
