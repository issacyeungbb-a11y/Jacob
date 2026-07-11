import { GoogleGenAI } from "@google/genai";
import { BabyLog, LogType, FeedType, DiaperType, FeedLog, SleepLog, DiaperLog, HealthLog, SummaryLog, MilestoneLog, OtherLog, VaccineLog, PumpLog } from "../types";
import { BIRTH_DATE, BABY_NAME, BABY_GENDER, BABY_NATIONALITY } from "./config";
import { HK_VACCINES, MILESTONES } from "../constants";

export const generateWeeklyAIReport = async (
  logs: BabyLog[], 
  weekNum: number, 
  months: number, 
  dateStr: string
): Promise<string> => {
  let apiKey = "";
  try {
    if (typeof (import.meta as any).env !== 'undefined') {
      apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY || (import.meta as any).env.VITE_API_KEY || "";
    }
  } catch (e) {}

  if (!apiKey) {
    try {
      if (typeof process !== 'undefined' && process.env) {
        apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || "";
      }
    } catch (e) {}
  }
  
  if (!apiKey || apiKey === "undefined" || apiKey === "") {
    throw new Error("系統設定錯誤：找不到 API Key，請確保已在 Secrets 或 Vercel 中設定 GEMINI_API_KEY 或 API_KEY。");
  }

  let ai;
  try {
    ai = new GoogleGenAI({ apiKey });
  } catch (e) {
    console.error("Failed to initialize GoogleGenAI:", e);
    throw new Error("系統設定錯誤：API Key 初始化失敗。");
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const recentLogs = logs.filter(log => new Date(log.timestamp) > sevenDaysAgo);
  // 上一個 7 日（8–14 日前），畀 AI 做本週 vs 上週對比
  const prevWeekLogs = logs.filter(log => {
    const t = new Date(log.timestamp);
    return t > fourteenDaysAgo && t <= sevenDaysAgo;
  });

  const fmtDate = (ts: string) => {
    try { return new Date(ts).toLocaleDateString('zh-HK', { month: 'numeric', day: 'numeric' }); }
    catch { return ''; }
  };

  const logSummary = JSON.stringify(recentLogs.map(l => ({
    type: String(l.type || ''),
    time: String(l.timestamp || ''),
    details: l.type === LogType.FEED ? `${(l as FeedLog).amountMl ?? ''}ml ${(l as FeedLog).feedType || ''}` :
             l.type === LogType.HEALTH ? `重:${(l as HealthLog).weightKg ?? '-'}kg 高:${(l as HealthLog).heightCm ?? '-'}cm` :
             l.type === LogType.SLEEP ? `${(l as SleepLog).durationMinutes ?? 0}分` :
             l.type === LogType.PUMP ? `泵奶 ${(l as PumpLog).amountMl ?? 0}ml/${(l as PumpLog).durationMinutes ?? 0}分` :
             l.type === LogType.OTHER ? String((l as OtherLog).details || '') :
             String((l as any).status || (l as any).title || '')
  })));

  // ── 分類本週記錄，計統計 + 抽出家長記低嘅特別事件 ──────────────────────
  const feeds = recentLogs.filter(l => l.type === LogType.FEED) as FeedLog[];
  const sleeps = recentLogs.filter(l => l.type === LogType.SLEEP) as SleepLog[];
  const diapers = recentLogs.filter(l => l.type === LogType.DIAPER) as DiaperLog[];
  const healths = (recentLogs.filter(l => l.type === LogType.HEALTH) as HealthLog[])
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const summaries = recentLogs.filter(l => l.type === LogType.SUMMARY) as SummaryLog[];
  const milestones = recentLogs.filter(l => l.type === LogType.MILESTONE) as MilestoneLog[];
  const others = recentLogs.filter(l => l.type === LogType.OTHER) as OtherLog[];
  const vaccines = recentLogs.filter(l => l.type === LogType.VACCINE) as VaccineLog[];
  const pumps = recentLogs.filter(l => l.type === LogType.PUMP) as PumpLog[];

  const totalMl = feeds.reduce((s, f) => s + (f.amountMl || 0), 0);
  const totalSleepHrs = sleeps.reduce((s, x) => s + (x.durationMinutes || 0), 0) / 60;
  const nightWakings = summaries.reduce((s, x) => s + (x.nightWakings || 0), 0);
  const latestHealth = healths[0];

  const stats = {
    "期間": "最近 7 日",
    "餵奶次數": feeds.length,
    "餵奶總量ml": totalMl,
    "母乳次數": feeds.filter(f => f.feedType === FeedType.BREAST).length,
    "親餵次數": feeds.filter(f => f.feedType === FeedType.DIRECT).length,
    "配方奶次數": feeds.filter(f => f.feedType === FeedType.FORMULA).length,
    "副食品次數": feeds.filter(f => f.feedType === FeedType.SOLIDS).length,
    "睡眠段數": sleeps.length,
    "睡眠總時數": Number(totalSleepHrs.toFixed(1)),
    "平均每日睡眠時數": Number((totalSleepHrs / 7).toFixed(1)),
    "夜醒次數": nightWakings,
    "換片次數": diapers.length,
    "小便次數": diapers.filter(d => d.status === DiaperType.WET).length,
    "大便次數": diapers.filter(d => d.status === DiaperType.DIRTY).length,
    "最新體重kg": latestHealth?.weightKg ?? null,
    "最新身高cm": latestHealth?.heightCm ?? null,
    "最新頭圍cm": latestHealth?.headCircumferenceCm ?? null,
    "里程碑數": milestones.length,
    "媽媽泵奶次數": pumps.length,
    "媽媽泵奶總量ml": pumps.reduce((s, p) => s + (p.amountMl || 0), 0),
  };

  // ── 上週（8–14 日前）統計，畀 AI 對比 ──────────────────────────────────
  const pFeeds = prevWeekLogs.filter(l => l.type === LogType.FEED) as FeedLog[];
  const pSleeps = prevWeekLogs.filter(l => l.type === LogType.SLEEP) as SleepLog[];
  const pDiapers = prevWeekLogs.filter(l => l.type === LogType.DIAPER) as DiaperLog[];
  const pSummaries = prevWeekLogs.filter(l => l.type === LogType.SUMMARY) as SummaryLog[];
  const pPumps = prevWeekLogs.filter(l => l.type === LogType.PUMP) as PumpLog[];
  const prevStats = prevWeekLogs.length === 0 ? null : {
    "期間": "上一個 7 日（8–14 日前）",
    "餵奶次數": pFeeds.length,
    "餵奶總量ml": pFeeds.reduce((s, f) => s + (f.amountMl || 0), 0),
    "睡眠總時數": Number((pSleeps.reduce((s, x) => s + (x.durationMinutes || 0), 0) / 60).toFixed(1)),
    "夜醒次數": pSummaries.reduce((s, x) => s + (x.nightWakings || 0), 0),
    "換片次數": pDiapers.length,
    "媽媽泵奶次數": pPumps.length,
    "媽媽泵奶總量ml": pPumps.reduce((s, p) => s + (p.amountMl || 0), 0),
  };

  // ── 記錄缺口 + 疫苗到期（用全部歷史記錄計，唔止最近 7 日） ─────────────────
  const allWeights = (logs.filter(l => l.type === LogType.HEALTH && (l as HealthLog).weightKg) as HealthLog[])
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const daysSinceWeight = allWeights.length
    ? Math.floor((Date.now() - new Date(allWeights[0].timestamp).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const recordedVaccineIds = new Set((logs.filter(l => l.type === LogType.VACCINE) as VaccineLog[]).map(v => v.vaccineId));
  const dueVaccines = HK_VACCINES
    .filter(v => v.month <= months && !recordedVaccineIds.has(v.id))
    .map(v => `${v.name}（${v.month} 個月齡）`);

  const careAlerts: string[] = [];
  if (daysSinceWeight === null) careAlerts.push('未有任何體重記錄');
  else if (daysSinceWeight >= 14) careAlerts.push(`已 ${daysSinceWeight} 日未有磅過體重`);
  if (dueVaccines.length) careAlerts.push(`按月齡已到期但未有接種記錄嘅疫苗：${dueVaccines.join('、')}`);
  const careAlertsText = careAlerts.length ? careAlerts.map(s => `- ${s}`).join('\n') : '（暫無）';

  const notable: string[] = [];
  milestones.forEach(m => {
    const name = m.title || (m.milestoneId ? MILESTONES.find(x => x.id === m.milestoneId)?.name : '') || '成長點滴';
    notable.push(`🌟 ${m.emoji || ''}${name}${m.notes ? ` — ${m.notes}` : ''}（${fmtDate(m.timestamp)}）`);
  });
  feeds.filter(f => f.solidFoodName).forEach(f => {
    notable.push(`🥣 副食品：${f.solidFoodName}${f.solidFoodAmount ? ` ${f.solidFoodAmount}` : ''}（${fmtDate(f.timestamp)}）`);
  });
  vaccines.forEach(v => {
    const vn = HK_VACCINES.find(x => x.id === v.vaccineId)?.name || v.vaccineId;
    notable.push(`💉 接種疫苗：${vn}（${fmtDate(v.timestamp)}）`);
  });
  others.forEach(o => {
    if (o.details) notable.push(`📝 ${o.details}（${fmtDate(o.timestamp)}）`);
  });
  recentLogs.forEach(l => {
    if (l.notes && l.type !== LogType.MILESTONE && l.type !== LogType.OTHER) {
      notable.push(`🗒️ ${l.notes}（${fmtDate(l.timestamp)}）`);
    }
  });
  const notableText = notable.length ? notable.join('\n') : '（本週未有特別文字記錄）';

  const [birthYear, birthMonth, birthDay] = BIRTH_DATE.split('-');
  const birthDateCn = `${birthYear} 年 ${Number(birthMonth)} 月 ${Number(birthDay)} 日`;
  const genderCn = BABY_GENDER === 'female' ? '女孩' : '男孩';

  const prompt = `
你是一位資深、實事求是嘅「幼兒發展與育兒專家」，具備豐富嘅兒科護理與嬰幼兒心理學知識。
你嘅職責唔係氹家長開心，而係幫佢哋掌握發展現況、及早發現需要留意嘅地方。

我的孩子叫 ${BABY_NAME}，於 ${birthDateCn} 出生，是一位${BABY_NATIONALITY}${genderCn}。
今天是 ${dateStr}，${BABY_NAME} 目前是出生後第 ${weekNum} 週（約 ${months} 個月大）。

以下係 ${BABY_NAME} 嘅實際記錄：

【本週數據統計（最近 7 日）】
${JSON.stringify(stats, null, 2)}

【上週數據統計（8–14 日前）】
${prevStats ? JSON.stringify(prevStats, null, 2) : '（上週未有記錄，本週對比部分請講明無從對比）'}

【系統偵測到嘅記錄缺口／疫苗提示】
${careAlertsText}

【家長親自記低嘅特別時刻／備註／事件】
${notableText}

【原始記錄摘要】
${logSummary}

寫作要求（非常重要）：
1. **實事求是**：讚美／正面內容最多佔全文三成，其餘必須係觀察、對比、分析、提醒。唔好每段都以讚美開頭。
2. 必須根據實際數據寫「本週」嘅具體情況，唔好講空泛、每週都一樣嘅教科書式內容；數據少就老實聚焦喺有記錄嘅嘢，切勿虛構未發生嘅事。
3. 「⚠️ 本週要留意」係必填：必須寫 1–3 項，唔准寫「一切正常、無嘢留意」；若數據全部理想，就預告下一階段常見嘅問題／坑位畀家長提前準備。上面【系統偵測到嘅記錄缺口／疫苗提示】如有內容，必須喺呢一段提及。
4. 每個發展範疇都必須包含「未見到／要繼續觀察」嘅位，唔可以齋讚。
5. 引用返家長親自記低嘅特別時刻／備註（如有）。
6. 所有判斷要有科學根據與醫學正確性（參考 WHO 或兒科醫學會指引）；語氣關懷、專業，但唔奉承。

請用以下格式輸出（Markdown，繁體中文）：

# 👶 ${BABY_NAME} 第${weekNum}週育兒週報

📅 當前週數：第${weekNum}週（約${months}個月大）
（一句貼合本週數據嘅簡短開場，唔係無條件讚美）

## 📌 本週最值得留意嘅 1–3 件事
（好壞都計：由實際數據同家長記錄揀出本週最突出嘅 1 至 3 個重點）

## 📊 本週 vs 上週
（逐項對比奶量／睡眠時數／夜醒／換片／泵奶：升定跌、幅度幾多、邊啲變化屬正常波動、邊啲值得跟進；如上週無數據就講明無從對比）

## ⚠️ 本週要留意
（必填 1–3 項潛在隱憂或警惕位；包括系統偵測到嘅記錄缺口／疫苗提示（如有））

## 🌟 發展里程觀察
### 🦵 大肌肉
### ✋ 細肌肉
### 🧠 認知
### 🗣️ 語言溝通
### ❤️ 社交情緒
（每個範疇跟三段式寫：
 ① 呢個週齡／月齡「典型應有或即將出現」嘅表現，畀具體例子；
 ② 對照本週實際記錄，見到啲咩；
 ③ 未見到／要繼續觀察嘅位——每個範疇必須有呢一段）

## 🍼 本週照顧重點
### 🍽️ 飲食餵養（結合本週＋對比數據）
### 💤 睡眠作息（結合睡眠時數／夜醒數據）
### 🛡️ 護理與安全

## 🧪 本週小實驗（新嘗試）
（一個具體、啱約 ${months} 個月大、同過往唔同嘅親子遊戲或刺激活動）

## 🔭 下週觀察清單
（3 項具體、可覆盤嘅觀察任務，方便下週對照返有無做到／有無出現）

## 💡 專家小叮囑
（疫苗／健檢提醒＋本週特別需要注意嘅事項）
  `;

  try {
    // 主用 Gemini 3 Flash（性價比最佳、免費層 cover）；若型號 id 唔存在則退到最新穩定 Flash
    const models = ['gemini-3-flash', 'gemini-flash-latest'];
    let response: any;
    let lastErr: any;
    for (const model of models) {
      try {
        response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: { temperature: 0.9 },
        });
        break;
      } catch (e: any) {
        lastErr = e;
        const msg = String(e?.message || '');
        // 只喺「型號唔存在／唔支援」先試下一個；其他錯誤即刻拋出
        if (/not found|not support|does not exist|unknown model|NOT_FOUND|404/i.test(msg)) continue;
        throw e;
      }
    }
    if (!response) throw lastErr || new Error("生成失敗");

    if (!response.text) {
        throw new Error("AI 返回了空白內容。");
    }
    return response.text;
  } catch (error: any) {
    console.error("Error generating weekly report:", error);
    const errorMsg = error?.message || "";
    if (errorMsg.includes("API_KEY_INVALID")) {
      throw new Error("錯誤：API Key 無效，請檢查設定是否正確。");
    }
    if (errorMsg.includes("503") || errorMsg.includes("UNAVAILABLE")) {
      throw new Error("抱歉，AI 伺服器目前太過繁忙（503 錯誤）。這通常是暫時性的，請稍後再試。");
    }
    throw new Error(`抱歉，目前無法產生週報。原因：${errorMsg || "網路連線或 API 設定問題"}`);
  }
};
