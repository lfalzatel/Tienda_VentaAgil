import admin from "firebase-admin";

function formatPrivateKey(key?: string) {
  if (!key) return undefined;
  let formattedKey = key;
  // Remover comillas extras si Vercel las inyecta accidentalmente
  if (formattedKey.startsWith('"') && formattedKey.endsWith('"')) {
    formattedKey = formattedKey.slice(1, -1);
  }
  return formattedKey.replace(/\\n/g, "\n");
}

const firebaseAdminConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY),
};

if (!admin.apps.length) {
  try {
    if (firebaseAdminConfig.privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert(firebaseAdminConfig),
      });
    } else {
      console.warn("API de Firebase: FIREBASE_PRIVATE_KEY no está definida. Saltando inicialización en tiempo de build...");
    }
  } catch (error) {
    console.warn("Fallo crítico al inicializar firebase-admin:", error);
  }
}

const hasApp = admin.apps.length > 0;
const adminAuth = hasApp ? admin.auth() : null as any;
const adminDb = hasApp ? admin.firestore() : null as any;
const adminMessaging = hasApp ? admin.messaging() : null as any;

export { adminAuth, adminDb, adminMessaging };
