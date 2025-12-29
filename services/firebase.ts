import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// 已填入您的 Jacob 專案金鑰
const firebaseConfig = {
  apiKey: "AIzaSyA3YcF5I34enfLakA8KayYWt7_t1UojI14",
  authDomain: "jacob-3ac2a.firebaseapp.com",
  projectId: "jacob-3ac2a",
  storageBucket: "jacob-3ac2a.firebasestorage.app",
  messagingSenderId: "206291879020",
  appId: "1:206291879020:web:59041d5e64a2b057590449",
  measurementId: "G-EYP7S3CM81"
};

// 檢查是否已經設定正確的 Project ID
// 由於您已經提供了正確的 projectId ("jacob-3ac2a")，這裡現在會回傳 true
export const isConfigured = firebaseConfig.projectId !== "your-project-id";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);