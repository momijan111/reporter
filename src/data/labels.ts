// 選択肢の値と、画面に表示する日本語ラベルの対応表。
// 選択肢を増やしたいときは、この表と src/types.ts の型を一緒に直す。

import type {
  Expression,
  MealAmount,
  RehabType,
  ResponseLevel,
  SleepQuality,
  TriState,
} from '../types'

export interface Option<T> {
  value: T
  label: string
}

export const MEAL_OPTIONS: Option<MealAmount>[] = [
  { value: 'all', label: '全量' },
  { value: 'most', label: '8割くらい' },
  { value: 'half', label: '半分くらい' },
  { value: 'few', label: '少しだけ' },
  { value: 'none', label: 'ほとんど食べず' },
  { value: 'tube', label: '経管・点滴' },
]

export const SLEEP_OPTIONS: Option<SleepQuality>[] = [
  { value: 'good', label: 'よく眠れた' },
  { value: 'normal', label: 'ふつうに眠れた' },
  { value: 'light', label: '浅い・途中で起きた' },
  { value: 'bad', label: 'ほとんど眠れず' },
]

export const RESPONSE_OPTIONS: Option<ResponseLevel>[] = [
  { value: 'talked', label: 'はっきり会話できた' },
  { value: 'short', label: '短い返事ができた' },
  { value: 'gesture', label: 'うなずき・視線で反応' },
  { value: 'weak', label: '反応が少ない' },
  { value: 'none', label: '反応なし' },
]

export const TRISTATE_OPTIONS: Option<TriState>[] = [
  { value: 'yes', label: 'できた' },
  { value: 'sometimes', label: 'ときどき' },
  { value: 'no', label: 'できなかった' },
  { value: 'unknown', label: 'わからない' },
]

export const EXPRESSION_OPTIONS: Option<Expression>[] = [
  { value: 'calm', label: '穏やか' },
  { value: 'smile', label: '笑顔があった' },
  { value: 'flat', label: '無表情' },
  { value: 'painful', label: 'つらそう' },
  { value: 'anxious', label: '不安そう' },
  { value: 'irritated', label: 'いらいらしていた' },
]

export const REHAB_OPTIONS: Option<RehabType>[] = [
  { value: 'pt', label: '理学療法（PT）' },
  { value: 'ot', label: '作業療法（OT）' },
  { value: 'st', label: '言語療法（ST）' },
  { value: 'nurse', label: '看護・その他' },
]

export const OVERALL_OPTIONS: Option<number>[] = [
  { value: 5, label: 'とても良い' },
  { value: 4, label: '良い' },
  { value: 3, label: 'ふつう' },
  { value: 2, label: '良くない' },
  { value: 1, label: 'とても悪い' },
]

function toLabelMap<T extends string | number>(options: Option<T>[]): Map<T, string> {
  return new Map(options.map((o) => [o.value, o.label]))
}

const LABEL_MAPS = {
  meal: toLabelMap(MEAL_OPTIONS),
  sleep: toLabelMap(SLEEP_OPTIONS),
  response: toLabelMap(RESPONSE_OPTIONS),
  tristate: toLabelMap(TRISTATE_OPTIONS),
  expression: toLabelMap(EXPRESSION_OPTIONS),
  rehab: toLabelMap(REHAB_OPTIONS),
  overall: toLabelMap(OVERALL_OPTIONS),
}

/** 値からラベルを引く。未入力（空文字・null）のときは空文字を返す */
export function labelOf(
  kind: keyof typeof LABEL_MAPS,
  value: string | number | null | undefined,
): string {
  if (value === '' || value === null || value === undefined) return ''
  const map = LABEL_MAPS[kind] as Map<string | number, string>
  return map.get(value) ?? String(value)
}
