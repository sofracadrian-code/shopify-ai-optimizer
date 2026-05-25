import { useState } from 'react';
import Papa from 'papaparse';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        // FILTRARE INTELIGENTĂ: Păstrăm DOAR rândurile principale care au un Titlu valid
        const onlyMainProducts = results.data.filter(p => p.Title && p.Title.trim() !== '');
        
        // Mapăm produsele pentru a le pregăti de afișare și procesare
        const mapped = onlyMainProducts.map(p => ({
          ...p,
          aiStatus: 'În așteptare',
          aiCategory: '-'
        }));
        setProducts(mapped);
      },
    });
  };

  // Funcția care trimite produsele filtrate către backend-ul cu OpenAI
  const startAIOptimization = async () => {
    if (products.length === 0) return;
    setLoading(true);

    const updatedProducts = [...products];

    // Am mărit limita la 20 de produse pentru un test mai amplu
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
          }),
        });

        const data = await response.json();

        if (data.success) {
          updatedProducts[i].aiStatus = 'Optimizat';
          updatedProducts[i].aiCategory = data.category; // Categoria întoarsă de OpenAI
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

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      <header style={{ marginBottom: '30px' }}>
        <h1 style={{ color: '#111827', fontSize: '28px', fontWeight: 'bold' }}>Golden Bridge Store - AI Optimizer</h1>
        <p style={{ color: '#4b5563' }}>Încarcă fișierul CSV și pornește sortarea și curățarea automată cu OpenAI.</p>
      </header>

      {/* Zona de Upload și Butonul de Start */}
      <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '30px', display: 'flex', gap: '20px', alignItems: 'center' }}>
        <input 
          type="file" 
          accept=".csv" 
          onChange={handleFileUpload} 
          style={{ fontSize: '16px', color: '#4b5563' }}
        />
        
        {products.length > 0 && (
          <button 
            onClick={startAIOptimization}
            disabled={loading}
            style={{ backgroundColor: loading ? '#9ca3af' : '#2563eb', color: '#fff', padding: '10px 20px', borderRadius: '6px', border: 'none', fontSize: '16px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', transition: '0.2s' }}
          >
            {loading ? 'Sistemul AI lucrează...' : 'Pornește Optimizarea AI'}
          </button>
        )}
      </div>

      {/* Tabelul cu rezultate live */}
      {products.length > 0 && (
        <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #
