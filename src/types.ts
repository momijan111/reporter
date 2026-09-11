// アプリ全体で使うデータの形を定義するファイル。
// 1日ぶんの記録が DailyRecord、写真は別に PhotoBlob として保存する。

/** 食事量 */
export type MealAmount = 'all' | 'most' | 'half' | 'few' | 'none' | 'tube'

/** 睡眠の様子 */
export type SleepQuality = 'good' | 'normal' | 'light' | 'bad'

/** 受け答えのレベル */
export type ResponseLevel = 'talked' | 'short' | 'gesture' | 'weak' | 'none'

/** できた / できなかった の3段階＋わからない */
export type TriState = 'yes' | 'sometimes' | 'no' | 'unknown'

/** 表情 */
export type Expression = 'calm' | 'smile' | 'flat' | 'painful' | 'anxious' | 'irritated'

/** リハビリの種類 */
export type RehabType = 'pt' | 'ot' | 'st' | 'nurse'

/** 体調・バイタル */
export interface Vitals {
  temperature: string
  bpSystolic: string
  bpDiastolic: string
  pulse: string
  spo2: string
  mealMain: MealAmount | ''
  mealSide: MealAmount | ''
  hydration: string
  excretion: string
  sleep: SleepQuality | ''
  note: string
}

/** 意識・会話の様子 */
export interface Consciousness {
  response: ResponseLevel | ''
  recognizedMe: TriState | ''
  expression: Expression | ''
  words: string
  note: string
}

/** リハビリ・できたこと */
export interface Rehab {
  types: RehabType[]
  content: string
  achievements: string
  note: string
}

/** 医師・看護師から聞いた話 */
export interface StaffTalk {
  speaker: string
  content: string
  medicationChange: string
  nextMeeting: string
}

/** 記録に添付した写真の参照（画像データ本体は別に保存する） */
export interface PhotoRef {
  id: string
  name: string
  type: string
  size: number
}

/** 1日ぶんの記録 */
export interface DailyRecord {
  id: string
  /** YYYY-MM-DD */
  date: string
  visitFrom: string
  visitTo: string
  /** 全体の調子 1〜5。未入力は null */
  overall: number | null
  vitals: Vitals
  consciousness: Consciousness
  rehab: Rehab
  staffTalk: StaffTalk
  photos: PhotoRef[]
  freeNote: string
  /** ISO文字列 */
  createdAt: string
  updatedAt: string
}

/** 写真の画像データ本体 */
export interface PhotoBlob {
  id: string
  blob: Blob
}

/** 書き出し / 読み込みに使うファイルの形 */
export interface ExportFile {
  app: 'hospital-log'
  version: 1
  exportedAt: string
  records: DailyRecord[]
  /** 写真を含めて書き出した場合のみ。id -> data URL */
  photos?: Record<string, string>
}
