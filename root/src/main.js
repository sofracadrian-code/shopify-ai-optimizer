import dotenv from 'dotenv';
import { generateText } from './src/services/openai.js';

dotenv.config();

async function test() {
try {
console.log('Testing OpenAI...');

const response = await generateText(
  'Write one short professional German ecommerce sentence.'
);

console.log('\nAI RESPONSE:\n');
console.log(response);

} catch (error) {
console.error('\nERROR:\n');
console.error(error);
}
}

test();
