import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { title, description, type, tags, shopifyPrompt, gmcPrompt, isClassifierOnly } = req.body;

    // SITUAȚIA A: Rulăm DOAR pentru a afla categoria produsului (Classifier)
    if (isClassifierOnly) {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Ești un detector de categorii eCommerce. Răspunde strict cu un singur cuvânt din următoarea listă, în funcție de titlul oferit: TOOLS, ELECTRONICS, FASHION, MOBILITY, HOME. Dacă nu se potrivește în niciuna, răspunde cu DEFAULT.'
          },
          { role: 'user', content: `Determină categoria pentru produsul: ${title}` }
        ],
        temperature: 0.1,
      });

      const category = response.choices[0]?.message?.content?.trim() || 'DEFAULT';
      return res.status(200).json({ success: true, category: category });
    }

    // SITUAȚIA B: Rulăm generarea completă în paralel folosind prompturile specifice primite
    const productData = `
Titlu Original: ${title || '-'}
Descriere Originală: ${description || '-'}
Tip Produs: ${type || '-'}
Taguri Originale: ${tags || '-'}
`;

    const [shopifyResponse, gmcResponse] = await Promise.all([
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: `${shopifyPrompt}\n\n${productData}` }],
        temperature: 0.3,
      }),
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: `${gmcPrompt}\n\n${productData}` }],
        temperature: 0.1,
      })
    ]);

    return res.status(200).json({
      success: true,
      shopifyResult: shopifyResponse.choices[0]?.message?.content || '',
      gmcResult: gmcResponse.choices[0]?.message?.content || ''
    });

  } catch (error) {
    console.error('Eroare Backend:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
