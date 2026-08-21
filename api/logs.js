// Vercel Serverless Function：讀取 Firestore 記錄，供外部 AI／工具讀取。
// 共用邏輯喺 ./_shared.js（env 驅動，Jacob/Charlie 各自部署自動讀自己資料）。
//
// Query 參數（全部可選，唔帶參數 = 舊有完整輸出，向後兼容）：
//   ?days=7      只攞最近 N 日嘅記錄
//   ?type=FEED   只攞某類記錄（FEED/SLEEP/DIAPER/HEALTH/PUMP/MILESTONE/VACCINE/OTHER/SUMMARY）
//   ?summary=1   只回計好嘅統計摘要（最慳 token，啱 AI 日常查詢）
//   ?key=xxx     token（只喺 Vercel 設咗 API_SECRET 環境變數先需要）

import {
  BABY_NAME,
  BIRTH_DATE,
  fetchLogs,
  fetchReports,
  checkAuth,
  filterLogs,
  computeStats,
} from './_shared.js';

// 攞返一批記錄入面最新一條嘅實際時間戳（唔係「查詢嗰刻」，係「資料本身」）；
// 等任何讀者可以自我核對：呢個回應究竟去到幾時嘅記錄。
const latestOf = (arr) => (arr.length ? arr[0].timestamp : null); // arr 已經由新到舊排

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!checkAuth(req)) return res.status(401).json({ error: 'unauthorized：需要有效嘅 key（?key= / x-api-key header）' });

  let params;
  try {
    params = new URL(req.url, 'http://localhost').searchParams;
  } catch (e) {
    params = new URLSearchParams();
  }
  const days = Number(params.get('days')) || 0;
  const type = params.get('type') || '';
  const summaryOnly = params.get('summary') === '1' || params.get('summary') === 'true';

  try {
    const logs = await fetchLogs();

    // ?summary=1：只回統計摘要，唔回原始記錄（最細 payload）
    if (summaryOnly) {
      const scoped = filterLogs(logs, { days: days || 7, type });
      return res.status(200).json({
        baby: BABY_NAME,
        birthDate: BIRTH_DATE,
        fetchedAt: new Date().toISOString(),
        latestTimestamp: latestOf(logs),
        query: { days: days || 7, type: type || null, summary: true },
        stats: computeStats(scoped, days || 7),
      });
    }

    // ?days= / ?type=：過濾後嘅記錄（唔連週報，保持 payload 細）
    if (days || type) {
      const scoped = filterLogs(logs, { days, type });
      return res.status(200).json({
        baby: BABY_NAME,
        birthDate: BIRTH_DATE,
        fetchedAt: new Date().toISOString(),
        latestTimestamp: latestOf(logs),
        query: { days: days || null, type: type || null },
        totalLogs: scoped.length,
        logs: scoped,
      });
    }

    // 無參數：舊有完整輸出（100% 向後兼容）
    const reports = await fetchReports();
    return res.status(200).json({
      baby: BABY_NAME,
      birthDate: BIRTH_DATE,
      fetchedAt: new Date().toISOString(),
      latestTimestamp: latestOf(logs),
      totalLogs: logs.length,
      totalReports: reports.length,
      logs,
      weeklyReports: reports,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
