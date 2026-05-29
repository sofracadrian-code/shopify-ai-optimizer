// src/config/env.js

export const ENV = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  SHOPIFY_STORE_URL: process.env.SHOPIFY_STORE_URL,
  SHOPIFY_ACCESS_TOKEN: process.env.SHOPIFY_ACCESS_TOKEN,
  NODE_ENV: process.env.NODE_ENV || 'development'
};

// Validare simplă la pornire
export const validateEnv = () => {
  const missing = [];
  
  if (!ENV.OPENAI_API_KEY) missing.push('OPENAI_API_KEY');
  // Poți adăuga validări și pentru Shopify când vom integra partea de extragere/update
  // if (!ENV.SHOPIFY_STORE_URL) missing.push('SHOPIFY_STORE_URL');
  // if (!ENV.SHOPIFY_ACCESS_TOKEN) missing.push('SHOPIFY_ACCESS_TOKEN');

  if (missing.length > 0) {
    console.error(`❌ EROARE CRITICĂ: Următoarele variabile de mediu lipsesc din .env.local: ${missing.join(', ')}`);
    // Nu oprim procesul complet deocamdată ca să putem testa local componentele izolate
  } else {
    console.log('✅ Toate variabilele de mediu sunt încărcate corect.');
  }
};
