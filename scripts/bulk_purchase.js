const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// 1. Parse .env.local for credentials
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const getEnv = (key) => {
  const match = envContent.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match ? match[1].trim() : null;
};

// Handle multi-line private key
let privateKey = '';
const pkMatch = envContent.match(/FIREBASE_PRIVATE_KEY="?([\s\S]*?)"?(?=\n[A-Z_]+=|$)/);
if (pkMatch) {
  privateKey = pkMatch[1].replace(/\\n/g, '\n');
} else {
  // Fallback if not quoted or different format
  const pkLines = envContent.split('FIREBASE_PRIVATE_KEY=')[1].split('\n');
  privateKey = pkLines[0]; // Simplistic fallback
}

// Better private key extraction for this specific file
const pkStart = envContent.indexOf('FIREBASE_PRIVATE_KEY=') + 'FIREBASE_PRIVATE_KEY='.length;
const pkEnd = envContent.indexOf('-----END PRIVATE KEY-----') + '-----END PRIVATE KEY-----'.length;
privateKey = envContent.substring(pkStart, pkEnd).replace(/\\n/g, '\n');

const config = {
  projectId: getEnv('FIREBASE_PROJECT_ID'),
  clientEmail: getEnv('FIREBASE_CLIENT_EMAIL'),
  privateKey: privateKey
};

if (!config.projectId || !config.clientEmail || !config.privateKey) {
  console.error('Missing credentials in .env.local');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(config)
});

const db = admin.firestore();

const DRY_RUN = process.env.DRY_RUN === 'true';

// 2. Load Consolidated products
const productsPath = path.resolve(__dirname, '../all_products.json');
const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));

async function run() {
  console.log(`Starting bulk purchase for ${products.length} products... (DRY_RUN: ${DRY_RUN})`);
  
  const purchaseItems = [];
  let totalCost = 0;
  const BATCH_SIZE = 500;
  let batch = db.batch();
  let count = 0;
  let batchCount = 0;

  for (const doc of products) {
    const productId = doc.name.split('/').pop();
    const fields = doc.fields;
    
    const name = fields.name.stringValue;
    const currentPrice = parseInt(fields.price.integerValue || fields.price.doubleValue || 0);
    const oldStock = parseInt(fields.stock.integerValue || fields.stock.doubleValue || 0);
    
    // Calculate new values
    const markup = 15;
    const quantity = 6;
    const costPrice = Math.round(currentPrice / 1.15);
    const itemTotal = costPrice * quantity;
    
    totalCost += itemTotal;
    
    purchaseItems.push({
      productId,
      productName: name,
      quantity,
      costPrice,
      total: itemTotal,
      price: currentPrice,
      markup
    });

    // Update product document
    const productRef = db.collection('products').doc(productId);
    if (!DRY_RUN) {
      batch.update(productRef, {
        stock: oldStock + quantity,
        costPrice: costPrice,
        markup: markup,
        actualizadoEn: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    count++;
    if (count % BATCH_SIZE === 0) {
      if (!DRY_RUN) await batch.commit();
      batch = db.batch();
      batchCount++;
      console.log(`${DRY_RUN ? 'Processed' : 'Committed'} batch ${batchCount} (${count} products updated)`);
    }
  }

  // Commit remaining product updates
  if (count % BATCH_SIZE !== 0) {
    if (!DRY_RUN) await batch.commit();
    batchCount++;
    console.log(`${DRY_RUN ? 'Processed' : 'Committed'} final batch ${batchCount} (${count} products total)`);
  }

  // 3. Create purchase document
  if (!DRY_RUN) {
    const purchaseRef = db.collection('purchases').doc();
    const now = admin.firestore.FieldValue.serverTimestamp();
    await purchaseRef.set({
      createdAt: now,
      date: now, // For safety/compatibility
      items: purchaseItems,
      total: totalCost,
      itemsCount: purchaseItems.length,
      description: "Compra masiva de 6 unidades por producto (Margen 15%)"
    });
    console.log(`Bulk purchase registered successfully! Purchase ID: ${purchaseRef.id}`);
  } else {
    console.log(`Dry run finished. Would have registered purchase with ${purchaseItems.length} items.`);
  }

  console.log(`Total cost: ${totalCost}`);
  process.exit(0);
}

run().catch(err => {
  console.error('Error executing bulk purchase:', err);
  process.exit(1);
});
