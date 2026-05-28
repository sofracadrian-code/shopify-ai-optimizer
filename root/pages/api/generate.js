import { generateText } from '../../src/services/openai.js';

export default async function handler(req, res) {
try {
const response = await generateText(
'Write one short German ecommerce sentence.'
);

res.status(200).json({
  success: true,
  response
});

} catch (error) {
res.status(500).json({
success: false,
error: error.message
});
}
}
