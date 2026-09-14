// 前のバージョン（体調・意識・リハビリ…をこまかく入力していた形）の記録を、
// 新しい形（3つの時間帯＋メモ）に変換するためのファイル。
// 古い記録が消えないよう、入力されていた内容はすべてメモにまとめ直す。

import type { DailyRecord, MediaRef } from '../types'

const MEAL: Record<string, string> = {
  all: '全量',
  most: '8割くらい',
  half: '半分くらい',
  few: '少しだけ',
  none: 'ほとんど食べず',
  tube: '経管・点滴',
}
const SLEEP: Record<string, string> = {
  good: 'よく眠れた',
  normal: 'ふつうに眠れた',
  light: '浅い・途中で起きた',
  bad: 'ほとんど眠れず',
}
const RESPONSE: Record<string, string> = {
  talked: 'はっきり会話できた',
  short: '短い返事ができた',
  gesture: 'うなずき・視線で反応',
  weak: '反応が少ない',
  none: '反応なし',
}
const TRISTATE: Record<string, string> = {
  yes: 'できた',
  sometimes: 'ときどき',
  no: 'できなかった',
  unknown: 'わからない',
}
const EXPRESSION: Record<string, string> = {
  calm: '穏やか',
  smile: '笑顔があった',
  flat: '無表情',
  painful: 'つらそう',
  anxious: '不安そう',
  irritated: 'いらいらしていた',
}
const REHAB: Record<string, string> = {
  pt: '理学療法（PT）',
  ot: '作業療法（OT）',
  st: '言語療法（ST）',
  nurse: '看護・その他',
}
const OVERALL: Record<string, string> = {
  '5': 'とても良い',
  '4': '良い',
  '3': 'ふつう',
  '2': '良くない',
  '1': 'とても悪い',
}

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function pick(table: Record<string, string>, value: unknown): string {
  const key = value === null || value === undefined ? '' : String(value)
  return key ? (table[key] ?? key) : ''
}

function push(lines: string[], label: string, value: string) {
  if (value) lines.push(`${label}: ${value}`)
}

/** 古い記録かどうか（slots がなければ古い形） */
export function isLegacyRecord(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false
  return !('slots' in value)
}

/** 古い記録を新しい形に変換する。入力されていた内容はメモにまとめる */
export function migrateRecord(input: unknown): DailyRecord | null {
  if (typeof input !== 'object' || input === null) return null
  const old = input as Record<string, unknown>
  const id = str(old.id)
  const date = str(old.date)
  if (!id || !date) return null

  const lines: string[] = []

  const visitFrom = str(old.visitFrom)
  const visitTo = str(old.visitTo)
  if (visitFrom || visitTo) lines.push(`面会: ${visitFrom || '—'}〜${visitTo || '—'}`)
  push(lines, '全体の調子', pick(OVERALL, old.overall))

  const v = (old.vitals ?? {}) as Record<string, unknown>
  const vitals: string[] = []
  if (str(v.temperature)) vitals.push(`体温 ${str(v.temperature)}℃`)
  if (str(v.bpSystolic) || str(v.bpDiastolic)) {
    vitals.push(`血圧 ${str(v.bpSystolic) || '?'}/${str(v.bpDiastolic) || '?'}`)
  }
  if (str(v.pulse)) vitals.push(`脈拍 ${str(v.pulse)}`)
  if (str(v.spo2)) vitals.push(`SpO2 ${str(v.spo2)}%`)
  if (str(v.hydration)) vitals.push(`水分 ${str(v.hydration)}ml`)
  if (pick(MEAL, v.mealMain)) vitals.push(`主食 ${pick(MEAL, v.mealMain)}`)
  if (pick(MEAL, v.mealSide)) vitals.push(`副食 ${pick(MEAL, v.mealSide)}`)
  if (pick(SLEEP, v.sleep)) vitals.push(`睡眠 ${pick(SLEEP, v.sleep)}`)
  if (vitals.length > 0) lines.push(`体調: ${vitals.join(' / ')}`)
  push(lines, '排泄', str(v.excretion))
  push(lines, '体調メモ', str(v.note))

  const c = (old.consciousness ?? {}) as Record<string, unknown>
  push(lines, '受け答え', pick(RESPONSE, c.response))
  push(lines, 'こちらを認識', pick(TRISTATE, c.recognizedMe))
  push(lines, '表情', pick(EXPRESSION, c.expression))
  push(lines, '話した言葉', str(c.words))
  push(lines, '意識・会話メモ', str(c.note))

  const r = (old.rehab ?? {}) as Record<string, unknown>
  const types = Array.isArray(r.types) ? (r.types as string[]) : []
  if (types.length > 0) {
    push(lines, '受けたリハビリ', types.map((t) => REHAB[t] ?? t).join('・'))
  }
  push(lines, 'リハビリ内容', str(r.content))
  push(lines, 'できたこと', str(r.achievements))
  push(lines, 'リハビリメモ', str(r.note))

  const s = (old.staffTalk ?? {}) as Record<string, unknown>
  push(lines, '話した人', str(s.speaker))
  push(lines, '聞いた内容', str(s.content))
  push(lines, '薬の変更', str(s.medicationChange))
  push(lines, '次回の予定', str(s.nextMeeting))

  const freeNote = str(old.freeNote)
  if (freeNote) lines.push(freeNote)

  const oldPhotos = Array.isArray(old.photos) ? (old.photos as Record<string, unknown>[]) : []
  const media: MediaRef[] = oldPhotos
    .filter((p) => str(p.id) !== '')
    .map((p) => ({
      id: str(p.id),
      kind: 'photo' as const,
      name: str(p.name) || 'photo',
      type: str(p.type) || 'image/jpeg',
      size: typeof p.size === 'number' ? p.size : 0,
    }))

  const now = new Date().toISOString()
  return {
    id,
    date,
    slots: { lastNight: '', daytime: '', visit: '' },
    note: lines.join('\n'),
    medicineIds: [],
    media,
    deleted: false,
    createdAt: str(old.createdAt) || now,
    updatedAt: str(old.updatedAt) || now,
  }
}
