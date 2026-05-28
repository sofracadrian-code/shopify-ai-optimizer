import { generateText } from '../services/openai.js';

import { buildTitlePrompt } from '../prompts/shopify/title.js';
import { buildDescriptionPrompt } from '../prompts/shopify/description.js';

export async function generateSEO(product) {
const titlePrompt = buildTitlePrompt(product);
const descriptionPrompt = buildDescriptionPrompt(product);

const title = await generateText(titlePrompt);
const description = await generateText(descriptionPrompt);

return {
title,
description
};
}