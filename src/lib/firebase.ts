import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager, 
  doc, 
  getDocFromServer 
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfigJson from '../../firebase-applet-config.json';

// Use environment variables if present, fallback to local configuration parameters.
const metaEnv = (import.meta as any).env || {};
const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || firebaseConfigJson.apiKey,
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigJson.authDomain,
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || firebaseConfigJson.projectId,
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigJson.storageBucket,
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigJson.messagingSenderId,
  appId: metaEnv.VITE_FIREBASE_APP_ID || firebaseConfigJson.appId,
  measurementId: metaEnv.VITE_FIREBASE_MEASUREMENT_ID || firebaseConfigJson.measurementId,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with robust multi-tab persistent offline caching
let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  }, (firebaseConfigJson as any).firestoreDatabaseId || undefined);
} catch (error) {
  console.warn("Failed to initialize Firestore with persistentLocalCache. Falling back to default getFirestore initialization.", error);
  firestoreDb = getFirestore(app, (firebaseConfigJson as any).firestoreDatabaseId || undefined);
}

export const db = firestoreDb;
export const auth = getAuth(app);
export const storage = getStorage(app);

// Export network offline & retry observer to notify application state change
export type NetworkChangeListener = (isOffline: boolean) => void;
const networkListeners = new Set<NetworkChangeListener>();

let isOfflineState = typeof navigator !== 'undefined' ? !navigator.onLine : false;

export function getOfflineStatus(): boolean {
  return isOfflineState;
}

export function subscribeToNetworkChange(listener: NetworkChangeListener): () => void {
  networkListeners.add(listener);
  // Call immediately with current state
  listener(isOfflineState);
  return () => {
    networkListeners.delete(listener);
  };
}

function updateNetworkState(offline: boolean) {
  if (isOfflineState !== offline) {
    isOfflineState = offline;
    networkListeners.forEach(listener => {
      try {
        listener(isOfflineState);
      } catch (e) {
        console.error("Error in network status listener:", e);
      }
    });
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => updateNetworkState(false));
  window.addEventListener('offline', () => updateNetworkState(true));
}

// Connectivity check as requested in Firebase Skill
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('offline') || msg.includes('unavailable') || msg.includes('could not reach')) {
        console.warn("Firestore is operating in offline mode: " + error.message);
      } else {
        console.info("Firestore connection check: " + error.message);
      }
    }
  }
}
testConnection();

