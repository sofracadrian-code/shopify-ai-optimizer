import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { title, description, type, tags, shopifyPrompt, gmcPrompt } = req.body;

    // Pregătim datele brute ale produsului pe care AI-ul le va analiza
    const productData = `
Titlu Original: ${title || '-'}
Descriere Originală: ${description || '-'}
Tip Produs: ${type || '-'}
Taguri Originale: ${tags || '-'}
`;

    // Lansăm ambele apeluri către OpenAI în același timp (în paralel) ca să economisim timp
    const [shopifyResponse, gmcResponse] = await Promise.all([
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: `${shopifyPrompt}\n\n${productData}` }
        ],
        temperature: 0.3, // Temperatură mică pentru a rămâne strict pe datele oferite
      }),
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: `${gmcPrompt}\n\n${productData}` }
        ],
        temperature: 0.1, // Temperatură și mai mică pentru GMC (vrem acuratețe maximă, zero marketing)
      })
    ]);

    // Extragem textul brut întors de cele două prompturi
    const shopifyResult = shopifyResponse.choices[0]?.message?.content || '';
    const gmcResult = gmcResponse.choices[0]?.message?.content || '';

    // Trimitem textele împachetate direct la frontend
    return res.status(200).json({
      success: true,
      shopifyResult: shopifyResult,
      gmcResult: gmcResult
    });

  } catch (error) {
    console.error('Eroare Backend AI:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Eroare internă de server la generarea AI' 
    });
  }
}
