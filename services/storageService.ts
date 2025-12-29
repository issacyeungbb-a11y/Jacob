import { db } from './firebase';
import { 
  collection, 
  setDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy 
} from "firebase/firestore";
import { BabyLog } from '../types';

const COLLECTION_NAME = 'jacob_logs';

// 監聽資料庫變更 (即時同步)
export const subscribeToLogs = (onUpdate: (logs: BabyLog[]) => void) => {
  const q = query(collection(db, COLLECTION_NAME), orderBy("timestamp", "desc"));
  
  // onSnapshot 會在資料庫有任何變動時自動觸發
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const logs: BabyLog[] = [];
    snapshot.forEach((doc) => {
      logs.push(doc.data() as BabyLog);
    });
    onUpdate(logs);
  }, (error) => {
    console.error("Firebase sync error:", error);
  });

  return unsubscribe;
};

// 新增記錄 (上傳雲端)
export const addLogToCloud = async (log: BabyLog) => {
  try {
    // 使用 log.id 作為文件的 ID，避免重複
    await setDoc(doc(db, COLLECTION_NAME, log.id), log);
  } catch (e) {
    console.error("Error adding document: ", e);
    alert("儲存失敗，請檢查網路連線");
  }
};

// 刪除記錄 (雲端刪除)
export const deleteLogFromCloud = async (id: string) => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (e) {
    console.error("Error removing document: ", e);
    alert("刪除失敗，請檢查網路連線");
  }
};

// 匯出備份 (保留功能)
export const exportLogsToJSON = (logs: BabyLog[]) => {
  const dataStr = JSON.stringify(logs, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `jacob_logs_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};