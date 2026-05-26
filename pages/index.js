import { useState } from 'react';
import Papa from 'papaparse';
import Link from 'next/link';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

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
          detectedCategory: 'În așteptare',
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
        // Pasul 1: Detectăm inteligent categoria (Classifier-ul tău de încredere)
        const classResponse = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: updatedProducts[i].Title || updatedProducts[i].title,
            isClassifierOnly: true
          }),
        });
        const classData = await classResponse.json();
        const category = (classData.category || 'default').toLowerCase();
        updatedProducts[i].detectedCategory = category.toUpperCase();

        // Pasul 2: Extragem din localStorage prompturile specifice acelei categorii salvate de tine
        const activeShopifyPrompt = localStorage.getItem(`shopify_${category}`) || localStorage.getItem('shopify_default');
        const activeGmcPrompt = localStorage.getItem(`gmc_${category}`) || localStorage.getItem('gmc_default');

        // Pasul 3: Trimitem datele către server cu prompturile rutate corect
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: updatedProducts[i].Title || updatedProducts[i].title,
            description: updatedProducts[i].Body || updatedProducts[i].description,
            type: updatedProducts[i].Type || updatedProducts[i].type,
            tags: updatedProducts[i].Tags || updatedProducts[i].tags,
            shopifyPrompt: activeShopifyPrompt,
            gmcPrompt: activeGmcPrompt
          }),
        });

        const data = await response.json();

        if (data && data.success) {
          const shopifyText = data.shopifyResult || '';
          const gmcText = data.gmcResult || '';

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
      <header style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: '#111827', fontSize: '28px', fontWeight: 'bold' }}>Golden Bridge Store - AI Optimizer</h1>
          <p style={{ color: '#4b5563' }}>Încarcă fișierul CSV, sistemul va detecta categoria și va ruta automat promptul corect.</p>
        </div>
        <Link href="/settings" style={{ backgroundColor: '#2563eb', color: '#fff', padding: '10px 20px', borderRadius: '6px', textDecoration: 'none', fontWeight: '600', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          ⚙ Configurare Prompturi
        </Link>
      </header>

      {/* Zona de Upload și Actiuni */}
      <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '30px', display: 'flex', gap: '20px', alignItems: 'center' }}>
        <input type="file" accept=".csv" onChange={handleFileUpload} style={{ fontSize: '16px', color: '#4b5563' }} />
        
        {products.length > 0 && (
          <button onClick={startAIOptimization} disabled={loading} style={{ backgroundColor: loading ? '#9ca3af' : '#2563eb', color: '#fff', padding: '10px 20px', borderRadius: '6px', border: 'none', fontSize: '16px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Rulare Prompt Router...' : 'Pornește Optimizarea AI'}
          </button>
        )}

        {products.some(p => p.aiStatus === 'Optimizat') && (
          <button onClick={downloadCSV} style={{ backgroundColor: '#16a34a', color: '#fff', padding: '10px 20px', borderRadius: '6px', border: 'none', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}>
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
                <th style={{ padding: '12px 16px', color: '#374151' }}>Categorie Detectată</th>
                <th style={{ padding: '12px 16px', color: '#374151' }}>Titlu Shopify (SEO)</th>
                <th style={{ padding: '12px 16px', color: '#374151' }}>Titlu GMC (Factual)</th>
                <th style={{ padding: '12px 16px', color: '#374151' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {products.slice(0, 20).map((prod, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px 16px', color: '#111827', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prod.Title || prod.title}</td>
                  <td style={{ padding: '12px 16px', color: '#2563eb', fontWeight: 'bold', fontSize: '13px' }}>{prod.detectedCategory}</td>
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
