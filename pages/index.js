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
        // Adăugăm un status inițial pentru fiecare produs găsit în CSV
        const mapped = results.data.map(p => ({
          ...p,
          aiStatus: 'În așteptare',
          aiCategory: '-'
        }));
        setProducts(mapped);
      },
    });
  };

  // Funcția care trimite rând pe rând produsele către backend-ul tău cu OpenAI
  const startAIOptimization = async () => {
    if (products.length === 0) return;
    setLoading(true);

    const updatedProducts = [...products];

    // Procesăm primele 5 produse ca test complet live
    const limit = Math.min(products.length, 5); 

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
          updatedProducts[i].aiCategory = data.category; // Categoria întoarsă de gpt-4o-mini
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
            <thead style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #e5e7eb' }}>
              <tr>
                <th style={{ padding: '12px 16px', color: '#374151', fontWeight: '600' }}>Titlu Original</th>
                <th style={{ padding: '12px 16px', color: '#374151', fontWeight: '600' }}>Categorie GMC (AI)</th>
                <th style={{ padding: '12px 16px', color: '#374151', fontWeight: '600' }}>Status Procesare</th>
              </tr>
            </thead>
            <tbody>
              {products.slice(0, 10).map((prod, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px 16px', color: '#111827', fontWeight: '500' }}>{prod.Title || prod.title}</td>
                  <td style={{ padding: '12px 16px', color: '#2563eb', fontWeight: '600', textTransform: 'uppercase', fontSize: '14px' }}>{prod.aiCategory}</td>
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
