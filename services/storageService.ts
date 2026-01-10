
import { db } from './firebase';
import { BabyLog } from '../types';

const COLLECTION_NAME = 'jacob_logs';
const STATUS_DOC_ID = 'status_sleep'; // Special document to track active sleep

// 監聽資料庫變更 (即時同步)
export const subscribeToLogs = (onUpdate: (logs: BabyLog[]) => void, onError?: (error: any) => void) => {
  // Filter out the status document from the main log list
  const unsubscribe = db.collection(COLLECTION_NAME)
    .orderBy("timestamp", "desc")
    .onSnapshot((snapshot) => {
      const logs: BabyLog[] = [];
      snapshot.forEach((doc) => {
        // Skip special status documents
        if (doc.id !== STATUS_DOC_ID) {
          logs.push(doc.data() as BabyLog);
        }
      });
      onUpdate(logs);
    }, (error) => {
      console.error("Firebase sync error:", error);
      if (onError) onError(error);
    });

  return unsubscribe;
};

// 監聽睡眠狀態
export const subscribeToSleepStatus = (onUpdate: (startTime: string | null) => void) => {
  const unsubscribe = db.collection(COLLECTION_NAME).doc(STATUS_DOC_ID)
    .onSnapshot((doc) => {
      if (doc.exists && doc.data()?.startTime) {
        onUpdate(doc.data().startTime);
      } else {
        onUpdate(null);
      }
    });
  return unsubscribe;
};

// 設定開始睡眠
export const setSleepStatus = async (startTime: string) => {
  try {
    await db.collection(COLLECTION_NAME).doc(STATUS_DOC_ID).set({ startTime });
  } catch (e) {
    console.error("Error setting sleep status:", e);
  }
};

// 清除睡眠狀態 (起床)
export const clearSleepStatus = async () => {
  try {
    await db.collection(COLLECTION_NAME).doc(STATUS_DOC_ID).delete();
  } catch (e) {
    console.error("Error clearing sleep status:", e);
  }
};

// 新增記錄 (上傳雲端)
export const addLogToCloud = async (log: BabyLog) => {
  try {
    // 使用 log.id 作為文件的 ID，避免重複
    await db.collection(COLLECTION_NAME).doc(log.id).set(log);
  } catch (e) {
    console.error("Error adding document: ", e);
    alert("儲存失敗，請檢查網路連線");
  }
};

// 刪除記錄 (雲端刪除)
export const deleteLogFromCloud = async (id: string) => {
  try {
    await db.collection(COLLECTION_NAME).doc(id).delete();
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
