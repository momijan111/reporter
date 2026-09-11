// 選択肢の値と、画面に表示する日本語ラベル・色の対応表。

import type { AwakeLevel, SlotKey } from '../types'

export interface AwakeOption {
  value: AwakeLevel
  label: string
  /** 一覧やボタンで使う色（CSSの変数名） */
  colorVar: string
}

/** 起きているかどうかの3段階。上から「起きている度合いが高い順」 */
export const AWAKE_OPTIONS: AwakeOption[] = [
  { value: 'awake', label: '完全に起きてる', colorVar: '--awake' },
  { value: 'drowsy', label: '少し起きてる', colorVar: '--drowsy' },
  { value: 'asleep', label: '寝てる', colorVar: '--asleep' },
]

export interface SlotDef {
  key: SlotKey
  /** 入力画面などで使う名前 */
  label: string
  /** 一覧の色ブロックに出す短い名前 */
  shortLabel: string
}

/** 記録する3つの時間帯 */
export const SLOTS: SlotDef[] = [
  { key: 'lastNight', label: '昨日の夜', shortLabel: '夜' },
  { key: 'daytime', label: '昼間', shortLabel: '昼' },
  { key: 'visit', label: '面会時間', shortLabel: '面会' },
]

const AWAKE_LABELS = new Map(AWAKE_OPTIONS.map((o) => [o.value, o.label]))

/** 値からラベルを引く。未記録のときは空文字を返す */
export function awakeLabel(value: AwakeLevel | '' | undefined): string {
  if (!value) return ''
  return AWAKE_LABELS.get(value) ?? value
}
