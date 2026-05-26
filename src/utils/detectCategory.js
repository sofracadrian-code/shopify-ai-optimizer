import { SKIP_TAGS } from '../config/constants.js';

const CATEGORY_SYSTEM_PROMPT = `Du bist ein Produktklassifizierungsexperte.
Analysiere die Produktdaten und klassifiziere das Produkt in GENAU eine Kategorie.
Gib NUR das Kategorie-Wort zurück. Nichts anderes. Keine Erklärung.

KATEGORIEN UND REGELN:

electronics:
- Smartphones, Tablets, Laptops, Desktop-PCs, Monitore
- TVs, Projektoren, Kameras, Camcorder
- Kopfhörer, Lautsprecher, Audio-Equipment
- Smartwatches, Fitness-Tracker
- Drucker, Scanner
- Netzwerkgeräte, Router
- Gaming-Konsolen, Zubehör
- Batterien, Akkus, Ladegeräte
- Schlüsselwörter: Smartphone, Tablet, Laptop, Display, RAM, ROM,
  Akku mAh, GHz, MHz, Bluetooth, WiFi, HDMI, USB-C

mobility:
- Elektroroller, E-Scooter
- Elektrische Fahrräder, E-Bikes
- Elektrische Skateboards, Hoverboards
- Elektrische Einräder
- NUR elektrisch angetriebene Fahrzeuge
- Schlüsselwörter: Elektroroller, E-Scooter, Motor W, km/h,
  Akkukapazität Ah, Reichweite km, IP-Schutz (bei Fahrzeugen)
- NICHT: manuelle Transportmittel, Handwagen, Karren ohne Motor

fashion:
- Kleidung: Jacken, Hosen, Hemden, Kleider, T-Shirts
- Schuhe: alle Arten von Schuhen
- Taschen, Rucksäcke, Geldbörsen
- Schmuck, Uhren, Sonnenbrillen
- Schals, Mützen, Handschuhe
- Schlüsselwörter: Größe S/M/L/XL, Material %, Damen, Herren,
  Kinder, Mode, Stoff, Baumwolle, Polyester

home:
- Möbel: Sofas, Tische, Stühle, Regale, Betten
- Haushaltsgeräte: Staubsauger, Kaffeemaschinen, Kühlschränke,
  Waschmaschinen, Mikrowellen, Toaster
- Beleuchtung: Lampen, LED-Streifen
- Dekoration: Bilder, Vasen, Teppiche
- Gartengeräte: Rasenmäher, Gartenschläuche
- Bettwäsche, Handtücher, Vorhänge
- Schlüsselwörter: Wohnzimmer, Küche, Garten, Haushalt,
  Energieklasse, Lautstärke dB, Fassungsvermögen L

tools:
- Handwerkzeuge: Schraubenzieher, Zangen, Hämmer, Sägen
- Elektrowerkzeuge: Bohrmaschinen, Schleifer, Kreissägen
- Transportgeräte OHNE Motor: Handwagen, Sackkarre, Treppensteiger,
  Transportwagen, Plattformwagen, Dollies, Hand Trucks
- Leitern, Gerüste, Arbeitsbühnen
- Messgeräte: Multimeter, Waagen, Messbänder
- Sicherheitsausrüstung: Helme, Handschuhe, Schutzbrillen
- Industriekomponenten, Befestigungsmaterial
- Schlüsselwörter: Tragfähigkeit kg, Stahl, Aluminium, Werkzeug,
  Montage, Bohrmaschine, Säge, Karre, Wagen, Steiger, Leiter

default:
- Spielzeug, Kinderspielzeug
- Babyzubehör, Kinderwagen, Babywiegen
- Tiernahrung, Heimtierbedarf
- Bürobedarf, Schreibwaren
- Sportgeräte: Fahrräder (ohne Motor), Fitnesszubehör, Yogamatten
- Bücher, Medien
- Kosmetik, Pflegeprodukte
- Alles was nicht in andere Kategorien passt

WICHTIGE UNTERSCHEIDUNGEN:
- Handwagen/Sackkarre/Treppensteiger OHNE Motor → tools (NICHT mobility)
- Elektroroller MIT Motor und Akku → mobility (NICHT tools)
- Staubsauger → home (NICHT tools)
- Elektrische Gartengeräte → home (NICHT tools)
- Ladegeräte für Geräte → electronics (NICHT tools)

Erlaubte Ausgaben: electronics, mobility, fashion, home, tools, default`;

async function detectCategory(product) {
  // Aufbau des Produkttextes für die Klassifizierung
  const productText = [
    product.title || '',
    product.description || '',
    product.product_type || '',
    product.tags || '',
    // Erste 800 Zeichen der Beschreibung reichen für Klassifizierung
  ].join('\n').substring(0, 1000);

  try {
    const response = await fetch(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: CATEGORY_SYSTEM_PROMPT
            },
            {
              role: 'user',
              content: `Klassifiziere dieses Produkt:\n\n${productText}`
            }
          ],
          temperature: 0,        // Deterministisch — kein Zufall
          max_tokens: 10         // Nur ein Wort nötig
        })
      }
    );

    if (!response.ok) {
      console.error(`❌ Category detection API error: ${response.status}`);
      return 'default';
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim().toLowerCase();

    const validCategories = [
      'electronics',
      'mobility',
      'fashion',
      'home',
      'tools',
      'default'
    ];

    if (validCategories.includes(raw)) {
      console.log(`🏷️  Kategorie erkannt: ${raw} → "${product.title}"`);
      return raw;
    }

    // Falls GPT-4 mehr als ein Wort zurückgibt
    const found = validCategories.find(cat => raw.includes(cat));
    if (found) {
      console.log(`🏷️  Kategorie extrahiert: ${found} → "${product.title}"`);
      return found;
    }

    console.warn(`⚠️  Unbekannte Kategorie "${raw}" → fallback: default`);
    return 'default';

  } catch (error) {
    console.error(`❌ detectCategory error: ${error.message}`);
    return 'default';
  }
}

// Batch-Verarbeitung für mehrere Produkte gleichzeitig
async function detectCategoriesBatch(products, batchSize = 5) {
  const results = [];
  
  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    
    const promises = batch.map(product => detectCategory(product));
    const categories = await Promise.all(promises);
    
    results.push(...categories);
    
    // Rate limiting — kurze Pause zwischen Batches
    if (i + batchSize < products.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return results;
}

export { detectCategory, detectCategoriesBatch };
