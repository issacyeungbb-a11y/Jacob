const PROJECT_ID = 'jacob-3ac2a';
const API_KEY = 'AIzaSyA3YcF5I34enfLakA8KayYWt7_t1UojI14';
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
      fetchAllDocs('jacob_logs'),
      fetchAllDocs('jacob_weekly_reports'),
    ]);

    const logs = rawLogs
      .filter(l => l.timestamp && l.type)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const reports = rawReports
      .sort((a, b) => (b.weekNum || 0) - (a.weekNum || 0));

    res.status(200).json({
      baby: 'Jacob',
      birthDate: '2025-12-19',
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
