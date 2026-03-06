import { GoogleGenAI } from "@google/genai";
import { BabyLog, LogType } from "../types";
import { BIRTH_DATE, BABY_NAME } from "../constants";

export const generateBabyInsights = async (logs: BabyLog[]): Promise<string> => {
  // Initialize AI client lazily to prevent top-level crashes if env var is missing during initial load
  let ai;
  try {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  } catch (e) {
    console.error("Failed to initialize GoogleGenAI:", e);
    return "系統設定錯誤：找不到 API Key，請檢查環境變數設定。";
  }

  // Filter for last 7 days to keep context relevant and small
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const recentLogs = logs.filter(log => new Date(log.timestamp) > sevenDaysAgo);

  const prompt = `
    你是一位專業、親切的兒科護理助手。
    寶寶的名字是 ${BABY_NAME}，出生於 ${BIRTH_DATE}。
    
    這是過去 7 天的記錄摘要 (JSON 格式):
    ${JSON.stringify(recentLogs.map(l => ({
      type: l.type,
      time: l.timestamp,
      details: l.type === LogType.FEED ? `${(l as any).amountMl}ml` : 
               l.type === LogType.HEALTH ? `重:${(l as any).weightKg}kg` : 
               l.type === LogType.SLEEP ? `${(l as any).durationMinutes}分` : 
               l.type === LogType.OTHER ? `${(l as any).details}` :
               (l as any).status
    })))}

    請提供一份簡短且令人安心的繁體中文摘要 (最多 3 點)，重點關注：
    1. 飲食模式 (總攝取量趨勢)。
    2. 睡眠規律性。
    3. 任何正向的成長指標、健康狀況或其他值得注意的事件。
    
    語氣請保持溫暖和鼓勵。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "目前無法產生分析報告。";
  } catch (error) {
    console.error("Error generating insights:", error);
    return "抱歉，目前無法產生分析。請檢查您的網路連線或 API Key 設定。";
  }
};