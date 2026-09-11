// アプリ全体で使うデータの形を定義するファイル。
// 1日ぶんの記録が DailyRecord、写真と動画は別に MediaBlob として保存する。

/** 起きているかどうかの3段階 */
export type AwakeLevel = 'asleep' | 'drowsy' | 'awake'

/** 記録する3つの時間帯 */
export type SlotKey = 'lastNight' | 'daytime' | 'visit'

/** 時間帯ごとの様子。未記録は空文字 */
export type Slots = Record<SlotKey, AwakeLevel | ''>

/** 記録に添付した写真・動画の参照（データ本体は別に保存する） */
export interface MediaRef {
  id: string
  kind: 'photo' | 'video'
  name: string
  type: string
  size: number
}

/** 1日ぶんの記録 */
export interface DailyRecord {
  id: string
  /** YYYY-MM-DD */
  date: string
  slots: Slots
  note: string
  media: MediaRef[]
  /** ISO文字列 */
  createdAt: string
  updatedAt: string
}

/** 写真・動画のデータ本体 */
export interface MediaBlob {
  id: string
  blob: Blob
}

/** 書き出し / 読み込みに使うファイルの形 */
export interface ExportFile {
  app: 'hospital-log'
  version: number
  exportedAt: string
  records: unknown[]
  /** id -> data URL。version 2 以降 */
  media?: Record<string, string>
  /** id -> data URL。version 1 のときの写真 */
  photos?: Record<string, string>
}
