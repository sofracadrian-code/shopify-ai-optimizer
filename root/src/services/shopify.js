import { SHOPIFY_API_VERSION } from '../config/shopify.js';

const BASE_URL = "https://${process.env.SHOPIFY_STORE}/admin/api/${SHOPIFY_API_VERSION}";

export async function updateProduct(productId, data) {
const response = await fetch(
"${BASE_URL}/products/${productId}.json",
{
method: 'PUT',
headers: {
'Content-Type': 'application/json',
'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN
},
body: JSON.stringify(data)
}
);

return response.json();
}
