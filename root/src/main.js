import dotenv from 'dotenv';
import { generateSEO } from './src/lib/generateSEO.js';

dotenv.config();

const product = {
title: 'POCO F7 Pro',
description: 'Smartphone with AMOLED display'
};

async function test() {
const seo = await generateSEO(product);

console.log(seo);
}

test();
