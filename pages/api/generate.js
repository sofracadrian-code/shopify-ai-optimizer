import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Vercel o va citi automat de unde ai salvat-o!
});

// PASUL 5: Funcția Cleaner (Curețește HTML-ul vechi și normalizează textul)
function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/<\/?[^>]+(>|$)/g, "") // Elimină orice tag HTML vechi (ex: <p>, <br>)
    .replace(/\s+/g, " ")           // Normalizază spațiile multiple într-un singur spațiu
    .trim();                        // Taie spațiile goale de la început și sfârșit
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Doar cererile POST sunt permise' });
  }

  try {
    const { title, description, type, tags } = req.body;

    // Pasul 5 executat pe datele primite
    const cleanTitle = cleanText(title);
    const cleanDescription = cleanText(description);

    // PASUL 6 & 7: Detectare Categorie & Prompt Router cu OpenAI
    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Rapid și ieftin, perfect pentru sortare în masă
      response_format: { type: "json_object" }, // Îl obligăm pe OpenAI să răspundă doar în format JSON
      messages: [
        {
          role: "system",
          content: `Ești un algoritm e-commerce inteligent pentru magazinul Golden Bridge Store. 
          Sarcina ta este să analizezi produsul primit și să îl clasifici STRÎCT într-una dintre următoarele categorii permise:
          - electronics
          - fashion
          - mobility
          - tools
          - home
          - generic

          Răspunde EXCLUSIV sub forma unui obiect JSON valid, fără alte texte în plus, exact așa:
          {
            "category": "nume_categorie_selectată"
          }`
        },
        {
          role: "user",
          content: `Clasifică acest produs:
          Titlu: ${cleanTitle}
          Tip Produs: ${type || 'N/A'}
          Etichete: ${tags || 'N/A'}`
        }
      ],
      temperature: 0.3 // Temperatură mică pentru reguli și clasificări stricte
    });

    const result = JSON.parse(aiResponse.choices[0].message.content);

    // Returnăm rezultatul înapoi la interfață
    return res.status(200).json({
      success: true,
      category: result.category || 'generic',
      cleaned: {
        title: cleanTitle,
        description: cleanDescription
      }
    });

  } catch (error) {
    console.error("Eroare Backend AI:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
