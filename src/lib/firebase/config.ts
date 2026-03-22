import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, connectAuthEmulator, GoogleAuthProvider, FacebookAuthProvider } from "firebase/auth";
import { getMessaging } from "firebase/messaging";
import { 
  initializeFirestore, 
  connectFirestoreEmulator, 
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  Firestore
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "dummy-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "tienda-38d40",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

// Initialize Firestore with modern persistent cache (Client-side)
let db: Firestore;
if (typeof window !== "undefined") {
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch (e) {
    // If already initialized (common in development HMR), get existing instance
    db = getFirestore(app);
  }
} else {
  db = getFirestore(app);
}

const storage = getStorage(app);

// Connect to Emulators in development if explicitly requested
if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
  if (window.location.hostname === "localhost" && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true") {
    connectAuthEmulator(auth, "http://localhost:9099");
    connectFirestoreEmulator(db, "localhost", 8080);
    console.log("Conectado a Firebase Emulators");
  }
}

const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();

export const messaging = typeof window !== "undefined" ? getMessaging(app) : null;

export { app, auth, db, storage, googleProvider, facebookProvider };
