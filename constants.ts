
import { BABY_GENDER } from './services/config';

// 注意：BABY_NAME / BIRTH_DATE 已搬去 services/config.ts（環境變數驅動）。

// 定義夜間睡眠時段 (24小時制)
export const NIGHT_START_HOUR = 21; // 晚上 9 點
export const NIGHT_END_HOUR = 9;    // 早上 9 點

export const APP_COLORS = {
  primary: "blue-500",
  secondary: "indigo-500",
  accent: "amber-400",
  bg: "slate-50",
};

// WHO Child Growth Standards (Boys, 0-12 months) - Median (50th percentile)
// Source: World Health Organization (WHO)
export const WHO_BOYS_MEDIAN = {
  WEIGHT: [3.3, 4.5, 5.6, 6.4, 7.0, 7.5, 7.9, 8.3, 8.6, 8.9, 9.2, 9.4, 9.6], // kg
  HEIGHT: [49.9, 54.7, 58.4, 61.4, 63.9, 65.9, 67.6, 69.2, 70.6, 72.0, 73.3, 74.5, 75.7], // cm
  HEAD: [34.5, 37.3, 39.1, 40.5, 41.5, 42.2, 42.8, 43.3, 43.8, 44.2, 44.6, 44.9, 45.3] // cm
};

// WHO Child Growth Standards (Girls, 0-12 months) - Median (50th percentile)
// Source: World Health Organization (WHO)
export const WHO_GIRLS_MEDIAN = {
  WEIGHT: [3.2, 4.2, 5.1, 5.8, 6.4, 6.9, 7.3, 7.6, 7.9, 8.2, 8.5, 8.7, 8.9], // kg
  HEIGHT: [49.1, 53.7, 57.1, 59.8, 62.1, 64.0, 65.7, 67.3, 68.7, 70.1, 71.5, 72.8, 74.0], // cm
  HEAD: [33.9, 36.5, 38.3, 39.5, 40.6, 41.5, 42.2, 42.8, 43.4, 43.8, 44.2, 44.6, 44.9] // cm
};

// 根據 BB 性別選用對應嘅 WHO 生長標準（成長曲線基準線）
export const WHO_MEDIAN = BABY_GENDER === 'female' ? WHO_GIRLS_MEDIAN : WHO_BOYS_MEDIAN;

// HK Department of Health - Childhood Immunisation Programme
// Source: Family Health Service, Department of Health, HKSAR
// 「香港兒童免疫接種計劃」母嬰健康院提供嘅部分（初生至 18 個月）。
// 資料來源：衞生署家庭健康服務／衞生防護中心「疫苗可預防疾病科學委員會」
// 建議時間表（2024-10-09 更新）；肺炎球菌疫苗自 2024-08-05 起由十三價改為十五價。
//
// 兩個容易記錯嘅位：
//  · 肺炎球菌疫苗係 2、4 個月打針，12 個月打加強劑 —— 六個月嗰針係冇嘅。
//  · 18 個月除咗白喉混合疫苗加強劑，2018-07-01 或之後出世嘅小朋友
//    仲會喺母嬰健康院打麻疹、腮腺炎、德國麻疹及水痘混合疫苗（舊 cohort 先留到小一打）。
export const HK_VACCINES = [
  { id: 'v_0_1', month: 0, name: '卡介苗 (BCG)' },
  { id: 'v_0_2', month: 0, name: '乙型肝炎疫苗 - 第一次' },
  { id: 'v_1_1', month: 1, name: '乙型肝炎疫苗 - 第二次' },
  { id: 'v_2_1', month: 2, name: '白喉、破傷風、無細胞型百日咳及滅活小兒麻痺混合疫苗 - 第一次' },
  { id: 'v_2_2', month: 2, name: '十五價肺炎球菌結合疫苗 - 第一次' },
  { id: 'v_4_1', month: 4, name: '白喉、破傷風、無細胞型百日咳及滅活小兒麻痺混合疫苗 - 第二次' },
  { id: 'v_4_2', month: 4, name: '十五價肺炎球菌結合疫苗 - 第二次' },
  { id: 'v_6_1', month: 6, name: '白喉、破傷風、無細胞型百日咳及滅活小兒麻痺混合疫苗 - 第三次' },
  { id: 'v_6_3', month: 6, name: '乙型肝炎疫苗 - 第三次' },
  { id: 'v_12_1', month: 12, name: '麻疹、流行性腮腺炎及德國麻疹混合疫苗 - 第一次' },
  { id: 'v_12_2', month: 12, name: '十五價肺炎球菌結合疫苗 - 加強劑' },
  { id: 'v_12_3', month: 12, name: '水痘疫苗 - 第一次' },
  { id: 'v_18_1', month: 18, name: '白喉、破傷風、無細胞型百日咳及滅活小兒麻痺混合疫苗 - 加強劑' },
  { id: 'v_18_2', month: 18, name: '麻疹、流行性腮腺炎、德國麻疹及水痘混合疫苗 - 第二次' },
];

// 曾經喺清單出現、之後修正咗嘅 id。舊記錄照樣顯示返個名，
// 唔會變成一串認唔到嘅 id。
export const LEGACY_VACCINE_NAMES: Record<string, string> = {
  v_6_2: '肺炎球菌疫苗 - 第三次（已修訂：香港計劃喺 2、4 個月接種，12 個月打加強劑）',
};

// CDC / HK FHS Milestones
// Source: CDC (Centers for Disease Control and Prevention) & HK FHS
export const MILESTONES = [
  // 2 個月
  { id: 'm_2_1', month: 2, category: '社交/情緒', name: '會對著人微笑' },
  { id: 'm_2_2', month: 2, category: '語言/溝通', name: '會發出咕嚕聲或咕咕聲' },
  { id: 'm_2_3', month: 2, category: '認知', name: '會注視移動中的物體' },
  { id: 'm_2_4', month: 2, category: '大肌肉', name: '趴著時能抬起頭' },
  { id: 'm_2_5', month: 2, category: '細肌肉', name: '手部會張開，不再整天握拳' },
  
  // 4 個月
  { id: 'm_4_1', month: 4, category: '社交/情緒', name: '會主動微笑，喜歡和人玩' },
  { id: 'm_4_2', month: 4, category: '語言/溝通', name: '開始牙牙學語，會模仿聲音' },
  { id: 'm_4_3', month: 4, category: '認知', name: '會用手抓玩具，並放進嘴裡' },
  { id: 'm_4_4', month: 4, category: '大肌肉', name: '頭部能保持穩定，不需要支撐' },
  { id: 'm_4_5', month: 4, category: '大肌肉', name: '趴著時能用手肘撐起上半身' },
  { id: 'm_4_6', month: 4, category: '細肌肉', name: '能伸手抓握懸掛的玩具' },

  // 6 個月
  { id: 'm_6_1', month: 6, category: '社交/情緒', name: '認識熟悉的人，對陌生人有反應' },
  { id: 'm_6_2', month: 6, category: '語言/溝通', name: '發出連串輔音 (如 ba-ba, da-da)' },
  { id: 'm_6_3', month: 6, category: '認知', name: '會把東西從一隻手傳到另一隻手' },
  { id: 'm_6_4', month: 6, category: '大肌肉', name: '能向兩個方向翻身' },
  { id: 'm_6_5', month: 6, category: '大肌肉', name: '開始能不用支撐坐著' },
  { id: 'm_6_6', month: 6, category: '細肌肉', name: '能用手掌抓起小物件' },

  // 9 個月
  { id: 'm_9_1', month: 9, category: '社交/情緒', name: '可能對陌生人感到害怕 (認生)' },
  { id: 'm_9_2', month: 9, category: '語言/溝通', name: '明白「不」的意思，會揮手再見' },
  { id: 'm_9_3', month: 9, category: '認知', name: '會玩躲貓貓 (Peek-a-boo)' },
  { id: 'm_9_4', month: 9, category: '大肌肉', name: '能自己坐起來，開始爬行' },
  { id: 'm_9_5', month: 9, category: '大肌肉', name: '能扶著家具站立' },
  { id: 'm_9_6', month: 9, category: '細肌肉', name: '能用拇指和食指抓取東西 (鉗夾動作)' },

  // 12 個月
  { id: 'm_12_1', month: 12, category: '社交/情緒', name: '會模仿別人的動作，表現出偏好' },
  { id: 'm_12_2', month: 12, category: '語言/溝通', name: '會說簡單的詞 (如「爸爸」、「媽媽」)' },
  { id: 'm_12_3', month: 12, category: '認知', name: '會正確使用物品 (如梳頭、喝水)' },
  { id: 'm_12_4', month: 12, category: '大肌肉', name: '能扶著東西走幾步，甚至獨立行走' },
  { id: 'm_12_5', month: 12, category: '細肌肉', name: '能把東西放進容器裡，再拿出來' },
];
