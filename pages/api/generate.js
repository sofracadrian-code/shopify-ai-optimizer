import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { title, description, type, tags, shopifyPrompt, gmcPrompt, isClassifierOnly, runShopifyOnly, runGmcOnly } = req.body;

    // SITUAȚIA A: Rulăm doar Classifier-ul de categorii (Funcționează deja perfect)
    if (isClassifierOnly) {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Ești un detector de categorii eCommerce. Răspunde strict cu un singur cuvânt din următoarea listă: TOOLS, ELECTRONICS, FASHION, MOBILITY, HOME. Dacă nu se potrivește în niciuna, răspunde cu DEFAULT.'
          },
          { role: 'user', content: `Determină categoria pentru produsul: ${title}` }
        ],
        temperature: 0.1,
      });
      const category = response.choices[0]?.message?.content?.trim() || 'DEFAULT';
      return res.status(200).json({ success: true, category: category });
    }

    // Datele brute ale produsului trimise către model
    const productData = `
--- DATE PRODUS ---
Titlu Original: ${title || '-'}
Descriere Originală: ${description || '-'}
Tip Produs: ${type || '-'}
Taguri Originale: ${tags || '-'}
`;

    // SITUAȚIA B: Rulăm generarea exclusivă pentru SHOPIFY
    if (runShopifyOnly) {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Ești un asistent eCommerce profesionist. Sarcina ta este să aplici cu strictețe instrucțiunile utilizatorului și să generezi rezultatul formatat EXCLUSIV prin etichete structurate.
CRITICAL RULES:
1. Return plain text only. No introductions, no conversational text, no conversational explanations.
2. You MUST use the exact structural tags requested in the prompt (e.g., [TITLE]...[/TITLE], [BODY]...[/BODY], [SEOTITLE]...[/SEOTITLE], [SEODESC]...[/SEODESC], [TAGS]...[/TAGS], [ALT]...[/ALT]).
3. Ensure the content inside the tags directly matches the requested format.`
          },
          { role: 'user', content: `${shopifyPrompt}\n\n${productData}` }
        ],
        temperature: 0.3,
      });
      return res.status(200).json({ success: true, shopifyResult: response.choices[0]?.message?.content || '' });
    }

    // SITUAȚIA C: Rulăm generarea exclusivă manuală pentru GMC
    if (runGmcOnly) {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Ești un expert tehnic Google Merchant Center. Sarcina ta este să aplici instrucțiunile utilizatorului și să formatezi rezultatul EXCLUSIV prin etichete structurate.
CRITICAL RULES:
1. Return plain text only. No introductions, no conversational text, no explanations.
2. You MUST use the exact structural tags requested in the prompt (e.g., [GMC_TITLE]...[/GMC_TITLE], [GMC_DESCRIPTION]...[/GMC_DESCRIPTION], [PRODUCT_TYPE]...[/PRODUCT_TYPE], [GOOGLE_CATEGORY]...[/GOOGLE_CATEGORY], [BRAND]...[/BRAND], [COLOR]...[/COLOR], [SIZE]...[/SIZE], [MATERIAL]...[/MATERIAL]).
3. Keep specifications factual and do not use HTML or promotional phrasing.`
          },
          { role: 'user', content: `${gmcPrompt}\n\n${productData}` }
        ],
        temperature: 0.1,
      });
      return res.status(200).json({ success: true, gmcResult: response.choices[0]?.message?.content || '' });
    }

  } catch (error) {
    console.error('Eroare API:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
