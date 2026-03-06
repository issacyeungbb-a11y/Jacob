
import { db } from './firebase';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { BabyLog } from '../types';

const COLLECTION_NAME = 'jacob_logs';
const SETTINGS_COLLECTION = 'jacob_settings';
const PHOTO_DOC_ID = 'profile_photo';
const STATUS_DOC_ID = 'status_sleep';

// 監聽資料庫變更 (即時同步)
export const subscribeToLogs = (onUpdate: (logs: BabyLog[]) => void, onError?: (error: any) => void) => {
  // 使用 Modular SDK 的 query 和 collection
  const q = query(collection(db, COLLECTION_NAME), orderBy("timestamp", "desc"));
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
      const logs: BabyLog[] = [];
      snapshot.forEach((docSnap) => {
        // Skip special status documents if any accidentally got mixed in, though we usually use specific IDs for logs
        if (docSnap.id !== STATUS_DOC_ID) {
          logs.push(docSnap.data() as BabyLog);
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
  const unsubscribe = onSnapshot(doc(db, COLLECTION_NAME, STATUS_DOC_ID), (docSnap) => {
      if (docSnap.exists() && docSnap.data()?.startTime) {
        onUpdate(docSnap.data().startTime);
      } else {
        onUpdate(null);
      }
    });
  return unsubscribe;
};

// 監聽雲端封面照片
export const subscribeToProfilePhoto = (onUpdate: (photoBase64: string | null) => void) => {
  const unsubscribe = onSnapshot(doc(db, SETTINGS_COLLECTION, PHOTO_DOC_ID), (docSnap) => {
      if (docSnap.exists() && docSnap.data()?.image) {
        onUpdate(docSnap.data().image);
      } else {
        onUpdate(null);
      }
    });
  return unsubscribe;
};

// 上傳封面照片到雲端
export const uploadProfilePhotoToCloud = async (base64Image: string) => {
  try {
    await setDoc(doc(db, SETTINGS_COLLECTION, PHOTO_DOC_ID), {
      image: base64Image,
      updatedAt: new Date().toISOString()
    });
  } catch (e) {
    console.error("Error uploading photo:", e);
    throw e;
  }
};

// 刪除雲端封面照片
export const deleteProfilePhotoFromCloud = async () => {
  try {
    await deleteDoc(doc(db, SETTINGS_COLLECTION, PHOTO_DOC_ID));
  } catch (e) {
    console.error("Error deleting photo:", e);
    throw e;
  }
};

// 設定開始睡眠
export const setSleepStatus = async (startTime: string) => {
  try {
    await setDoc(doc(db, COLLECTION_NAME, STATUS_DOC_ID), { startTime });
  } catch (e) {
    console.error("Error setting sleep status:", e);
  }
};

// 清除睡眠狀態 (起床)
export const clearSleepStatus = async () => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, STATUS_DOC_ID));
  } catch (e) {
    console.error("Error clearing sleep status:", e);
  }
};

// 新增記錄 (上傳雲端)
export const addLogToCloud = async (log: BabyLog) => {
  try {
    // 使用 log.id 作為文件的 ID
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
