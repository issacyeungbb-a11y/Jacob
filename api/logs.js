// Vercel Serverless Function：讀取 Firestore 記錄，供外部 AI／工具讀取。
// 讀環境變數（同 services/config.ts 相同 fallback，預設 = Jacob），
// 令 Jacob／Charlie 各自嘅 Vercel 部署自動讀返自己嘅資料，唔使硬編碼。

const pick = (key, fallback) => {
  const v = process.env[key];
  return v && v !== 'undefined' ? String(v) : fallback;
};

const BABY_NAME = pick('VITE_BABY_NAME', 'Jacob');
const BIRTH_DATE = pick('VITE_BIRTH_DATE', '2025-12-19');
const DATA_PREFIX = pick('VITE_DATA_PREFIX', 'jacob');
const PROJECT_ID = pick('VITE_FIREBASE_PROJECT_ID', 'jacob-3ac2a');
const API_KEY = pick('VITE_FIREBASE_API_KEY', 'AIzaSyA3YcF5I34enfLakA8KayYWt7_t1UojI14');

const COLLECTION_NAME = `${DATA_PREFIX}_logs`;
const WEEKLY_REPORTS_COLLECTION = `${DATA_PREFIX}_weekly_reports`;

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

async function fetchAllDocs(collection) {
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const [rawLogs, rawReports] = await Promise.all([
      fetchAllDocs(COLLECTION_NAME),
      fetchAllDocs(WEEKLY_REPORTS_COLLECTION),
    ]);

    const logs = rawLogs
      .filter(l => l.timestamp && l.type)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const reports = rawReports
      .sort((a, b) => (b.weekNum || 0) - (a.weekNum || 0));

    res.status(200).json({
      baby: BABY_NAME,
      birthDate: BIRTH_DATE,
      fetchedAt: new Date().toISOString(),
      totalLogs: logs.length,
      totalReports: reports.length,
      logs,
      weeklyReports: reports,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
