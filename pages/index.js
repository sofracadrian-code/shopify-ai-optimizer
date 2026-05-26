import { useState } from 'react';
import Papa from 'papaparse';
import Link from 'next/link';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [gmcLoadingIndex, setGmcLoadingIndex] = useState(null);
  
  // State-uri pentru gestionarea produsului selectat în Pop-up
  const [selectedProductIndex, setSelectedProductIndex] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);

  const extractSegment = (text, tag) => {
    if (!text) return '';
    const regexStandard = new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[\\/${tag}\\]`, 'i');
    const matchStandard = text.match(regexStandard);
    if (matchStandard && matchStandard[1].trim()) return matchStandard[1].trim();

    const alternativeCleanTag = tag.replace('GMC_', '');
    const regexAlt = new RegExp(`(?:\\*\\*|\\b)(?:${tag}|${alternativeCleanTag})(?:\\*\\*)?:?\\s*([\\s\\S]*?)(?=(?:\\*\\*|\\b)(?:TITLE|BODY|SEOTITLE|SEODESC|TAGS|ALT|GMC_TITLE|GMC_DESCRIPTION|PRODUCT_TYPE|GOOGLE_CATEGORY|BRAND|COLOR|SIZE|MATERIAL)\\b|$)`, 'i');
    const matchAlt = text.match(regexAlt);
    if (matchAlt && matchAlt[1].trim()) {
      return matchAlt[1].replace(/^[:\s\-*]+|[:\s\-*]+$/g, '').trim();
    }

    if ((tag === 'TITLE' || tag === 'GMC_TITLE') && text.length < 150 && !text.includes('\n')) {
      return text.trim();
    }
    return '';
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
          gmcStatus: 'Neinițiat',
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

  const startShopifyOptimization = async () => {
    if (products.length === 0) return;
    setLoading(true);

    const updatedProducts = [...products];
    const limit = Math.min(products.length, 20); 

    for (let i = 0; i < limit; i++) {
      updatedProducts[i].aiStatus = 'Se procesează...';
      setProducts([...updatedProducts]);

      try {
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

        const activeShopifyPrompt = localStorage.getItem(`shopify_${category}`) || localStorage.getItem('shopify_default');

        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: updatedProducts[i].Title || updatedProducts[i].title,
            description: updatedProducts[i].Body || updatedProducts[i].description,
            type: updatedProducts[i].Type || updatedProducts[i].type,
            tags: updatedProducts[i].Tags || updatedProducts[i].tags,
            shopifyPrompt: activeShopifyPrompt,
            runShopifyOnly: true
          }),
        });

        const data = await response.json();

        if (data && data.success) {
          const shopifyText = data.shopifyResult || '';
          updatedProducts[i].optimizedTitle = extractSegment(shopifyText, 'TITLE');
          updatedProducts[i].bodyHtml = extractSegment(shopifyText, 'BODY');
          updatedProducts[i].seoTitle = extractSegment(shopifyText, 'SEOTITLE');
          updatedProducts[i].seoDescription = extractSegment(shopifyText, 'SEODESC');
          updatedProducts[i].tags = extractSegment(shopifyText, 'TAGS');
          updatedProducts[i].imageAltText = extractSegment(shopifyText, 'ALT');

          if (!updatedProducts[i].optimizedTitle && shopifyText) {
            updatedProducts[i].optimizedTitle = shopifyText.substring(0, 60) + '...';
          }
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

  const generateGmcForSingleProduct = async (index, e) => {
    if (e) e.stopPropagation(); // Oprește deschiderea pop-up-ului când se apasă pe buton
    setGmcLoadingIndex(index);
    const updatedProducts = [...products];
    updatedProducts[index].gmcStatus = 'Generare GMC...';
    setProducts([...updatedProducts]);

    try {
      const category = (updatedProducts[index].detectedCategory || 'DEFAULT').toLowerCase();
      const activeGmcPrompt = localStorage.getItem(`gmc_${category}`) || localStorage.getItem('gmc_default');

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: updatedProducts[index].Title || updatedProducts[index].title,
          description: updatedProducts[index].Body || updatedProducts[index].description,
          type: updatedProducts[index].Type || updatedProducts[index].type,
          tags: updatedProducts[index].Tags || updatedProducts[index].tags,
          gmcPrompt: activeGmcPrompt,
          runGmcOnly: true
        }),
      });

      const data = await response.json();

      if (data && data.success) {
        const gmcText = data.gmcResult || '';
        updatedProducts[index].gmcTitle = extractSegment(gmcText, 'GMC_TITLE');
        updatedProducts[index].gmcDescription = extractSegment(gmcText, 'GMC_DESCRIPTION');
        updatedProducts[index].productType = extractSegment(gmcText, 'PRODUCT_TYPE');
        updatedProducts[index].googleCategory = extractSegment(gmcText, 'GOOGLE_CATEGORY');
        updatedProducts[index].brand = extractSegment(gmcText, 'BRAND');
        updatedProducts[index].color = extractSegment(gmcText, 'COLOR');
        updatedProducts[index].size = extractSegment(gmcText, 'SIZE');
        updatedProducts[index].material = extractSegment(gmcText, 'MATERIAL');

        if (!updatedProducts[index].gmcTitle && gmcText) {
          updatedProducts[index].gmcTitle = gmcText.substring(0, 60) + '...';
        }
        updatedProducts[index].gmcStatus = 'GMC Gata';
      } else {
        updatedProducts[index].gmcStatus = 'Eroare GMC';
      }
    } catch (err) {
      updatedProducts[index].gmcStatus = 'Eroare rețea';
    }

    setProducts([...updatedProducts]);
    setGmcLoadingIndex(null);
  };

  // Deschiderea Pop-up-ului de editare
  const openEditModal = (index) => {
    setSelectedProductIndex(index);
    setEditingProduct({ ...products[index] });
  };

  // Salvarea modificărilor făcute manual de tine
  const saveProductEdits = () => {
    const updatedProducts = [...products];
    updatedProducts[selectedProductIndex] = editingProduct;
    setProducts(updatedProducts);
    setSelectedProductIndex(null);
    setEditingProduct(null);
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
          <p style={{ color: '#4b5563' }}>Generează datele automat și dă click pe orice rând pentru a vizualiza sau edita manual detaliile.</p>
        </div>
        <Link href="/settings" style={{ backgroundColor: '#2563eb', color: '#fff', padding: '10px 20px', borderRadius: '6px', textDecoration: 'none', fontWeight: '600', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          ⚙ Configurare Prompturi
        </Link>
      </header>

      <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '30px', display: 'flex', gap: '20px', alignItems: 'center' }}>
        <input type="file" accept=".csv" onChange={handleFileUpload} style={{ fontSize: '16px', color: '#4b5563' }} />
        
        {products.length > 0 && (
          <button onClick={startShopifyOptimization} disabled={loading} style={{ backgroundColor: loading ? '#9ca3af' : '#2563eb', color: '#fff', padding: '10px 20px', borderRadius: '6px', border: 'none', fontSize: '16px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Se procesează...' : 'Pornește Optimizarea Shopify'}
          </button>
        )}

        {products.some(p => p.aiStatus === 'Optimizat') && (
          <button onClick={downloadCSV} style={{ backgroundColor: '#16a34a', color: '#fff', padding: '10px 20px', borderRadius: '6px', border: 'none', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}>
            Descarcă CSV Optimizat
          </button>
        )}
      </div>

      {products.length > 0 && (
        <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #e5e7eb' }}>
              <tr>
                <th style={{ padding: '12px 16px', color: '#374151' }}>Titlu Original</th>
                <th style={{ padding: '12px 16px', color: '#374151' }}>Categorie</th>
                <th style={{ padding: '12px 16px', color: '#374151' }}>Titlu Shopify (SEO)</th>
                <th style={{ padding: '12px 16px', color: '#374151' }}>Titlu GMC (Factual)</th>
                <th style={{ padding: '12px 16px', color: '#374151' }}>Status / Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {products.slice(0, 20).map((prod, index) => (
                <tr 
                  key={index} 
                  onClick={() => openEditModal(index)}
                  style={{ borderBottom: '1px solid #e5e7eb', cursor: 'pointer', transition: 'background 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={{ padding: '12px 16px', color: '#111827', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prod.Title || prod.title}</td>
                  <td style={{ padding: '12px 16px', color: '#2563eb', fontWeight: 'bold', fontSize: '12px' }}>{prod.detectedCategory}</td>
                  <td style={{ padding: '12px 16px', color: '#16a34a', fontWeight: '500' }}>
                    {prod.aiStatus === 'Se procesează...' ? 'Generare...' : (prod.optimizedTitle || '-')}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#ea580c', fontWeight: '500', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prod.gmcTitle || '-'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {prod.aiStatus === 'Optimizat' && prod.gmcStatus === 'Neinițiat' && (
                      <button 
                        onClick={(e) => generateGmcForSingleProduct(index, e)}
                        disabled={gmcLoadingIndex !== null}
                        style={{ backgroundColor: '#ea580c', color: '#fff', padding: '6px 12px', borderRadius: '4px', border: 'none', fontSize: '12px', fontWeight: '600', cursor: gmcLoadingIndex !== null ? 'not-allowed' : 'pointer' }}
                      >
                        + Generează GMC
                      </button>
                    )}
                    {(prod.aiStatus === 'Se procesează...' || prod.gmcStatus !== 'Neinițiat') && (
                      <span style={{ 
                        backgroundColor: prod.gmcStatus === 'GMC Gata' ? '#ffedd5' : '#e5e7eb', 
                        color: prod.gmcStatus === 'GMC Gata' ? '#c2410c' : '#374151', 
                        padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' 
                      }}>
                        {prod.gmcStatus !== 'Neinițiat' ? prod.gmcStatus : prod.aiStatus}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* INTERFAȚA POP-UP (MODALĂ) PENTRU VIZUALIZARE ȘI EDITARE COMPLETĂ */}
      {editingProduct && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '8px', width: '100%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto', padding: '30px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827' }}>Editează Datele Generate de AI</h2>
              <button onClick={() => setEditingProduct(null)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#9ca3af' }}>&times;</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              
              {/* COLOANA STÂNGA: DATE SHOPIFY */}
              <div>
                <h3 style={{ color: '#16a34a', borderBottom: '2px solid #16a34a', paddingBottom: '4px', marginBottom: '12px', fontSize: '14px', fontWeight: 'bold' }}>DATE SHOPIFY & SEO</h3>
                
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px', color: '#374151' }}>Titlu Optimizat Magazin</label>
                  <input type="text" value={editingProduct.optimizedTitle} onChange={(e) => setEditingProduct({...editingProduct, optimizedTitle: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }} />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px', color: '#374151' }}>Titlu SEO (Google Search)</label>
                  <input type="text" value={editingProduct.seoTitle} onChange={(e) => setEditingProduct({...editingProduct, seoTitle: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }} />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px', color: '#374151' }}>Meta Descriere SEO</label>
                  <textarea rows="3" value={editingProduct.seoDescription} onChange={(e) => setEditingProduct({...editingProduct, seoDescription: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db', fontFamily: 'sans-serif' }}></textarea>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px', color: '#374151' }}>Descriere HTML Produs (Body HTML)</label>
                  <textarea rows="6" value={editingProduct.bodyHtml} onChange={(e) => setEditingProduct({...editingProduct, bodyHtml: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db', fontFamily: 'monospace', fontSize: '12px' }}></textarea>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px', color: '#374151' }}>Taguri (separate prin virgulă)</label>
                  <input type="text" value={editingProduct.tags} onChange={(e) => setEditingProduct({...editingProduct, tags: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px', color: '#374151' }}>Alt Text Imagine</label>
                  <input type="text" value={editingProduct.imageAltText} onChange={(e) => setEditingProduct({...editingProduct, imageAltText: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }} />
                </div>
              </div>

              {/* COLOANA DREAPTA: DATE GOOGLE MERCHANT CENTER */}
              <div>
                <h3 style={{ color: '#ea580c', borderBottom: '2px solid #ea580c', paddingBottom: '4px', marginBottom: '12px', fontSize: '14px', fontWeight: 'bold' }}>DATE GOOGLE MERCHANT CENTER (GMC)</h3>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px', color: '#374151' }}>Titlu Factual GMC</label>
                  <input type="text" value={editingProduct.gmcTitle} onChange={(e) => setEditingProduct({...editingProduct, gmcTitle: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }} />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px', color: '#374151' }}>Descriere Factuală GMC</label>
                  <textarea rows="3" value={editingProduct.gmcDescription} onChange={(e) => setEditingProduct({...editingProduct, gmcDescription: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db', fontFamily: 'sans-serif' }}></textarea>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px', color: '#374151' }}>Tip Produs</label>
                    <input type="text" value={editingProduct.productType} onChange={(e) => setEditingProduct({...editingProduct, productType: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px', color: '#374151' }}>Categorie Google</label>
                    <input type="text" value={editingProduct.googleCategory} onChange={(e) => setEditingProduct({...editingProduct, googleCategory: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px', color: '#374151' }}>Brand</label>
                    <input type="text" value={editingProduct.brand} onChange={(e) => setEditingProduct({...editingProduct, brand: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px', color: '#374151' }}>Culoare</label>
                    <input type="text" value={editingProduct.color} onChange={(e) => setEditingProduct({...editingProduct, color: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px', color: '#374151' }}>Mărime / Dimensiune</label>
                    <input type="text" value={editingProduct.size} onChange={(e) => setEditingProduct({...editingProduct, size: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px', color: '#374151' }}>Material</label>
                    <input type="text" value={editingProduct.material} onChange={(e) => setEditingProduct({...editingProduct, material: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }} />
                  </div>
                </div>
              </div>

            </div>

            <div style={{ marginTop: '30px', pt: '15px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setEditingProduct(null)} style={{ backgroundColor: '#f3f4f6', color: '#374151', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
                Anulează
              </button>
              <button onClick={saveProductEdits} style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
                Salvează Modificările
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
