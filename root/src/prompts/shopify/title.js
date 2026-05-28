export function buildTitlePrompt(product) {
return `
Generate a professional German ecommerce product title.

Rules:

- Natural German language
- SEO optimized
- Max 140 characters
- No keyword stuffing
- No fake claims

Product:
${JSON.stringify(product)}
`;
}
