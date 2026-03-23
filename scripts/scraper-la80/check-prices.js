
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccount.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkPrices() {
  const productsRef = db.collection('products');
  const snapshot = await productsRef.get();
  
  let missingPrice = 0;
  let nullPrice = 0;
  let nonNumericPrice = 0;
  let validPrice = 0;
  
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.price === undefined) {
      missingPrice++;
    } else if (data.price === null) {
      nullPrice++;
    } else if (typeof data.price !== 'number' || isNaN(data.price)) {
      nonNumericPrice++;
    } else {
      validPrice++;
    }
  });
  
  console.log(`Reporte de Precios:`);
  console.log(`- Válidos: ${validPrice}`);
  console.log(`- Faltantes (undefined): ${missingPrice}`);
  console.log(`- Nulos: ${nullPrice}`);
  console.log(`- No numéricos: ${nonNumericPrice}`);
}

checkPrices().catch(console.error);
