import { useState, useEffect } from 'react';
import Link from 'next/link';

// ==========================================
// 1. IMPORTURI INDIVIDUALE PENTRU SHOPIFY (Adăugate acum)
// ==========================================
import { SHOPIFY_DEFAULT_PROMPT } from '../src/prompts/shopify/default.js';
import { SHOPIFY_ELECTRONICS_PROMPT } from '../src/prompts/shopify/electronics.js';
import { SHOPIFY_FASHION_PROMPT } from '../src/prompts/fashion.js'; // Atenție dacă Adrian a pus fashion direct în src sau în shopify
import { SHOPIFY_HOME_PROMPT } from '../src/prompts/shopify/home.js';
import { SHOPIFY_MOBILITY_PROMPT } from '../src/prompts/shopify/mobility.js';
import { SHOPIFY_TOOLS_PROMPT } from '../src/prompts/shopify/tools.js';

// ==========================================
// 2. IMPORTURI INDIVIDUALE PENTRU GMC (Adăugate acum)
// ==========================================
import { GMC_DEFAULT_PROMPT } from '../src/prompts/gmc/default.js';
import { GMC_ELECTRONICS_PROMPT } from '../src/prompts/gmc/electronics.js';
import { GMC_FASHION_PROMPT } from '../src/prompts/gmc/fashion.js';
import { GMC_HOME_PROMPT } from '../src/prompts/gmc/home.js';
import { GMC_MOBILITY_PROMPT } from '../src/prompts/gmc/mobility.js';
import { GMC_TOOLS_PROMPT } from '../src/prompts/gmc/tools.js';

// ==========================================
// 3. IMPORTUL PENTRU TAG-UL DE VALIDARE (Înlocuit cel vechi)
// ==========================================
import { AI_OPTIMIZER_TAG } from '../src/prompts/constants.js';

// Lista de categorii pentru butoanele de pe ecran (Rămâne neatinsă)
const CATEGORIES = ['default', 'tools', 'electronics', 'fashion', 'mobility', 'home'];

// De aici încolo continuă codul paginii lui Adrian...

export default function Settings() {
  const [activeTab, setActiveTab] = useState('default');
  const [prompts, setPrompts] = useState({});

  useEffect(() => {
    const savedPrompts = {};
    CATEGORIES.forEach(cat => {
      savedPrompts[`shopify_${cat}`] = localStorage.getItem(`shopify_${cat}`) || getDefaultShopify(cat);
      savedPrompts[`gmc_${cat}`] = localStorage.getItem(`gmc_${cat}`) || getDefaultGmc(cat);
    });
    setPrompts(savedPrompts);
  }, []);

  const handleChange = (key, value) => {
    setPrompts(prev => ({ ...prev, [key]: value }));
    localStorage.setItem(key, value);
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      <header style={{ marginBottom: '30px', display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: '#111827', fontSize: '28px', fontWeight: 'bold', margin: 0 }}>Panou Setări Prompturi</h1>
          <p style={{ color: '#4b5563', margin: '5px 0 0 0' }}>Configurează prompturile specifice pentru fiecare categorie de produs.</p>
        </div>
        <Link href="/" style={{ backgroundColor: '#4b5563', color: '#fff', padding: '10px 20px', borderRadius: '6px', textDecoration: 'none', fontWeight: '600' }}>
          Inapoi la Aplicație
        </Link>
      </header>

      {/* Selector de Categorii (Tab-uri) */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', borderBottom: '2px solid #e5e7eb', paddingBottom: '10px' }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            style={{
              padding: '10px 20px', borderRadius: '6px', border: 'none', fontWeight: '600', cursor: 'pointer',
              backgroundColor: activeTab === cat ? '#2563eb' : '#e5e7eb',
              color: activeTab === cat ? '#fff' : '#4b5563',
              textTransform: 'uppercase', fontSize: '14px'
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Zona de editare pentru categoria selectată */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#1f2937', textTransform: 'uppercase' }}>Shopify Prompt ({activeTab})</h3>
          <textarea
            value={prompts[`shopify_${activeTab}`] || ''}
            onChange={(e) => handleChange(`shopify_${activeTab}`, e.target.value)}
            style={{ width: '100%', height: '400px', padding: '12px', borderRadius: '6px', border: '1px solid #d1d5db', fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.5' }}
          />
        </div>

        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#1f2937', textTransform: 'uppercase' }}>GMC Prompt ({activeTab})</h3>
          <textarea
            value={prompts[`gmc_${activeTab}`] || ''}
            onChange={(e) => handleChange(`gmc_${activeTab}`, e.target.value)}
            style={{ width: '100%', height: '400px', padding: '12px', borderRadius: '6px', border: '1px solid #d1d5db', fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.5' }}
          />
        </div>
      </div>
      <p style={{ marginTop: '15px', color: '#16a34a', fontWeight: '500', fontStyle: 'italic' }}>✓ Modificările se salvează automat în timp ce tastezi!</p>
    </div>
  );
}

// Structuri implicite în caz că memoria e goală
function getDefaultShopify(cat) {
  return `Ești expert SEO eCommerce pentru Germania. Categoria: ${cat.toUpperCase()}.\n\nOBLIGATORIU:\n- Rezultatul final în germană.\n- Nu inventa specificații.\n- Nu modifica SKU.\n\nGenerează:\n\n[TITLE]\nTitlu SEO 50–70 caractere potrivit pentru ${cat}\n[/TITLE]\n\n[BODY]\nDescriere HTML 300–600 cuvinte\n[/BODY]\n\n[SEOTITLE]\nMax 60 caractere\n[/SEOTITLE]\n\n[SEODESC]\nMax 155 caractere\n[/SEODESC]\n\n[TAGS]\nTaguri separate prin virgulă\n[/TAGS]\n\n[ALT]\nAlt text imagine\n[/ALT]`;
}

function getDefaultGmc(cat) {
  return `Ești expert Google Merchant Center pentru Germania. Categoria: ${cat.toUpperCase()}.\n\nOBLIGATORIU:\n- Rezultatul final în germană.\n- Nu folosi limbaj promoțional.\n- Nu folosi HTML.\n\nGenerează:\n\n[GMC_TITLE]\nTitlu factual\n[/GMC_TITLE]\n\n[GMC_DESCRIPTION]\nDescriere factuală 150–500 caractere\n[/GMC_DESCRIPTION]\n\n[PRODUCT_TYPE]\nTip produs\n[/PRODUCT_TYPE]\n\n[GOOGLE_CATEGORY]\nCategorie Google\n[/GOOGLE_CATEGORY]\n\n[BRAND]\nBrand\n[/BRAND]\n\n[COLOR]\nCuloare\n[/COLOR]\n\n[SIZE]\nMărime\n[/SIZE]\n\n[MATERIAL]\nMaterial\n[/MATERIAL]`;
}
