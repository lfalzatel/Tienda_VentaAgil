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

async function checkSales() {
  const snapshot = await db.collection('sales').where('total', '>', 10000000).get();
  console.log(`Found ${snapshot.size} sales > 10M`);
  snapshot.forEach(doc => {
    console.log(`Sale ID: ${doc.id}, Total: ${doc.data().total}, Date: ${doc.data().createdAt?.toDate()}`);
  });
  
  const purchaseSnapshot = await db.collection('purchases').where('total', '>', 10000000).get();
  console.log(`Found ${purchaseSnapshot.size} purchases > 10M`);
  purchaseSnapshot.forEach(doc => {
    console.log(`Purchase ID: ${doc.id}, Total: ${doc.data().total}, Date: ${doc.data().createdAt?.toDate() || doc.data().date?.toDate()}`);
  });

  process.exit(0);
}

checkSales().catch(console.error);
