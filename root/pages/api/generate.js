import { processProduct } from '../../src/lib/processProduct.js';

export default async function handler(req, res) {
try {
const product = req.body;

const result = await processProduct(product);

res.status(200).json(result);

} catch (error) {
res.status(500).json({
error: error.message
});
}
}
