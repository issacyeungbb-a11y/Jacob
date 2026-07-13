// Vercel Serverless Function：MCP（Model Context Protocol）server。
// 令 Claude.ai / ChatGPT 等可以用 custom connector 接入，日常對話直接查 BB 數據。
// 實作：無狀態 Streamable HTTP（JSON-RPC 2.0 over POST），零額外依賴。
// 可選 token：Vercel 設咗 API_SECRET 先生效（Authorization: Bearer / x-api-key / ?key=）。

import {
  BABY_NAME,
  BIRTH_DATE,
  fetchLogs,
  fetchReports,
  checkAuth,
  filterLogs,
  computeStats,
} from './_shared.js';

const PROTOCOL_VERSION = '2025-03-26';

const TOOLS = [
  {
    name: 'get_recent_logs',
    description: `攞 ${BABY_NAME} 最近嘅照顧記錄（餵奶、睡眠、換片、健康、泵奶、成長點滴等），由最新排到最舊。`,
    inputSchema: {
      type: 'object',
      properties: {
        days: { type: 'number', description: '最近幾多日，預設 7' },
        type: { type: 'string', description: '可選記錄類型：FEED（餵奶）/ SLEEP（睡眠）/ DIAPER（換片）/ HEALTH（體重身高頭圍）/ PUMP（媽媽泵奶）/ MILESTONE（成長點滴）/ VACCINE（疫苗）/ SUMMARY（每日總結）/ OTHER' },
        limit: { type: 'number', description: '最多回傳幾多條，預設 100' },
      },
    },
  },
  {
    name: 'get_stats',
    description: `攞 ${BABY_NAME} 嘅統計摘要（餵奶次數/總奶量、各奶類次數、睡眠時數、夜醒、換片、最新體重/身高/頭圍、媽媽泵奶）。日常查詢用呢個最快。`,
    inputSchema: {
      type: 'object',
      properties: {
        days: { type: 'number', description: '統計最近幾多日，預設 7' },
      },
    },
  },
  {
    name: 'get_weekly_reports',
    description: `攞 ${BABY_NAME} 嘅 AI 育兒週報（由最新一週排落去）。`,
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: '最多幾多份，預設 2' },
      },
    },
  },
];

async function callTool(name, args = {}) {
  if (name === 'get_recent_logs') {
    const days = Number(args.days) || 7;
    const limit = Number(args.limit) || 100;
    const logs = filterLogs(await fetchLogs(), { days, type: args.type || '' }).slice(0, limit);
    return { baby: BABY_NAME, birthDate: BIRTH_DATE, days, type: args.type || null, count: logs.length, logs };
  }
  if (name === 'get_stats') {
    const days = Number(args.days) || 7;
    const logs = filterLogs(await fetchLogs(), { days });
    return { baby: BABY_NAME, birthDate: BIRTH_DATE, stats: computeStats(logs, days) };
  }
  if (name === 'get_weekly_reports') {
    const limit = Number(args.limit) || 2;
    const reports = (await fetchReports()).slice(0, limit);
    return { baby: BABY_NAME, count: reports.length, weeklyReports: reports };
  }
  throw new Error(`未知工具：${name}`);
}

const rpcResult = (id, result) => ({ jsonrpc: '2.0', id, result });
const rpcError = (id, code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, Mcp-Session-Id, MCP-Protocol-Version');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!checkAuth(req)) return res.status(401).json({ error: 'unauthorized' });
  // 無狀態實作：唔支援 SSE 長連線／session 終止，按規範對 GET/DELETE 回 405
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const msg = req.body;
  if (!msg || Array.isArray(msg) || typeof msg !== 'object') {
    return res.status(400).json(rpcError(null, -32600, 'Invalid Request：需要單一 JSON-RPC 2.0 物件'));
  }

  const { id, method, params } = msg;

  // 通知（無 id）：確認收到即可
  if (id === undefined || id === null) {
    return res.status(202).end();
  }

  try {
    if (method === 'initialize') {
      return res.status(200).json(rpcResult(id, {
        protocolVersion: (params && params.protocolVersion) || PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: `${BABY_NAME}-baby-tracker`, version: '1.0.0' },
      }));
    }
    if (method === 'ping') {
      return res.status(200).json(rpcResult(id, {}));
    }
    if (method === 'tools/list') {
      return res.status(200).json(rpcResult(id, { tools: TOOLS }));
    }
    if (method === 'tools/call') {
      const { name, arguments: args } = params || {};
      try {
        const data = await callTool(name, args);
        return res.status(200).json(rpcResult(id, {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        }));
      } catch (e) {
        return res.status(200).json(rpcResult(id, {
          content: [{ type: 'text', text: `查詢失敗：${e.message}` }],
          isError: true,
        }));
      }
    }
    return res.status(200).json(rpcError(id, -32601, `Method not found: ${method}`));
  } catch (e) {
    return res.status(200).json(rpcError(id, -32603, `Internal error: ${e.message}`));
  }
}
