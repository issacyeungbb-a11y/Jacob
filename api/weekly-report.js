// Vercel Serverless Function：喺 server 端代呼叫 Gemini 產生育兒週報。
//
// 點解要 server 端叫：Gemini API 會按請求來源 IP 做地區封鎖（例如香港未支援）。
// 之前週報喺瀏覽器直接叫，Google 見到嘅係用戶所在地 →
//   {"code":400,"message":"User location is not supported for the API use.",
//    "status":"FAILED_PRECONDITION"}
// 改由 Vercel 美國機房（預設 iad1）代叫，Google 見到嘅就係支援地區，唔會再封；
// 順帶亦唔使將 GEMINI_API_KEY 曝露喺前端 bundle。
//
// 收 POST body：{ prompt: string, models?: string[], temperature?: number }
// 回：{ report: string, model: string } 或 { error: string }

import { GoogleGenAI } from '@google/genai';

const DEFAULT_MODELS = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-flash-latest'];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY
    || process.env.VITE_GEMINI_API_KEY
    || process.env.API_KEY
    || '';
  if (!apiKey) {
    return res.status(500).json({ error: '伺服器未設定 GEMINI_API_KEY，請喺 Vercel 環境變數加返。' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  const prompt = body && body.prompt;
  const models = (body && Array.isArray(body.models) && body.models.length) ? body.models : DEFAULT_MODELS;
  const temperature = (body && typeof body.temperature === 'number') ? body.temperature : 0.9;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: '缺少 prompt。' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    let response;
    let usedModel;
    let lastErr;
    // 主用第一個型號；若型號 id 唔存在／唔支援先退到下一個，其他錯誤即刻拋出
    for (const model of models) {
      try {
        response = await ai.models.generateContent({ model, contents: prompt, config: { temperature } });
        usedModel = model;
        break;
      } catch (e) {
        lastErr = e;
        const msg = String((e && e.message) || '');
        if (/not found|not support|does not exist|unknown model|NOT_FOUND|404/i.test(msg)) continue;
        throw e;
      }
    }
    if (!response) throw lastErr || new Error('生成失敗');

    const text = response.text;
    if (!text) {
      return res.status(502).json({ error: 'AI 返回了空白內容。' });
    }
    return res.status(200).json({ report: text, model: usedModel });
  } catch (err) {
    return res.status(502).json({ error: (err && err.message) || String(err) });
  }
}
