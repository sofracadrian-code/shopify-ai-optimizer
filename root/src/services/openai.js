import OpenAI from 'openai';
import { AI_CONFIG } from '../config/ai.js';

const client = new OpenAI({
apiKey: process.env.OPENAI_API_KEY
});

export async function generateText(prompt) {
const response = await client.chat.completions.create({
model: process.env.OPENAI_MODEL,
temperature: AI_CONFIG.temperature,
messages: [
{
role: 'user',
content: prompt
}
]
});

return response.choices[0].message.content;
}
