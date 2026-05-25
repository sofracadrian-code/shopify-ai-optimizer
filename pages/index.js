import { useState } from 'react';
import Papa from 'papaparse';

export default function Home() {
  const [products, setProducts] = useState([]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Citim și parsăm CSV-ul cu PapaParse conform planului tău
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setProducts(results.data);
      },
    });
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      <header style={{ marginBottom: '30px' }}>
        <h1 style={{ color: '#111827', fontSize: '28px', fontWeight: 'bold' }}>Golden Bridge Store - AI Optimizer</h1>
        <p style={{ color: '#4b5563' }}>Încarcă fișierul CSV exportat din Shopify pentru a începe optimizarea GMC și SEO.</p>
      </header>

      {/* Zona de Upload */}
      <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '30px' }}>
        <input 
          type="file" 
          accept=".csv" 
          onChange={handleFileUpload} 
          style={{ display: 'block', fontSize: '16px', color: '#4b5563' }}
        />
      </div>

      {/* Tabelul de Produse (Pasul 4 din plan - Afișează tabel produse) */}
      {products.length > 0 && (
        <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #e5e7eb' }}>
              <tr>
                <th style={{ padding: '12px 16px', color: '#374151', fontWeight: '600' }}>Handle</th>
                <th style={{ padding: '12px 16px', color: '#374151', fontWeight: '600' }}>SKU</th>
                <th style={{ padding: '12px 16px', color: '#374151', fontWeight: '600' }}>Titlu Original</th>
                <th style={{ padding: '12px 16px', color: '#374151', fontWeight: '600' }}>Status AI</th>
              </tr>
            </thead>
            <tbody>
              {products.slice(0, 10).map((prod, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px 16px', color: '#4b5563' }}>{prod.Handle || prod.handle}</td>
                  <td style={{ padding: '12px 16px', color: '#4b5563' }}>{prod.SKU || prod.sku || 'N/A'}</td>
                  <td style={{ padding: '12px 16px', color: '#111827', fontWeight: '500' }}>{prod.Title || prod.title}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '500' }}>
                      Pregătit
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {products.length > 10 && (
            <p style={{ padding: '16px', color: '#6b7280', fontSize: '14px', fontStyle: 'italic' }}>
              Se afișează primele 10 produse dintr-un total de {products.length}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
