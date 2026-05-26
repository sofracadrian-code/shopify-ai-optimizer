import { useState } from 'react';
import Papa from 'papaparse';
import Link from 'next/link';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [selectedProductIds, setSelectedProductIds] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [gmcLoadingIndex, setGmcLoadingIndex] = useState(null);
  const [regenLoadingField, setRegenLoadingField] = useState(null); 
  
  const [selectedProductIndex, setSelectedProductIndex] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);

  // Funcție de extragere îmbunătățită și mult mai tolerantă
  const extractSegment = (text, tag) => {
    if (!text) return '';
    
    // Încercare standard cu taguri precise [TAG]...[/TAG]
    const regexStandard = new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[\\/${tag}\\]`, 'i');
    const matchStandard = text.match(regexStandard);
    if (matchStandard && matchStandard[1].trim()) return matchStandard[1].trim();

    // Căutare specială extinsă pentru corpul descrierii (BODY)
    if (tag === 'BODY') {
      const extraBodyRegex = /\[(?:BODY|DESCRIPTION|PRODUCT_DESCRIPTION|BESCHREIBUNG)\]([\s\S]*?)\[\/(?:BODY|DESCRIPTION|PRODUCT_DESCRIPTION|BESCHREIBUNG)\]/i;
      const matchExtra = text.match(extraBodyRegex);
      if (matchExtra && matchExtra[1].trim()) return matchExtra[1].trim();
      
      // Fallback extrem: Dacă textul conține paragrafe lungi în germană dar au picat tagurile, nu returna deșert
      if (text.includes('Vorteile auf einen Blick') || text.includes('Technische Daten')) {
        return text.replace(/\[\/?\w+\]/g, '').trim(); 
      }
    }

    // Căutare flexibilă după formatul Markdown sau text simplu: **TAG**: valoare
    const alternativeCleanTag = tag.replace('GMC_', '');
    const regexAlt = new RegExp(`(?:\\*\\*|\\b)(?:${tag}|${alternativeCleanTag})(?:\\*\\*)?:?\\s*([\\s\\S]*?)(?=(?:\\*\\*|\\b)(?:TITLE|BODY|DESCRIPTION|SEOTITLE|SEODESC|TAGS|ALT1|ALT2|ALT3|ALT4|ALT5|GMC_TITLE|GMC_DESCRIPTION|PRODUCT_TYPE|GOOGLE_CATEGORY|BRAND|COLOR|SIZE|MATERIAL)\\b|$)`, 'i');
    const matchAlt = text.match(regexAlt);
    if (matchAlt && matchAlt[1].trim()) {
      return matchAlt[1].replace(/^[:\s\-*]+|[:\s\-*]+$/g, '').trim();
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
        
        const onlyMainProducts = results.data.filter(p => p && (p.Title || p.title));
        const mapped = onlyMainProducts.map(p => {
          // Detectăm corect câmpul de descriere din exportul Shopify CSV standard
          const rawDescription = p["Body (HTML)"] || p["Body"] || p["bodyhtml"] || p["Description"] || p["description"] || "";
          const src = p["Image Src"] || p["image_src"] || p["Image URL"] || "";
          const imagesArray = src ? src.split(',').map(img => img.trim()).filter(Boolean) : [];

          return {
            ...p,
            originalDescription: rawDescription, // Păstrăm o copie curată, neatinsă de procesările AI ulterior
            aiStatus: 'În așteptare',
            gmcStatus: 'Neinițiat',
            detectedCategory: 'În așteptare',
            optimizedTitle: '',
            bodyHtml: '',
            seoTitle: '',
            seoDescription: '',
            tags: '',
            altText1: '',
            altText2: '',
            altText3: '',
            altText4: '',
            altText5: '',
            gmcTitle: '',
            gmcDescription: '',
            productType: '',
            googleCategory: '',
            brand: '',
            color: '',
            size: '',
            material: '',
            productImages: imagesArray
          };
        });
        setProducts(mapped);
        setSelectedProductIds([]);
      },
    });
  };

  const handleSelectProduct = (index, e) => {
    e.stopPropagation(); 
    if (selectedProductIds.includes(index)) {
      setSelectedProductIds(selectedProductIds.filter(id => id !== index));
    } else {
      setSelectedProductIds([...selectedProductIds, index]);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const limit = Math.min(products.length, 20); 
      const allIndexes = Array.from({ length: limit }, (_, i) => i);
      setSelectedProductIds(allIndexes);
    } else {
      setSelectedProductIds([]);
    }
  };

  // FLUX CORECTAT: Optimizare Shopify
  const startShopifyOptimization = async () => {
    if (selectedProductIds.length === 0) return;
    setLoading(true);

    const updatedProducts = [...products];

    for (const i of selectedProductIds) {
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
        
        // Adăugăm o regulă tehnică de sistem strictă ca să evităm output-urile goale sau blocate
        const technicalDirectives = `\n\nSTRICT INSTRUCTION: You must generate all requested segments. Inside [BODY], provide the comprehensive, full HTML product description in German. Do not skip it, do not output just a placeholder or hyphen.`;
        const enhancedPrompt = activeShopifyPrompt + technicalDirectives;

        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: updatedProducts[i].Title || updatedProducts[i].title,
            description: updatedProducts[i].originalDescription, // Trimitem sursa curată din CSV
            type: updatedProducts[i].Type || updatedProducts[i].type,
            tags: updatedProducts[i].Tags || updatedProducts[i].tags,
            shopifyPrompt: enhancedPrompt,
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
          
          updatedProducts[i].altText1 = extractSegment(shopifyText, 'ALT1') || extractSegment(shopifyText, 'ALT');
          updatedProducts[i].altText2 = extractSegment(shopifyText, 'ALT2');
          updatedProducts[i].altText3 = extractSegment(shopifyText, 'ALT3');
          updatedProducts[i].altText4 = extractSegment(shopifyText, 'ALT4');
          updatedProducts[i].altText5 = extractSegment(shopifyText, 'ALT5');

          // Fallback de siguranță pentru titlu
          if (!updatedProducts[i].optimizedTitle && updatedProducts[i].seoTitle) {
            updatedProducts[i].optimizedTitle = updatedProducts[i].seoTitle;
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

  // FLUX CORECTAT: Generare corectă pentru Google Merchant Center (GMC)
  const generateGmcForSingleProduct = async (index, e) => {
    if (e) e.stopPropagation();
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
          description: updatedProducts[index].originalDescription, // FOARTE IMPORTANT: Folosim descrierea originală, nu cea modificată de Shopify
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

        // Dacă segmentul principal a eșuat la parsare din cauza tagurilor lipsă, punem un text extras curat
        if (!updatedProducts[index].gmcTitle && gmcText) {
          updatedProducts[index].gmcTitle = updatedProducts[index].optimizedTitle || updatedProducts[index].Title;
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

  const regenerateSingleField = async (fieldKey, tagLabel, isGmc = false) => {
    setRegenLoadingField(fieldKey);
    const category = (editingProduct.detectedCategory || 'default').toLowerCase();
    const activePrompt = isGmc 
      ? (localStorage.getItem(`gmc_${category}`) || localStorage.getItem('gmc_default'))
      : (localStorage.getItem(`shopify_${category}`) || localStorage.getItem('shopify_default'));

    const localizedPrompt = `
      ${activePrompt}
      
      STRICT MANDATE: 
      1. You must generate the content exclusively in GERMAN language.
      2. Generate NOW strictly the segment [${tagLabel}] for the product below.
      3. Return ONLY the optimized value wrapped in the exact tags, like this: [${tagLabel}]content_here[/${tagLabel}]. Do not output any other section.
    `;

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingProduct.Title || editingProduct.title,
          description: editingProduct.originalDescription,
          type: editingProduct.Type || editingProduct.type,
          tags: editingProduct.Tags || editingProduct.tags,
          shopifyPrompt: !isGmc ? localizedPrompt : undefined,
          gmcPrompt: isGmc ? localizedPrompt : undefined,
          runShopifyOnly: !isGmc,
          runGmcOnly: isGmc
        }),
      });

      const data = await response.json();
      if (data && data.success) {
        const rawResult = isGmc ? data.gmcResult : data.shopifyResult;
        const extractedValue = extractSegment(rawResult, tagLabel);
        if (extractedValue) {
          setEditingProduct(prev => ({ ...prev, [fieldKey]: extractedValue }));
        } else if (rawResult) {
          setEditingProduct(prev => ({ ...prev, [fieldKey]: rawResult.replace(/\[\/?\w+\]/g, '').trim() }));
        }
      }
    } catch (err) {
      console.error("Eroare la regenerarea câmpului:", err);
    }
    setRegenLoadingField(null);
  };

  const openEditModal = (index) => {
    setSelectedProductIndex(index);
    setEditingProduct({ ...products[index] });
  };

  const saveProductEdits = () => {
    if (selectedProductIndex === null || !editingProduct) return;
    
    setProducts(prevProducts => {
      const copy = [...prevProducts];
      copy[selectedProductIndex] = { ...editingProduct };
      return copy;
    });

    setSelectedProductIndex(null);
    setEditingProduct(null);
  };

  const downloadCSV = () => {
    const csvData = products.map(p => {
      const { altText1, altText2, altText3, altText4, altText5, productImages, originalDescription, ...rest } = p;
      return {
        ...rest,
        "Image Src": productImages ? productImages.join(', ') : '',
        "Image Alt Text 1": altText1,
        "Image Alt Text 2": altText2,
        "Image Alt Text 3": altText3,
        "Image Alt Text 4": altText4,
        "Image Alt Text 5": altText5
      };
    });

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "produse_optimizate_golden_bridge.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const labelStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', fontWeight: 'bold', marginBottom: '2px', color: '#374151' };
  const regenBtnStyle = (isFieldLoading) => ({
    background: 'none', border: 'none', color: '#2563eb', fontSize: '12px', cursor: isFieldLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: '600', padding: '2px 5px', borderRadius: '3px'
  });

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      {/* HEADER */}
      <header style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: '#111827', fontSize: '28px', fontWeight: 'bold' }}>Golden Bridge Store - AI Optimizer</h1>
          <p style={{ color: '#4b5563' }}>Generează automat datele Shopify, iar pentru Google Merchant Center activează doar produsele dorite.</p>
        </div>
        <Link href="/settings" style={{ backgroundColor: '#2563eb', color: '#fff', padding: '10px 20px', borderRadius: '6px', textDecoration: 'none', fontWeight: '600' }}>
          ⚙ Configurare Prompturi
        </Link>
      </header>

      {/* ACTIUNI FILE */}
      <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '30px', display: 'flex', gap: '20px', alignItems: 'center' }}>
        <input type="file" accept=".csv" onChange={handleFileUpload} style={{ fontSize: '16px', color: '#4b5563' }} />
        
        {products.length > 0 && (
          <button 
            onClick={startShopifyOptimization} 
            disabled={loading || selectedProductIds.length === 0} 
            style={{ 
              backgroundColor: loading ? '#9ca3af' : (selectedProductIds.length === 0 ? '#cbd5e1' : '#2563eb'), 
              color: '#fff', padding: '10px 20px', borderRadius: '6px', border: 'none', fontSize: '16px', fontWeight: '600', 
              cursor: (loading || selectedProductIds.length === 0) ? 'not-allowed' : 'pointer' 
            }}
          >
            {loading ? 'Se procesează...' : `Pornește Optimizarea Shopify`}
          </button>
        )}

        {products.some(p => p.aiStatus === 'Optimizat') && (
          <button onClick={downloadCSV} style={{ backgroundColor: '#16a34a', color: '#fff', padding: '10px 20px', borderRadius: '6px', border: 'none', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}>
            Descarcă CSV Optimizat
          </button>
        )}
      </div>

      {/* TABEL CENTRAL */}
      {products.length > 0 && (
        <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #e5e7eb' }}>
              <tr>
                <th style={{ padding: '12px 16px', width: '40px', textAlign: 'center' }}>
                  <input 
                    type="checkbox" 
                    onChange={handleSelectAll} 
                    checked={selectedProductIds.length === Math.min(products.length, 20) && products.length > 0} 
                    style={{ width: '17px', height: '17px', cursor: 'pointer' }}
                  />
                </th>
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
                  style={{ borderBottom: '1px solid #e5e7eb', cursor: 'pointer' }}
                >
                  <td style={{ padding: '12px 16px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      checked={selectedProductIds.includes(index)} 
                      onChange={(e) => handleSelectProduct(index, e)}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                  </td>
                  <td style={{ padding: '12px 16px', color: '#111827', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prod.Title || prod.title}</td>
                  <td style={{ padding: '12px 16px', color: '#2563eb', fontWeight: 'bold', fontSize: '12px' }}>{prod.detectedCategory}</td>
                  <td style={{ padding: '12px 16px', color: '#16a34a', fontWeight: '500' }}>
                    {prod.aiStatus === 'Se procesează...' ? 'Generare...' : (prod.optimizedTitle || '-')}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#ea580c', fontWeight: '500' }}>{prod.gmcTitle || '-'}</td>
                  <td style={{ padding: '12px 16px' }} onClick={(e) => e.stopPropagation()}>
                    {prod.aiStatus === 'Optimizat' && prod.gmcStatus === 'Neinițiat' && (
                      <button 
                        onClick={(e) => generateGmcForSingleProduct(index, e)}
                        disabled={gmcLoadingIndex !== null}
                        style={{ backgroundColor: '#ea580c', color: '#fff', padding: '6px 12px', borderRadius: '4px', border: 'none', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
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

      {/* POP-UP DETALII MODAL */}
      {editingProduct && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '8px', width: '100%', maxWidth: '980px', maxHeight: '95vh', overflowY: 'auto', padding: '30px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827' }}>Editează Datele Generate de AI</h2>
              <button onClick={() => setEditingProduct(null)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#9ca3af' }}>&times;</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
              {/* SHOPIFY */}
              <div>
                <h3 style={{ color: '#16a34a', borderBottom: '2px solid #16a34a', paddingBottom: '4px', marginBottom: '12px', fontSize: '14px', fontWeight: 'bold' }}>DATE SHOPIFY & SEO</h3>
                <div style={{ marginBottom: '10px' }}>
                  <div style={labelStyle}><span>Titlu Optimizat Magazin</span><button onClick={() => regenerateSingleField('optimizedTitle', 'TITLE', false)} disabled={regenLoadingField !== null} style={regenBtnStyle(regenLoadingField === 'optimizedTitle')}>🔄 Regenerază</button></div>
                  <input type="text" value={editingProduct.optimizedTitle || ''} onChange={(e) => setEditingProduct({...editingProduct, optimizedTitle: e.target.value})} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #d1d5db' }} />
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <div style={labelStyle}><span>Titlu SEO (Google Search)</span><button onClick={() => regenerateSingleField('seoTitle', 'SEOTITLE', false)} disabled={regenLoadingField !== null} style={regenBtnStyle(regenLoadingField === 'seoTitle')}>🔄 Regenerază</button></div>
                  <input type="text" value={editingProduct.seoTitle || ''} onChange={(e) => setEditingProduct({...editingProduct, seoTitle: e.target.value})} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #d1d5db' }} />
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <div style={labelStyle}><span>Meta Descriere SEO</span><button onClick={() => regenerateSingleField('seoDescription', 'SEODESC', false)} disabled={regenLoadingField !== null} style={regenBtnStyle(regenLoadingField === 'seoDescription')}>🔄 Regenerază</button></div>
                  <textarea rows="2" value={editingProduct.seoDescription || ''} onChange={(e) => setEditingProduct({...editingProduct, seoDescription: e.target.value})} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '13px' }}></textarea>
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <div style={labelStyle}><span>Descriere HTML Produs (Body HTML)</span><button onClick={() => regenerateSingleField('bodyHtml', 'BODY', false)} disabled={regenLoadingField !== null} style={regenBtnStyle(regenLoadingField === 'bodyHtml')}>🔄 Regenerază</button></div>
                  <textarea rows="5" value={editingProduct.bodyHtml || ''} onChange={(e) => setEditingProduct({...editingProduct, bodyHtml: e.target.value})} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #d1d5db', fontFamily: 'monospace', fontSize: '12px' }}></textarea>
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <div style={labelStyle}><span>Taguri</span><button onClick={() => regenerateSingleField('tags', 'TAGS', false)} disabled={regenLoadingField !== null} style={regenBtnStyle(regenLoadingField === 'tags')}>🔄 Regenerază</button></div>
                  <input type="text" value={editingProduct.tags || ''} onChange={(e) => setEditingProduct({...editingProduct, tags: e.target.value})} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #d1d5db' }} />
                </div>
              </div>

              {/* GMC */}
              <div>
                <h3 style={{ color: '#ea580c', borderBottom: '2px solid #ea580c', paddingBottom: '4px', marginBottom: '12px', fontSize: '14px', fontWeight: 'bold' }}>DATE GOOGLE MERCHANT CENTER (GMC)</h3>
                <div style={{ marginBottom: '10px' }}>
                  <div style={labelStyle}><span>Titlu Factual GMC</span><button onClick={() => regenerateSingleField('gmcTitle', 'GMC_TITLE', true)} disabled={regenLoadingField !== null} style={regenBtnStyle(regenLoadingField === 'gmcTitle')}>🔄 Regenerază</button></div>
                  <input type="text" value={editingProduct.gmcTitle || ''} onChange={(e) => setEditingProduct({...editingProduct, gmcTitle: e.target.value})} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #d1d5db' }} />
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <div style={labelStyle}><span>Descriere Factuală GMC</span><button onClick={() => regenerateSingleField('gmcDescription', 'GMC_DESCRIPTION', true)} disabled={regenLoadingField !== null} style={regenBtnStyle(regenLoadingField === 'gmcDescription')}>🔄 Regenerază</button></div>
                  <textarea rows="4" value={editingProduct.gmcDescription || ''} onChange={(e) => setEditingProduct({...editingProduct, gmcDescription: e.target.value})} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '13px' }}></textarea>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <div style={labelStyle}><span>Tip Produs</span></div>
                    <input type="text" value={editingProduct.productType || ''} onChange={(e) => setEditingProduct({...editingProduct, productType: e.target.value})} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #d1d5db' }} />
                  </div>
                  <div>
                    <div style={labelStyle}><span>Categorie Google</span></div>
                    <input type="text" value={editingProduct.googleCategory || ''} onChange={(e) => setEditingProduct({...editingProduct, googleCategory: e.target.value})} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #d1d5db' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <div style={labelStyle}><span>Brand</span></div>
                    <input type="text" value={editingProduct.brand || ''} onChange={(e) => setEditingProduct({...editingProduct, brand: e.target.value})} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #d1d5db' }} />
                  </div>
                  <div>
                    <div style={labelStyle}><span>Culoare</span></div>
                    <input type="text" value={editingProduct.color || ''} onChange={(e) => setEditingProduct({...editingProduct, color: e.target.value})} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #d1d5db' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <div style={labelStyle}><span>Mărime</span></div>
                    <input type="text" value={editingProduct.size || ''} onChange={(e) => setEditingProduct({...editingProduct, size: e.target.value})} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #d1d5db' }} />
                  </div>
                  <div>
                    <div style={labelStyle}><span>Material</span></div>
                    <input type="text" value={editingProduct.material || ''} onChange={(e) => setEditingProduct({...editingProduct, material: e.target.value})} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #d1d5db' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* ACTION FOOTER */}
            <div style={{ marginTop: '25px', borderTop: '1px solid #e5e7eb', paddingTop: '15px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setEditingProduct(null)} style={{ backgroundColor: '#f3f4f6', color: '#374151', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>Anulează</button>
              <button onClick={saveProductEdits} style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>Salvează Modificările</button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
