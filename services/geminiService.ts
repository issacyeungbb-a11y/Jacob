import { GoogleGenAI } from "@google/genai";
import { BabyLog, LogType } from "../types";
import { BIRTH_DATE, BABY_NAME } from "../constants";

export const generateBabyInsights = async (logs: BabyLog[]): Promise<string> => {
  const apiKey = process.env.GEMINI_API_KEY || 
                 (import.meta as any).env.VITE_GEMINI_API_KEY || 
                 process.env.API_KEY || 
                 (import.meta as any).env.VITE_API_KEY;
  
  if (!apiKey || apiKey === "undefined" || apiKey === "") {
    return "系統設定錯誤：找不到 API Key，請確保已在 Secrets 或 Vercel 中設定 GEMINI_API_KEY 或 API_KEY。";
  }

  let ai;
  try {
    ai = new GoogleGenAI({ apiKey });
  } catch (e) {
    console.error("Failed to initialize GoogleGenAI:", e);
    return "系統設定錯誤：API Key 初始化失敗，請檢查格式是否正確。";
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
      type: String(l.type || ''),
      time: String(l.timestamp || ''),
      details: l.type === LogType.FEED ? `${(l as any).amountMl}ml` : 
               l.type === LogType.HEALTH ? `重:${(l as any).weightKg}kg` : 
               l.type === LogType.SLEEP ? `${(l as any).durationMinutes}分` : 
               l.type === LogType.OTHER ? String((l as any).details || '') :
               String((l as any).status || '')
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
  } catch (error: any) {
    console.error("Error generating insights:", error);
    const errorMsg = error?.message || "";
    if (errorMsg.includes("API_KEY_INVALID")) {
      return "錯誤：API Key 無效，請檢查您在 Vercel 設定的數值是否正確。";
    }
    return `抱歉，目前無法產生分析。原因：${errorMsg || "網路連線或 API 設定問題"}`;
  }
};

export const generateWeeklyAIReport = async (
  logs: BabyLog[], 
  weekNum: number, 
  months: number, 
  dateStr: string
): Promise<string> => {
  const apiKey = process.env.GEMINI_API_KEY || 
                 (import.meta as any).env.VITE_GEMINI_API_KEY || 
                 process.env.API_KEY || 
                 (import.meta as any).env.VITE_API_KEY;
  
  if (!apiKey || apiKey === "undefined" || apiKey === "") {
    return "系統設定錯誤：找不到 API Key，請確保已在 Secrets 或 Vercel 中設定 GEMINI_API_KEY 或 API_KEY。";
  }

  let ai;
  try {
    ai = new GoogleGenAI({ apiKey });
  } catch (e) {
    console.error("Failed to initialize GoogleGenAI:", e);
    return "系統設定錯誤：API Key 初始化失敗。";
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentLogs = logs.filter(log => new Date(log.timestamp) > sevenDaysAgo);

  const logSummary = JSON.stringify(recentLogs.map(l => ({
    type: String(l.type || ''),
    time: String(l.timestamp || ''),
    details: l.type === LogType.FEED ? `${(l as any).amountMl}ml` : 
             l.type === LogType.HEALTH ? `重:${(l as any).weightKg}kg` : 
             l.type === LogType.SLEEP ? `${(l as any).durationMinutes}分` : 
             l.type === LogType.OTHER ? String((l as any).details || '') :
             String((l as any).status || '')
  })));

  const prompt = `
    你是一位資深且充滿同理心的「幼兒發展與育兒專家」，具備豐富的兒科護理與嬰幼兒心理學知識。

    我的孩子叫 JACOB，於 2025 年 12 月 19 日出生，是一位中國籍男孩。
    今天是 ${dateStr}，Jacob 目前是出生後第 ${weekNum} 週（約 ${months} 個月大）。

    這是 Jacob 過去一週的記錄數據：
    ${logSummary}

    請先根據以上記錄做一個簡短的分析，然後為我提供一份完整的育兒週報，格式如下：

    # 👶 Jacob 第${weekNum}週育兒週報

    📅 當前週數：第${weekNum}週（約${months}個月大）
    （請給予一句簡短的鼓勵）

    ## 🌟 發展四大範疇里程碑
    ### 💪 動作發展
    (粗/細動作表現，請詳細說明)

    ### 🧠 認知發展
    (大腦發育與探索行為，請詳細說明)

    ### 🗣️ 語言溝通
    (發聲與溝通前兆，請詳細說明)

    ### ❤️ 社會情緒
    (情緒表達與依附關係，請詳細說明)

    ## 🍼 本週照顧需要與重點
    ### 🍽️ 飲食餵養
    (奶量、副食品進度或注意事項，請詳細說明)

    ### 💤 睡眠作息
    (睡眠總時數、日夜作息建議，請詳細說明)

    ### 🛡️ 護理與安全
    (當週特別需要的生理護理或環境防護，請詳細說明)

    ## 🧸 親子互動建議
    (具體可行的互動方式或小遊戲，1-2個，請詳細說明)

    ## 💡 專家小叮囑
    (本週特別需要注意的事項或疑苗/健檢提醒，請詳細說明)

    資訊必須具備科學根據與醫學正確性（參考 WHO 或兒科醫學會指引）。
    語氣溫暖、鼓勵、具同理心。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "目前無法產生週報。";
  } catch (error) {
    console.error("Error generating weekly report:", error);
    return "抱歉，目前無法產生週報。請檢查您的網路連線或 API Key 設定。";
  }
};
