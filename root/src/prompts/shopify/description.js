export function buildDescriptionPrompt(product) {
return `
Generate a professional German ecommerce HTML description.

Rules:

- Use proper HTML
- Include introduction
- Include key benefits
- Include bullet points
- Natural German language
- No fake claims
- GMC safe

Product:
${JSON.stringify(product)}
`;
}
