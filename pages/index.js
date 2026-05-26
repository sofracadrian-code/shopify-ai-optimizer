import { useState } from 'react';
import Papa from 'papaparse';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Prompturile inițiale pe care le poți modifica live direct din aplicație
  const [shopifyPrompt, setShopifyPrompt] = useState(`Ești expert SEO eCommerce pentru Germania.

OBLIGATORIU:
- Rezultatul final în germană.
- Nu inventa specificații.
- Nu modifica SKU.
- Nu modifica coduri produs.
- Nu modifica modelul.

Generează:

[TITLE]
Titlu SEO 50–70 caractere
[/TITLE]

[BODY]
Descriere HTML 300–600 cuvinte
Folosește:
h2
h3
p
ul
li
[/BODY]

[SEOTITLE]
Max 60 caractere
[/SEOTITLE]

[SEODESC]
Max 155 caractere
[/SEODESC]

[TAGS]
Taguri separate prin virgulă
[/TAGS]

[ALT]
Alt text imagine
[/ALT]`);

  const [gmcPrompt, setGmcPrompt] = useState(`Ești expert Google Merchant Center pentru Germania.

OBLIGATORIU:
- Rezultatul final în germană.
- Nu inventa date.
- Nu folosi limbaj promoțional.
- Nu folosi HTML.
- Nu adăuga beneficii neconfirmate.
- Păstrează valorile tehnice.

Generează:

[GMC_TITLE]
Titlu scurt și factual
[/GMC_TITLE]

[GMC_DESCRIPTION]
Descriere factuală 150–500 caractere
[/GMC_DESCRIPTION]

[PRODUCT_TYPE]
Tip produs
[/PRODUCT_TYPE]

[GOOGLE_CATEGORY]
Categorie Google
[/GOOGLE_CATEGORY]

[BRAND]
Brand real sau NECUNOSCUT
[/BRAND]

[COLOR]
Culoare
[/COLOR]

[SIZE]
Mărime
[/SIZE]

[MATERIAL]
Material
[/MATERIAL]`);

  // Funcția Parser care extrage textul dintre [TAG] și [/TAG]
  const extractSegment = (text, tag) => {
    if (!text) return '';
    const regex = new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[\\/${tag}\\]`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : '';
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (!results.data) return;
        const onlyMainProducts = results.data.filter(p => p && p.Title && p.Title.trim() !== '');
        const mapped = onlyMainProducts.map(p => ({
          ...p,
          aiStatus: 'În așteptare',
          // Coloane noi generate pe care le vom completa din parser
          optimizedTitle: '',
          bodyHtml: '',
          seoTitle: '',
          seoDescription: '',
          tags: '',
          imageAltText: '',
          gmcTitle: '',
          gmcDescription: '',
          productType: '',
          googleCategory: '',
          brand: '',
          color: '',
          size: '',
          material: ''
        }));
        setProducts(mapped);
      },
    });
  };

  const startAIOptimization = async () => {
    if (products.length === 0) return;
    setLoading(true);

    const updatedProducts = [...products];
    const limit = Math.min(products.length, 20); 

    for (let i = 0; i < limit; i++) {
      updatedProducts[i].aiStatus = 'Se procesează...';
      setProducts([...updatedProducts]);

      try {
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: updatedProducts[i].Title || updatedProducts[i].title,
            description: updatedProducts[i].Body || updatedProducts[i].description,
            type: updatedProducts[i].Type || updatedProducts[i].type,
            tags: updatedProducts[i].Tags || updatedProducts[i].tags,
            // Trimitem prompturile editate live din căsuțele text de pe ecran
            shopifyPrompt: shopifyPrompt,
            gmcPrompt: gmcPrompt
          }),
        });

        const data = await response.json();

        if (data && data.success) {
          const shopifyText = data.shopifyResult || '';
          const gmcText = data.gmcResult || '';

          // PARSER: Extragem segmentele și completăm datele pe coloane
          updatedProducts[i].optimizedTitle = extractSegment(shopifyText, 'TITLE');
          updatedProducts[i].bodyHtml = extractSegment(shopifyText, 'BODY');
          updatedProducts[i].seoTitle = extractSegment(shopifyText, 'SEOTITLE');
          updatedProducts[i].seoDescription = extractSegment(shopifyText, 'SEODESC');
          updatedProducts[i].tags = extractSegment(shopifyText, 'TAGS');
          updatedProducts[i].imageAltText = extractSegment(shopifyText, 'ALT');

          updatedProducts[i].gmcTitle = extractSegment(gmcText, 'GMC_TITLE');
          updatedProducts[i].gmcDescription = extractSegment(gmcText, 'GMC_DESCRIPTION');
          updatedProducts[i].productType = extractSegment(gmcText, 'PRODUCT_TYPE');
          updatedProducts[i].googleCategory = extractSegment(gmcText, 'GOOGLE_CATEGORY');
          updatedProducts[i].brand = extractSegment(gmcText, 'BRAND');
          updatedProducts[i].color = extractSegment(gmcText, 'COLOR');
          updatedProducts[i].size = extractSegment(gmcText, 'SIZE');
          updatedProducts[i].material = extractSegment(gmcText, 'MATERIAL');

          updatedProducts[i].aiStatus = 'Optimizat';
        } else {
          updatedProducts[i].aiStatus = 'Eroare AI';
        }
      } catch (err) {
        updatedProducts[i].aiStatus = 'Eroare rețea';
      }

      setProducts([...updatedProducts]);
    }

    setLoading(false);
  };

  // Funcție simplă de descărcare a rezultatului final sub formă de fișier CSV nou
  const downloadCSV = () => {
    const csv = Papa.unparse(products);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "produse_optimizate_golden_bridge.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      <header style={{ marginBottom: '30px' }}>
        <h1 style={{ color: '#111827', fontSize: '28px', fontWeight: 'bold' }}>Golden Bridge Store - AI Optimizer</h1>
        <p style={{ color: '#4b5563' }}>Configurează prompturile, încarcă fișierul CSV și optimizează datele direct pentru Germania.</p>
      </header>

      {/* SECȚIUNEA NOUĂ: Panoul de Control al Prompturilor direct din Browser */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#1f2937' }}>1. Master Prompt SHOPIFY (Marketing & SEO)</h3>
          <textarea 
            value={shopifyPrompt}
            onChange={(e) => setShopifyPrompt(e.target.value)}
            style={{ width: '100%', height: '220px', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', fontFamily: 'monospace', fontSize: '13px' }}
          />
        </div>
        
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#1f2937' }}>2. Master Prompt GMC (Google Merchant Center)</h3>
          <textarea 
            value={gmcPrompt}
            onChange={(e) => setGmcPrompt(e.target.value)}
            style={{ width: '100%', height: '220px', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', fontFamily: 'monospace', fontSize: '13px' }}
          />
        </div>
      </div>

      {/* Zona de Upload și Actiuni */}
      <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '30px', display: 'flex', gap: '20px', alignItems: 'center' }}>
        <input type="file" accept=".csv" onChange={handleFileUpload} style={{ fontSize: '16px', color: '#4b5563' }} />
        
        {products.length > 0 && (
          <button 
            onClick={startAIOptimization}
            disabled={loading}
            style={{ backgroundColor: loading ? '#9ca3af' : '#2563eb', color: '#fff', padding: '10px 20px', borderRadius: '6px', border: 'none', fontSize: '16px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Sistemul AI lucrează...' : 'Pornește Optimizarea AI'}
          </button>
        )}

        {products.some(p => p.aiStatus === 'Optimizat') && (
          <button 
            onClick={downloadCSV}
            style={{ backgroundColor: '#16a34a', color: '#fff', padding: '10px 20px', borderRadius: '6px', border: 'none', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}
          >
            Descarcă Noul CSV Optimizat
          </button>
        )}
      </div>

      {/* Tabelul de Monitorizare Live */}
      {products.length > 0 && (
        <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #e5e7eb' }}>
              <tr>
                <th style={{ padding: '12px 16px', color: '#374151' }}>Titlu Original</th>
                <th style={{ padding: '12px 16px', color: '#374151' }}>Titlu Nou SEO (Shopify)</th>
                <th style={{ padding: '12px 16px', color: '#374151' }}>Titlu Tehnic (GMC)</th>
                <th style={{ padding: '12px 16px', color: '#374151' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {products.slice(0, 20).map((prod, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px 16px', color: '#111827', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prod.Title || prod.title}</td>
                  <td style={{ padding: '12px 16px', color: '#16a34a', fontWeight: '500' }}>{prod.optimizedTitle || '-'}</td>
                  <td style={{ padding: '12px 16px', color: '#ea580c', fontWeight: '500' }}>{prod.gmcTitle || '-'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ 
                      backgroundColor: prod.aiStatus === 'Optimizat' ? '#dcfce7' : prod.aiStatus === 'Se procesează...' ? '#fef9c3' : '#e5e7eb', 
                      color: prod.aiStatus === 'Optimizat' ? '#166534' : prod.aiStatus === 'Se procesează...' ? '#854d0e' : '#374151', 
                      padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '500' 
                    }}>
                      {prod.aiStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
