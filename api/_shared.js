// /api 共用邏輯：env 讀取（fallback = Jacob，同 services/config.ts 一致）、
// Firestore REST 讀取、記錄過濾、統計計算、可選 token 檢查。
// 檔名以 _ 開頭，Vercel 唔會將佢當成獨立 endpoint。

const pick = (key, fallback) => {
  const v = process.env[key];
  return v && v !== 'undefined' ? String(v) : fallback;
};

export const BABY_NAME = pick('VITE_BABY_NAME', 'Jacob');
export const BIRTH_DATE = pick('VITE_BIRTH_DATE', '2025-12-19');
export const DATA_PREFIX = pick('VITE_DATA_PREFIX', 'jacob');
const PROJECT_ID = pick('VITE_FIREBASE_PROJECT_ID', 'jacob-3ac2a');
const API_KEY = pick('VITE_FIREBASE_API_KEY', 'AIzaSyA3YcF5I34enfLakA8KayYWt7_t1UojI14');

export const COLLECTION_NAME = `${DATA_PREFIX}_logs`;
export const WEEKLY_REPORTS_COLLECTION = `${DATA_PREFIX}_weekly_reports`;

const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function parseValue(v) {
  if (!v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('mapValue' in v) return parseFields(v.mapValue.fields || {});
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(parseValue);
  return null;
}

function parseFields(fields) {
  const obj = {};
  for (const [k, v] of Object.entries(fields)) {
    obj[k] = parseValue(v);
  }
  return obj;
}

export async function fetchAllDocs(collection) {
  const docs = [];
  let pageToken = null;
  do {
    const url = `${BASE_URL}/${collection}?key=${API_KEY}&pageSize=300${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Firestore error: ${res.status}`);
    const data = await res.json();
    for (const doc of (data.documents || [])) {
      docs.push(parseFields(doc.fields || {}));
    }
    pageToken = data.nextPageToken || null;
  } while (pageToken);
  return docs;
}

export async function fetchLogs() {
  const raw = await fetchAllDocs(COLLECTION_NAME);
  return raw
    .filter(l => l.timestamp && l.type)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

export async function fetchReports() {
  const raw = await fetchAllDocs(WEEKLY_REPORTS_COLLECTION);
  return raw.sort((a, b) => (b.weekNum || 0) - (a.weekNum || 0));
}

// 可選 token：Vercel 設咗 API_SECRET 環境變數先至生效；未設定 = 開放（維持現狀）。
// 接受三種方式：?key=、x-api-key header、Authorization: Bearer。
export function checkAuth(req) {
  const secret = process.env.API_SECRET || '';
  if (!secret) return true;
  let queryKey = '';
  try {
    queryKey = new URL(req.url, 'http://localhost').searchParams.get('key') || '';
  } catch (e) {}
  const provided = req.headers['x-api-key']
    || String(req.headers['authorization'] || '').replace(/^Bearer\s+/i, '')
    || queryKey;
  return provided === secret;
}

export function filterLogs(logs, { days, type }) {
  let out = logs;
  const d = Number(days);
  if (d && d > 0) {
    const cutoff = Date.now() - d * 24 * 60 * 60 * 1000;
    out = out.filter(l => new Date(l.timestamp).getTime() > cutoff);
  }
  if (type) {
    const t = String(type).toUpperCase();
    out = out.filter(l => String(l.type).toUpperCase() === t);
  }
  return out;
}

// 統計摘要（同 geminiService 嘅 stats 同一套口徑）
export function computeStats(logs, days) {
  const feeds = logs.filter(l => l.type === 'FEED');
  const sleeps = logs.filter(l => l.type === 'SLEEP');
  const diapers = logs.filter(l => l.type === 'DIAPER');
  const pumps = logs.filter(l => l.type === 'PUMP');
  const summaries = logs.filter(l => l.type === 'SUMMARY');
  const milestones = logs.filter(l => l.type === 'MILESTONE');
  const healths = logs
    .filter(l => l.type === 'HEALTH')
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const latestHealth = healths[0] || {};

  const totalSleepHrs = sleeps.reduce((s, x) => s + (x.durationMinutes || 0), 0) / 60;
  const feedTypeCount = (t) => feeds.filter(f => f.feedType === t).length;

  return {
    "期間": days ? `最近 ${days} 日` : '全部記錄',
    "餵奶次數": feeds.length,
    "餵奶總量ml": feeds.reduce((s, f) => s + (f.amountMl || 0), 0),
    "母乳次數": feedTypeCount('母乳'),
    "親餵次數": feedTypeCount('親餵'),
    "配方奶次數": feedTypeCount('配方奶'),
    "副食品次數": feedTypeCount('副食品'),
    "睡眠段數": sleeps.length,
    "睡眠總時數": Number(totalSleepHrs.toFixed(1)),
    "夜醒次數": summaries.reduce((s, x) => s + (x.nightWakings || 0), 0),
    "換片次數": diapers.length,
    "小便次數": diapers.filter(d => d.status === '小便').length,
    "大便次數": diapers.filter(d => d.status === '大便').length,
    "最新體重kg": latestHealth.weightKg ?? null,
    "最新身高cm": latestHealth.heightCm ?? null,
    "最新頭圍cm": latestHealth.headCircumferenceCm ?? null,
    "里程碑數": milestones.length,
    "媽媽泵奶次數": pumps.length,
    "媽媽泵奶總量ml": pumps.reduce((s, p) => s + (p.amountMl || 0), 0),
  };
}
