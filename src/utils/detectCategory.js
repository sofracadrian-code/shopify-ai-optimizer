const CATEGORY_SYSTEM_PROMPT = `Klassifiziere das Produkt in GENAU eine Kategorie.
Gib NUR das Kategorie-Wort zurück. Nichts anderes.

electronics: Smartphones, Tablets, Laptops, TVs, Kameras, Kopfhörer,
  Smartwatches, Drucker, Router, Ladegeräte, Akkus
  Keywords: RAM, ROM, mAh, GHz, Bluetooth, WiFi, HDMI, Display Hz

mobility: NUR elektrisch angetriebene Fahrzeuge
  E-Scooter, Elektroroller, E-Bike, Hoverboard
  Keywords: Motor W, km/h, Ah Akku, Reichweite km, IP-Schutz (Fahrzeug)
  NICHT: manuelle Wagen, Karren ohne Motor

fashion: Kleidung, Schuhe, Taschen, Schmuck, Uhren, Accessoires
  Keywords: Größe S/M/L/XL, Damen, Herren, Baumwolle, Polyester

home: Möbel, Haushaltsgeräte, Beleuchtung, Dekoration, Gartengeräte
  Keywords: Energieklasse, dB, Liter, Wohnzimmer, Küche, Garten

tools: Handwerkzeuge, Elektrowerkzeuge, Transportgeräte OHNE Motor
  Handwagen, Sackkarre, Treppensteiger, Plattformwagen, Dollies
  Leitern, Messgeräte, Schutzausrüstung, Industriekomponenten
  Keywords: Tragfähigkeit kg, Drehmoment Nm, U/min, Montage, Karre

default: Spielzeug, Babyzubehör, Tiernahrung, Sport, Kosmetik, Bürobedarf

WICHTIG:
- Treppensteigerwagen → tools
- Sackkarre → tools  
- Handwagen → tools
- Elektroroller → mobility
- Staubsauger → home
- Kaffeemaschine → home

Erlaubte Antworten: electronics, mobility, fashion, home, tools, default`;

export async function detectCategory(product, apiKey) {
  const productText = [
    product.title || '',
    product.body_html?.replace(/<[^>]*>/g, '') || '',
    product.product_type || '',
    product.tags || ''
  ].join(' ').substring(0, 800);

  try {
    const response = await fetch(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: CATEGORY_SYSTEM_PROMPT },
            { role: 'user', content: productText }
          ],
          temperature: 0,
          max_tokens: 10
        })
      }
    );

    if (!response.ok) {
      console.error(`❌ detectCategory error: ${response.status}`);
      return 'default';
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content
      ?.trim()
      .toLowerCase()
      .replace(/[^a-z]/g, '');

    const valid = ['electronics','mobility','fashion','home','tools','default'];
    
    if (valid.includes(raw)) {
      console.log(`🏷️  ${raw} ← "${product.title}"`);
      return raw;
    }

    const found = valid.find(cat => raw?.includes(cat));
    if (found) return found;

    console.warn(`⚠️  Unknown category "${raw}" → default`);
    return 'default';

  } catch (err) {
    console.error(`❌ detectCategory failed: ${err.message}`);
    return 'default';
  }
}
