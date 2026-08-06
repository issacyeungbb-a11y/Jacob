// 一次性資料遷移端點：把 2026-08-05 疑似急性蕁麻疹事件寫入 Jacob 成長日記。
// 完成寫入及核實後會刪除此檔案。

const pick = (key, fallback) => {
  const v = process.env[key];
  return v && v !== 'undefined' ? String(v) : fallback;
};

const PROJECT_ID = pick('VITE_FIREBASE_PROJECT_ID', 'jacob-3ac2a');
const API_KEY = pick('VITE_FIREBASE_API_KEY', 'AIzaSyA3YcF5I34enfLakA8KayYWt7_t1UojI14');
const DATA_PREFIX = pick('VITE_DATA_PREFIX', 'jacob');
const COLLECTION_NAME = `${DATA_PREFIX}_logs`;
const DOC_ID = '20260805_allergy_event';
const CONFIRM_TOKEN = 'record-7f3c1a8e9b24';

const notes = `事件日期：2026-08-05（Jacob 7 個月 17 日）

進食內容
• 約 17:00 進食副食品約 70 g：小麥寶寶麵、比目魚、薯仔、菠菜、蛋黃。
• 薯仔、菠菜及蛋黃過往曾進食；系統未能確認此前曾食過比目魚及同款小麥寶寶麵。

症狀時間線
• 進食後約 30 分鐘，Jacob 由照顧者抱住入睡。
• 進食後約 1 小時，放低時醒來；與平日只短暫捽眼再入睡不同，今次持續用力捽眼並爆喊。
• 再抱睡後，中途再次醒來，仍反覆捽眼及哭鬧。
• 其後見眼周泛紅及眼皮腫；大腿先出現兩個凸起紅色風團，之後腹部、胸口、四肢及面部出現多塊一撻撻、部分凸起的紅疹，外觀及變化較似急性蕁麻疹。
• 沖涼後紅疹沒有明顯增加或減少。
• 飲奶後情緒平靜；其後清醒時精神正常、有笑容，逗弄會笑。
• 全程沒有發燒、嘔吐、呼吸急促、喘鳴或怪聲，未見嘴唇或舌頭腫脹、面青或反應變差。
• 睡一晚後，2026-08-06 早上紅疹及眼部症狀已完全消失，整體回復正常。

相關病史
• 2026-05-25 曾出現一次外觀及發展模式相似的急性蕁麻疹樣事件：面、手、腳快速出現凸起紅斑，睡後逐漸消退，翌日基本消失；當時可能涉及天氣熱、出汗、摩擦或接觸大人進食溫泉蛋後的蛋白殘留，但原因未能確定。

暫時判斷
• 今次較符合急性蕁麻疹／疑似即時型過敏反應，並非單純因眼瞓捽眼所能完全解釋。
• 由於同一餐混合多種食物，不能確認致敏來源；現階段需優先由醫生評估比目魚、小麥及雞蛋（尤其可能混入的蛋白成分），亦要考慮 Jacob 本身容易受熱、出汗、摩擦或其他刺激誘發急性蕁麻疹。
• 此為事件紀錄及初步分析，並非確診。

後續處理
• 暫停比目魚及同款小麥寶寶麵；雞蛋是否暫停及如何重新引入，待兒科／兒童過敏評估。
• 不在家自行重試可疑食物；保留今次與 5 月事件的相片及時間線供醫生參考。
• 若再次出現快速擴散風團、眼唇舌腫、反覆嘔吐、聲沙、咳喘、呼吸困難、面青、突然軟弱或難以叫醒，應立即求醫。`;

function field(value) {
  return { stringValue: value };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (String(req.query?.confirm || '') !== CONFIRM_TOKEN) {
    return res.status(403).json({ error: 'forbidden' });
  }

  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${COLLECTION_NAME}/${DOC_ID}?key=${API_KEY}`;
  const body = {
    fields: {
      id: field(DOC_ID),
      timestamp: field('2026-08-05T10:00:00.000Z'),
      type: field('MILESTONE'),
      title: field('進食後急性蕁麻疹樣反應（疑似食物過敏）'),
      emoji: field('⚠️'),
      notes: field(notes),
    },
  };

  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) {
    return res.status(500).json({ error: 'Firestore write failed', status: response.status, detail: text });
  }

  return res.status(200).json({ ok: true, id: DOC_ID, title: '進食後急性蕁麻疹樣反應（疑似食物過敏）' });
}
