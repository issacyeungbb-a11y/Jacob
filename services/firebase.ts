
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { FIREBASE_CONFIG } from "./config";

// Firebase 專案設定由 services/config.ts 提供（環境變數驅動，fallback 返 Jacob）
// 檢查是否已經設定正確的 Project ID
export const isConfigured = FIREBASE_CONFIG.projectId !== "your-project-id";

// Initialize Firebase with Modular SDK
const app = initializeApp(FIREBASE_CONFIG);
export const db = getFirestore(app);
