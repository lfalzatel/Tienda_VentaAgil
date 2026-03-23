const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const getEnv = (key) => {
  const match = envContent.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match ? match[1].trim() : null;
};

const pkStart = envContent.indexOf('FIREBASE_PRIVATE_KEY=') + 'FIREBASE_PRIVATE_KEY='.length;
const pkEnd = envContent.indexOf('-----END PRIVATE KEY-----') + '-----END PRIVATE KEY-----'.length;
const privateKey = envContent.substring(pkStart, pkEnd).replace(/\\n/g, '\n');

const config = {
  projectId: getEnv('FIREBASE_PROJECT_ID'),
  clientEmail: getEnv('FIREBASE_CLIENT_EMAIL'),
  privateKey: privateKey
};

admin.initializeApp({
  credential: admin.credential.cert(config)
});

const db = admin.firestore();

async function verify() {
  const purchaseId = 'zhNDDfEQCdSNREPgrYYA';
  const doc = await db.collection('purchases').doc(purchaseId).get();
  
  if (doc.exists) {
    console.log('Purchase document exists!');
    const data = doc.data();
    console.log('Keys:', Object.keys(data));
    console.log('Total:', data.total);
    console.log('Items Count:', data.itemsCount);
    if (data.date) console.log('Date found:', data.date.toDate());
    if (data.createdAt) console.log('createdAt found:', data.createdAt.toDate());
  } else {
    console.log('Purchase document does NOT exist.');
    
    // Check recent purchases
    const snapshot = await db.collection('purchases').orderBy('date', 'desc').limit(5).get();
    console.log('Recent 5 purchases by "date":');
    snapshot.forEach(d => console.log(d.id, d.data().total, d.data().date?.toDate()));
    
    const snapshot2 = await db.collection('purchases').orderBy('createdAt', 'desc').limit(5).get();
    console.log('Recent 5 purchases by "createdAt":');
    snapshot2.forEach(d => console.log(d.id, d.data().total, d.data().createdAt?.toDate()));
  }
  
  // Check one product
  const prod = await db.collection('products').doc('M9DTZC4wqsCPALlfObhW').get();
  console.log('Product Aceite Girasol 1L stock:', prod.data()?.stock);
  
  process.exit(0);
}

verify().catch(console.error);
