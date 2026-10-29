// Firebase 초기화 — 설정값은 .env.local 의 VITE_FIREBASE_* (docs/firebase-setup.md 5번)
// VITE_USE_EMULATORS=true 이면 로컬 Firebase 에뮬레이터에 연결 (실제 데이터 건드리지 않고 테스트)
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

const env = import.meta.env;
export const USE_EMULATORS = env.VITE_USE_EMULATORS === 'true';

const config = {
  apiKey: env.VITE_FIREBASE_API_KEY || (USE_EMULATORS ? 'demo-key' : ''),
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID || (USE_EMULATORS ? 'demo-postit' : ''),
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

export const CONFIG_MISSING = !config.apiKey || !config.projectId;

export const app = initializeApp(CONFIG_MISSING ? { apiKey: 'missing', projectId: 'missing' } : config);
export const auth = getAuth(app);
export const db = getFirestore(app);

if (USE_EMULATORS) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
