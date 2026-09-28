import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  Firestore,
} from 'firebase/firestore';
import { VipClientRecord, VipReferralItem } from '../types/vip';

export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

const STORAGE_KEY_FIREBASE_CONFIG = 'mini_novelas_firebase_config';
const LOCAL_STORAGE_CLIENTS_KEY = 'cineflix_vip_clients_db';
const LOCAL_STORAGE_REFERRALS_KEY = 'mini_novelas_referrals_db';

let appInstance: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;

export function getSavedFirebaseConfig(): FirebaseClientConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FIREBASE_CONFIG);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.apiKey && parsed.projectId) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

export function saveFirebaseConfig(config: FirebaseClientConfig): boolean {
  try {
    localStorage.setItem(STORAGE_KEY_FIREBASE_CONFIG, JSON.stringify(config));
    appInstance = null;
    dbInstance = null;
    return true;
  } catch (err) {
    console.error('Failed to save Firebase config:', err);
    return false;
  }
}

export function removeFirebaseConfig(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_FIREBASE_CONFIG);
    appInstance = null;
    dbInstance = null;
  } catch {
    // ignore
  }
}

export function getFirestoreDb(): Firestore | null {
  if (dbInstance) return dbInstance;

  const config = getSavedFirebaseConfig();
  if (!config || !config.apiKey || !config.projectId) {
    return null;
  }

  try {
    if (getApps().length > 0) {
      appInstance = getApp();
    } else {
      appInstance = initializeApp(config);
    }
    dbInstance = getFirestore(appInstance);
    return dbInstance;
  } catch (error) {
    console.warn('Firebase initialization error:', error);
    return null;
  }
}

export async function testFirebaseConnection(config: FirebaseClientConfig): Promise<{ success: boolean; message: string }> {
  try {
    let testApp: FirebaseApp;
    const appName = `test-app-${Date.now()}`;
    testApp = initializeApp(config, appName);
    const testDb = getFirestore(testApp);

    // Try reading or writing a heartbeat doc
    const testDocRef = doc(testDb, '_system_health', 'ping');
    await setDoc(testDocRef, { timestamp: new Date().toISOString(), status: 'connected' }, { merge: true });

    return {
      success: true,
      message: 'Conexão com o Firebase Firestore realizada com sucesso!',
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || 'Falha ao conectar com o Firebase. Verifique sua chave e projeto.',
    };
  }
}

// -------------------------------------------------------------
// VIP Clients Persistence (Firestore + LocalStorage backup)
// -------------------------------------------------------------

export async function fetchVipClientsFromStorage(): Promise<VipClientRecord[]> {
  const db = getFirestoreDb();
  if (db) {
    try {
      const colRef = collection(db, 'vip_clients');
      const snapshot = await getDocs(colRef);
      if (!snapshot.empty) {
        const records: VipClientRecord[] = [];
        snapshot.forEach((d) => {
          records.push(d.data() as VipClientRecord);
        });
        // Update local backup
        localStorage.setItem(LOCAL_STORAGE_CLIENTS_KEY, JSON.stringify(records));
        return records;
      }
    } catch (err) {
      console.warn('Failed to load from Firestore, falling back to localStorage:', err);
    }
  }

  // Fallback to localStorage
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CLIENTS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }

  return [];
}

export async function persistVipClients(clients: VipClientRecord[]): Promise<boolean> {
  // Always update localStorage immediately
  try {
    localStorage.setItem(LOCAL_STORAGE_CLIENTS_KEY, JSON.stringify(clients));
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }

  // Then try to persist to Firestore if connected
  const db = getFirestoreDb();
  if (!db) return true; // Local success

  try {
    for (const client of clients) {
      const docRef = doc(db, 'vip_clients', client.id);
      await setDoc(docRef, client, { merge: true });
    }
    return true;
  } catch (err) {
    console.warn('Firestore write warning:', err);
    return false;
  }
}

export async function deleteClientFromStorage(clientId: string): Promise<boolean> {
  // Update local storage
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CLIENTS_KEY);
    if (raw) {
      const clients: VipClientRecord[] = JSON.parse(raw);
      const filtered = clients.filter((c) => c.id !== clientId);
      localStorage.setItem(LOCAL_STORAGE_CLIENTS_KEY, JSON.stringify(filtered));
    }
  } catch {
    // ignore
  }

  // Delete from Firestore
  const db = getFirestoreDb();
  if (db) {
    try {
      await deleteDoc(doc(db, 'vip_clients', clientId));
    } catch (err) {
      console.warn('Firestore delete error:', err);
    }
  }
  return true;
}

// -------------------------------------------------------------
// Referral Records Persistence (Firestore + LocalStorage)
// -------------------------------------------------------------

export async function fetchReferralsFromStorage(): Promise<VipReferralItem[]> {
  const db = getFirestoreDb();
  if (db) {
    try {
      const colRef = collection(db, 'vip_referrals');
      const snapshot = await getDocs(colRef);
      if (!snapshot.empty) {
        const records: VipReferralItem[] = [];
        snapshot.forEach((d) => {
          records.push(d.data() as VipReferralItem);
        });
        localStorage.setItem(LOCAL_STORAGE_REFERRALS_KEY, JSON.stringify(records));
        return records;
      }
    } catch (err) {
      console.warn('Failed to load referrals from Firestore:', err);
    }
  }

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_REFERRALS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }

  return [];
}

export async function persistReferrals(referrals: VipReferralItem[]): Promise<boolean> {
  try {
    localStorage.setItem(LOCAL_STORAGE_REFERRALS_KEY, JSON.stringify(referrals));
  } catch {
    // ignore
  }

  const db = getFirestoreDb();
  if (!db) return true;

  try {
    for (const refItem of referrals) {
      const docRef = doc(db, 'vip_referrals', refItem.id);
      await setDoc(docRef, refItem, { merge: true });
    }
    return true;
  } catch (err) {
    console.warn('Firestore referrals write warning:', err);
    return false;
  }
}
