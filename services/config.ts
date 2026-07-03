// 中央設定模組
// ----------------------------------------------------------------------------
// 所有「BB 專屬」、Firebase 專案、以及品牌相關嘅值都集中喺呢度，
// 全部由 VITE_* 環境變數提供，並且 fallback 返 Jacob 嘅現有值。
//
// 咁樣同一份 codebase 可以靠唔同部署嘅環境變數服務唔同 BB：
//   - 唔設任何環境變數  → 完全等同現有 Jacob 部署（零影響）
//   - 設咗 VITE_* 變數    → 變成另一個 BB（新名、新 Firebase 專案、新品牌）
//
// 重要：因為系統冇登入認證，每個 BB 必須用「唔同 Firebase 專案 +
// 唔同 collection 前綴」雙重隔離，先唔會撈埋或者互相睇到對方資料。

const env: Record<string, string | undefined> =
  (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};

// 讀取環境變數，若無設定或為 "undefined" 字串則用 fallback
const pick = (key: string, fallback: string): string => {
  const v = env[key];
  return v && v !== 'undefined' ? String(v) : fallback;
};

// ── BB 身份 ──────────────────────────────────────────────────────────────
export const BABY_NAME = pick('VITE_BABY_NAME', 'Jacob');
export const BIRTH_DATE = pick('VITE_BIRTH_DATE', '2025-12-19');
export const BABY_GENDER = pick('VITE_BABY_GENDER', 'male'); // 'male' | 'female'
export const BABY_NATIONALITY = pick('VITE_BABY_NATIONALITY', '中國籍');

// BIRTH_DATE 係 "YYYY-MM-DD" 字串。用 new Date(BIRTH_DATE) 解析會被當做 UTC 午夜，
// 對香港（UTC+8）用戶嚟講即係推遲咗 8 個鐘先「入返新一日」。
// 用 3-參數 constructor 改為本地時區午夜解析，先啱本地日曆日。
export const getBirthDate = (): Date => {
  const [y, m, d] = BIRTH_DATE.split('-').map(Number);
  return new Date(y, m - 1, d);
};

// ── 品牌（標題、PWA、封面相） ─────────────────────────────────────────────
export const APP_TITLE = pick('VITE_APP_TITLE', 'Jacob 成長日記');
export const APP_SHORT_NAME = pick('VITE_APP_SHORT_NAME', 'Jacob日記');
export const PROFILE_IMAGE = pick('VITE_PROFILE_IMAGE', '/jacob.jpg');

// ── Firestore collection 前綴（每個 BB 用唔同前綴做隔離） ────────────────────
// 前綴為 'jacob' 時，以下名稱與現有資料庫完全一致，唔會影響 Jacob 現有資料。
export const DATA_PREFIX = pick('VITE_DATA_PREFIX', 'jacob');
export const COLLECTION_NAME = `${DATA_PREFIX}_logs`;
export const SETTINGS_COLLECTION = `${DATA_PREFIX}_settings`;
export const WEEKLY_REPORTS_COLLECTION = `${DATA_PREFIX}_weekly_reports`;

// ── Firebase 專案設定 ────────────────────────────────────────────────────
export const FIREBASE_CONFIG = {
  apiKey: pick('VITE_FIREBASE_API_KEY', 'AIzaSyA3YcF5I34enfLakA8KayYWt7_t1UojI14'),
  authDomain: pick('VITE_FIREBASE_AUTH_DOMAIN', 'jacob-3ac2a.firebaseapp.com'),
  projectId: pick('VITE_FIREBASE_PROJECT_ID', 'jacob-3ac2a'),
  storageBucket: pick('VITE_FIREBASE_STORAGE_BUCKET', 'jacob-3ac2a.firebasestorage.app'),
  messagingSenderId: pick('VITE_FIREBASE_MESSAGING_SENDER_ID', '206291879020'),
  appId: pick('VITE_FIREBASE_APP_ID', '1:206291879020:web:59041d5e64a2b057590449'),
  measurementId: pick('VITE_FIREBASE_MEASUREMENT_ID', 'G-EYP7S3CM81'),
};
