import dotenv from 'dotenv';
import { generateText } from './src/services/openai.js';

dotenv.config();

async function test() {
const response = await generateText(
'Write one short German ecommerce sentence.'
);

console.log(response);
}

test();
