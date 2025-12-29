import { BabyLog } from '../types';

const STORAGE_KEY = 'jacob_tracker_logs';

export const getLogs = (): BabyLog[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Failed to load logs", e);
    return [];
  }
};

export const saveLogs = (logs: BabyLog[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch (e) {
    console.error("Failed to save logs", e);
  }
};

export const clearLogs = () => {
  localStorage.removeItem(STORAGE_KEY);
};

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