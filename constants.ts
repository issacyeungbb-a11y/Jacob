
export const BABY_NAME = "Jacob";
export const BIRTH_DATE = "2025-12-19";

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

// HK Department of Health - Childhood Immunisation Programme
// Source: Family Health Service, Department of Health, HKSAR
export const HK_VACCINES = [
  { id: 'v_0_1', month: 0, name: '卡介苗 (BCG)' },
  { id: 'v_0_2', month: 0, name: '乙型肝炎疫苗 - 第一次' },
  { id: 'v_1_1', month: 1, name: '乙型肝炎疫苗 - 第二次' },
  { id: 'v_2_1', month: 2, name: '白喉、破傷風、百日咳及小兒麻痺混合疫苗 - 第一次' },
  { id: 'v_2_2', month: 2, name: '肺炎球菌疫苗 - 第一次' },
  { id: 'v_4_1', month: 4, name: '白喉、破傷風、百日咳及小兒麻痺混合疫苗 - 第二次' },
  { id: 'v_4_2', month: 4, name: '肺炎球菌疫苗 - 第二次' },
  { id: 'v_6_1', month: 6, name: '白喉、破傷風、百日咳及小兒麻痺混合疫苗 - 第三次' },
  { id: 'v_6_2', month: 6, name: '肺炎球菌疫苗 - 第三次' },
  { id: 'v_6_3', month: 6, name: '乙型肝炎疫苗 - 第三次' },
  { id: 'v_12_1', month: 12, name: '麻疹、流行性腮腺炎及德國麻疹混合疫苗 - 第一次' },
  { id: 'v_12_2', month: 12, name: '肺炎球菌疫苗 - 加強劑' },
  { id: 'v_12_3', month: 12, name: '水痘疫苗 - 第一次' },
];

// CDC / HK FHS Milestones
// Source: CDC (Centers for Disease Control and Prevention) & HK FHS
export const MILESTONES = [
  { id: 'm_2_1', month: 2, category: '社交/情緒', name: '會對著人微笑' },
  { id: 'm_2_2', month: 2, category: '大肌肉', name: '趴著時能抬起頭' },
  { id: 'm_2_3', month: 2, category: '大肌肉', name: '手腳能做出較平順的動作' },
  { id: 'm_4_1', month: 4, category: '社交/情緒', name: '會主動微笑，喜歡和人玩' },
  { id: 'm_4_2', month: 4, category: '語言', name: '開始牙牙學語 (發出咕嚕聲)' },
  { id: 'm_4_3', month: 4, category: '大肌肉', name: '頭部能保持穩定，不需要支撐' },
  { id: 'm_4_4', month: 4, category: '大肌肉', name: '趴著時能用手肘撐起上半身' },
  { id: 'm_6_1', month: 6, category: '認知', name: '會把東西放進嘴裡' },
  { id: 'm_6_2', month: 6, category: '大肌肉', name: '能向兩個方向翻身 (趴轉仰、仰轉趴)' },
  { id: 'm_6_3', month: 6, category: '大肌肉', name: '開始能不用支撐坐著' },
  { id: 'm_9_1', month: 9, category: '社交/情緒', name: '可能對陌生人感到害怕 (認生)' },
  { id: 'm_9_2', month: 9, category: '語言', name: '明白「不」的意思' },
  { id: 'm_9_3', month: 9, category: '大肌肉', name: '能自己坐起來' },
  { id: 'm_9_4', month: 9, category: '大肌肉', name: '開始爬行' },
];
