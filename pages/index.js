import { useState, useRef, useEffect } from 'react';
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

  // --- STĂRI NOI PENTRU MODURILE DE LUCRU ȘI SCROLL INFINIT ---
  const [workMode, setWorkMode] = useState('manual'); // 'manual' sau 'automatic'
  const [batchCount, setBatchCount] = useState(0); // Numărătorul pentru lotul de 50
  const [currentProgressIndex, setCurrentProgressIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(20); // Control scroll infinit: afișează inițial 20
  
  const abortControllerRef = useRef(null);
  const tableContainerRef = useRef(null);

  // Helper pentru pauza de 3 secunde
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // Resetăm scroll-ul la încărcarea unui fișier nou
  useEffect(() => {
    setVisibleCount(20);
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTop = 0;
    }
  }, [products.length]);

  // Handler detectare scroll pentru tabel
  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 50) {
      if (visibleCount < products.length) {
        setVisibleCount((prev) => Math.min(prev + 20, products.length));
      }
    }
  };

  const extractSegment = (text, tag) => {
    if (!text) return '';
    
    const regexStandard = new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[\\/${tag}\\]`, 'i');
    const matchStandard = text.match(regexStandard);
    if (matchStandard && matchStandard[1].trim()) return matchStandard[1].trim();

    if (tag === 'BODY') {
      const extraBodyRegex = /\[(?:BODY|DESCRIPTION|PRODUCT_DESCRIPTION|BESCHREIBUNG)\]([\s\S]*?)\[\/(?:BODY|DESCRIPTION|PRODUCT_DESCRIPTION|BESCHREIBUNG)\]/i;
      const matchExtra = text.match(extraBodyRegex);
      if (matchExtra && matchExtra[1].trim()) return matchExtra[1].trim();
      
      if (text.includes('Vorteile auf einen Blick') || text.includes('Technische Daten')) {
        return text.replace(/\[\/?\w+\]/g, '').trim(); 
      }
    }

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
        const mapped = onlyMainProducts.map((p, index) => {
          const rawDescription = p["Body (HTML)"] || p["Body"] || p["bodyhtml"] || p["Description"] || p["description"] || "";
          const src = p["Image Src"] || p["image_src"] || p["Image URL"] || "";
          const imagesArray = src ? src.split(',').map(img => img.trim()).filter(Boolean) : [];

          return {
            ...p,
            id: index, // Identificator unic intern securizat
            originalDescription: rawDescription, 
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

  const handleSelectProduct = (id, e) => {
    e.stopPropagation(); 
    if (selectedProductIds.includes(id)) {
      setSelectedProductIds(selectedProductIds.filter(item => item !== id));
    } else {
      setSelectedProductIds([...selectedProductIds, id]);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      // Bifează toate produsele din catalog pentru a permite procesarea globală liberă
      const allIds = products.map(p => p.id);
      setSelectedProductIds(allIds);
    } else {
      setSelectedProductIds([]);
    }
  };

  // --- MOTORUL NOU DE OPTIMIZARE UNITARĂ ȘI AUTOMATĂ ---
  const startShopifyOptimization = async () => {
    let targets = [];
    const updatedProducts = [...products];

    if (workMode === 'manual') {
      if (selectedProductIds.length === 0) return;
      targets = updatedProducts.filter(p => selectedProductIds.includes(p.id));
    } else {
      // Modul Automat: Selectează direct toate produsele care nu conțin eticheta protectoare
      targets = updatedProducts.filter(p => {
        const currentTags = (p.Tags || p.tags || "").toLowerCase();
        return !currentTags.includes("claudeuniv");
      });
    }

    if (targets.length === 0) {
      alert("⚠️ Nu există produse disponibile pentru optimizare în modul selectat.");
      return;
    }

    setLoading(true);
    abortControllerRef.current = new AbortController();
    let localBatchCount = 0;

    for (let i = 0; i < targets.length; i++) {
      // Verificare STOP de urgență
      if (abortControllerRef.current?.signal.aborted) {
        console.log('🛑 Procesarea a fost întreruptă de utilizator.');
        break;
      }

      const currentProduct = targets[i];
      const realIndex = updatedProducts.findIndex(p => p.id === currentProduct.id);
      
      setCurrentProgressIndex(i + 1);

      const currentTags = (currentProduct.Tags || currentProduct.tags || "").toLowerCase();
      if (currentTags.includes("claudeuniv")) {
        updatedProducts[realIndex].aiStatus = 'Sărit (Deja Optimizat)';
        setProducts([...updatedProducts]);
        continue;
      }

      updatedProducts[realIndex].aiStatus = 'Se procesează...';
      setProducts([...updatedProducts]);

      try {
        const classResponse = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: currentProduct.Title || currentProduct.title,
            isClassifierOnly: true
          }),
        });
        const classData = await classResponse.json();
        const category = (classData.category || 'default').toLowerCase();
        updatedProducts[realIndex].detectedCategory = category.toUpperCase();

        const activeShopifyPrompt = localStorage.getItem(`shopify_${category}`) || localStorage.getItem('shopify_default');
        
        const technicalDirectives = `
STRICT MANDATE FOR [BODY] SEGMENT:
- You must generate a comprehensive, full HTML product description in German inside [BODY] and [/BODY].
- NEVER output placeholders, hyphens (-), short summaries, or phrases like "same as original".
- Provide the complete marketing and technical text tailored for German buyers.`;
        
        const enhancedPrompt = activeShopifyPrompt + technicalDirectives;

        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: currentProduct.Title || currentProduct.title,
            description: currentProduct.originalDescription, 
            type: currentProduct.Type || currentProduct.type,
            tags: currentProduct.Tags || currentProduct.tags,
            shopifyPrompt: enhancedPrompt,
            runShopifyOnly: true
          }),
        });

        const data = await response.json();

        if (data && data.success) {
          const shopifyText = data.shopifyResult || '';
          
          updatedProducts[realIndex].optimizedTitle = extractSegment(shopifyText, 'TITLE');
          updatedProducts[realIndex].bodyHtml = extractSegment(shopifyText, 'BODY');
          updatedProducts[realIndex].seoTitle = extractSegment(shopifyText, 'SEOTITLE');
          updatedProducts[realIndex].seoDescription = extractSegment(shopifyText, 'SEODESC');
          
          let aiTags = extractSegment(shopifyText, 'TAGS');
          if (!aiTags) {
            aiTags = currentProduct.Tags || currentProduct.tags || '';
          }
          
          if (!aiTags.toLowerCase().includes("claudeuniv")) {
            updatedProducts[realIndex].tags = aiTags ? `${aiTags}, claudeuniv` : 'claudeuniv';
          } else {
            updatedProducts[realIndex].tags = aiTags;
          }
          
          updatedProducts[realIndex].altText1 = extractSegment(shopifyText, 'ALT1') || extractSegment(shopifyText, 'ALT');
          updatedProducts[realIndex].altText2 = extractSegment(shopifyText, 'ALT2');
          updatedProducts[realIndex].altText3 = extractSegment(shopifyText, 'ALT3');
          updatedProducts[realIndex].altText4 = extractSegment(shopifyText, 'ALT4');
          updatedProducts[realIndex].altText5 = extractSegment(shopifyText, 'ALT5');

          if (!updatedProducts[realIndex].optimizedTitle && updatedProducts[realIndex].seoTitle) {
            updatedProducts[realIndex].optimizedTitle = updatedProducts[realIndex].seoTitle;
          }
          
          updatedProducts[realIndex].aiStatus = 'Optimizat';
          localBatchCount++;
          setBatchCount(localBatchCount);

          // LOGICA DE AUTO-SALVARE: Descarcă automat la fiecare 50 de produse în Modul Automat
          if (workMode === 'automatic' && localBatchCount % 50 === 0) {
            console.log(`💾 [Auto-Save] S-a atins pragul de 50 de produse. Declanșăm descărcarea...`);
            executeDownload(updatedProducts, `auto_lot_${localBatchCount}`);
          }

        } else {
          updatedProducts[realIndex].aiStatus = 'Eroare AI';
        }
      } catch (err) {
        updatedProducts[realIndex].aiStatus = 'Eroare rețea';
      }
      setProducts([...updatedProducts]);

      // PAUZA MANDATORIE DE 3 SECUNDE (Protecție API - nu se aplică după ultimul din listă)
      if (i < targets.length - 1 && !abortControllerRef.current?.signal.aborted) {
        await delay(3000);
      }
    }
    setLoading(false);
    setBatchCount(0);
  };

  const stopProcessing = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setLoading(false);
  };

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
          description: updatedProducts[index].originalDescription, 
          type: updatedProducts[index].Type || updatedProducts[index].type,
          tags: updatedProducts[index].tags || updatedProducts[index].Tags || '', 
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
          tags: editingProduct.tags || editingProduct.Tags || '',
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

  const openEditModal = (id) => {
    const index = products.findIndex(p => p.id === id);
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

  // Funcție globală de mapare și descărcare CSV
  const executeDownload = (dataset, label) => {
    const csvData = dataset.map(p => {
      const { altText1, altText2, altText3, altText4, altText5, productImages, originalDescription, id, ...rest } = p;
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
    link.setAttribute("download", `produse_optimizate_${label}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadCSV = () => {
    executeDownload(products, "golden_bridge");
  };

  const labelStyle = { display: 'flex', justifyContent: 'space-between', alignItems:
