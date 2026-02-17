import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim(),
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Extended global interface for development cache
declare global {
  var _firebaseApp: ReturnType<typeof initializeApp> | undefined;
  var _firebaseAuth: ReturnType<typeof getAuth> | undefined;
  var _firebaseDb: ReturnType<typeof getFirestore> | undefined;
  var _firebaseStorage: ReturnType<typeof getStorage> | undefined;
}

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

if (process.env.NODE_ENV === 'production') {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
  db = getFirestore(app);
  try {
    storage = getStorage(app);
  } catch (error) {
    console.warn("Firebase Storage initialization failed:", error);
  }
} else {
  // In development, use global variables to prevent re-initialization during HMR
  if (!globalThis._firebaseApp) {
    globalThis._firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  }
  app = globalThis._firebaseApp;

  if (!globalThis._firebaseAuth) {
    globalThis._firebaseAuth = getAuth(app);
  }
  auth = globalThis._firebaseAuth;

  if (!globalThis._firebaseDb) {
    globalThis._firebaseDb = getFirestore(app);
  }
  db = globalThis._firebaseDb;

  if (!globalThis._firebaseStorage) {
    try {
      globalThis._firebaseStorage = getStorage(app);
    } catch (error) {
      console.warn("Firebase Storage initialization failed:", error);
    }
  }
  storage = globalThis._firebaseStorage!;
}

export { app, auth, db, storage };
