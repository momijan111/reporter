// 記録そのものを扱う小さな便利関数たち。

import { labelOf } from '../data/labels'
import type { DailyRecord } from '../types'

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/** 今日の日付を YYYY-MM-DD で返す（端末のタイムゾーンで計算する） */
export function todayString(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

/** 2026-09-11 → 9月11日(金) */
export function formatDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  if (!y || !m || !d) return date
  const weekday = WEEKDAYS[new Date(y, m - 1, d).getDay()]
  return `${m}月${d}日(${weekday})`
}

/** 2026-09-11 → 2026年9月11日(金) */
export function formatDateLong(date: string): string {
  const [y] = date.split('-')
  return `${y}年${formatDate(date)}`
}

/** 空っぽの記録を作る */
export function createEmptyRecord(date: string = todayString()): DailyRecord {
  const now = new Date().toISOString()
  return {
    id: newId(),
    date,
    visitFrom: '',
    visitTo: '',
    overall: null,
    vitals: {
      temperature: '',
      bpSystolic: '',
      bpDiastolic: '',
      pulse: '',
      spo2: '',
      mealMain: '',
      mealSide: '',
      hydration: '',
      excretion: '',
      sleep: '',
      note: '',
    },
    consciousness: {
      response: '',
      recognizedMe: '',
      expression: '',
      words: '',
      note: '',
    },
    rehab: {
      types: [],
      content: '',
      achievements: '',
      note: '',
    },
    staffTalk: {
      speaker: '',
      content: '',
      medicationChange: '',
      nextMeeting: '',
    },
    photos: [],
    freeNote: '',
    createdAt: now,
    updatedAt: now,
  }
}

/** 一覧に出す短い要約。入力されているものだけをつなげる */
export function summarize(record: DailyRecord): string {
  const parts: string[] = []
  const response = labelOf('response', record.consciousness.response)
  if (response) parts.push(response)
  const expression = labelOf('expression', record.consciousness.expression)
  if (expression) parts.push(expression)
  if (record.rehab.achievements) parts.push(record.rehab.achievements)
  else if (record.rehab.types.length > 0) {
    parts.push(record.rehab.types.map((t) => labelOf('rehab', t)).join('・'))
  }
  if (record.staffTalk.content) parts.push(`説明: ${record.staffTalk.content}`)
  if (parts.length === 0 && record.freeNote) parts.push(record.freeNote)
  return parts.join(' / ')
}

/** 記録を、そのままLINEなどに貼れる文章に変換する */
export function toPlainText(record: DailyRecord): string {
  const lines: string[] = [`【${formatDateLong(record.date)}の様子】`]

  if (record.visitFrom || record.visitTo) {
    lines.push(`面会: ${record.visitFrom || '?'}〜${record.visitTo || '?'}`)
  }
  const overall = labelOf('overall', record.overall)
  if (overall) lines.push(`全体の調子: ${overall}`)

  const v = record.vitals
  const vitalParts: string[] = []
  if (v.temperature) vitalParts.push(`体温 ${v.temperature}℃`)
  if (v.bpSystolic || v.bpDiastolic) {
    vitalParts.push(`血圧 ${v.bpSystolic || '?'}/${v.bpDiastolic || '?'}`)
  }
  if (v.pulse) vitalParts.push(`脈拍 ${v.pulse}`)
  if (v.spo2) vitalParts.push(`SpO2 ${v.spo2}%`)
  if (v.mealMain) vitalParts.push(`主食 ${labelOf('meal', v.mealMain)}`)
  if (v.mealSide) vitalParts.push(`副食 ${labelOf('meal', v.mealSide)}`)
  if (v.hydration) vitalParts.push(`水分 ${v.hydration}ml`)
  if (v.sleep) vitalParts.push(`睡眠 ${labelOf('sleep', v.sleep)}`)
  if (vitalParts.length > 0) {
    lines.push('', '■ 体調・バイタル', vitalParts.join(' / '))
  }
  if (v.excretion) lines.push(`排泄: ${v.excretion}`)
  if (v.note) lines.push(`メモ: ${v.note}`)

  const c = record.consciousness
  const consciousnessParts: string[] = []
  if (c.response) consciousnessParts.push(`受け答え: ${labelOf('response', c.response)}`)
  if (c.recognizedMe) {
    consciousnessParts.push(`こちらを認識: ${labelOf('tristate', c.recognizedMe)}`)
  }
  if (c.expression) consciousnessParts.push(`表情: ${labelOf('expression', c.expression)}`)
  if (c.words) consciousnessParts.push(`話した言葉: ${c.words}`)
  if (c.note) consciousnessParts.push(`メモ: ${c.note}`)
  if (consciousnessParts.length > 0) {
    lines.push('', '■ 意識・会話', ...consciousnessParts)
  }

  const r = record.rehab
  const rehabParts: string[] = []
  if (r.types.length > 0) {
    rehabParts.push(`種類: ${r.types.map((t) => labelOf('rehab', t)).join('・')}`)
  }
  if (r.content) rehabParts.push(`内容: ${r.content}`)
  if (r.achievements) rehabParts.push(`できたこと: ${r.achievements}`)
  if (r.note) rehabParts.push(`メモ: ${r.note}`)
  if (rehabParts.length > 0) {
    lines.push('', '■ リハビリ・できたこと', ...rehabParts)
  }

  const s = record.staffTalk
  const staffParts: string[] = []
  if (s.speaker) staffParts.push(`話した人: ${s.speaker}`)
  if (s.content) staffParts.push(`内容: ${s.content}`)
  if (s.medicationChange) staffParts.push(`薬の変更: ${s.medicationChange}`)
  if (s.nextMeeting) staffParts.push(`次回の予定: ${s.nextMeeting}`)
  if (staffParts.length > 0) {
    lines.push('', '■ 医師・看護師から聞いた話', ...staffParts)
  }

  if (record.freeNote) lines.push('', '■ そのほか', record.freeNote)
  if (record.photos.length > 0) lines.push('', `写真 ${record.photos.length}枚`)

  return lines.join('\n')
}

/** 入力が1つもない記録かどうか（保存ボタンの判定に使う） */
export function isEmptyRecord(record: DailyRecord): boolean {
  const { vitals: v, consciousness: c, rehab: r, staffTalk: s } = record
  const texts = [
    record.visitFrom,
    record.visitTo,
    record.freeNote,
    v.temperature,
    v.bpSystolic,
    v.bpDiastolic,
    v.pulse,
    v.spo2,
    v.mealMain,
    v.mealSide,
    v.hydration,
    v.excretion,
    v.sleep,
    v.note,
    c.response,
    c.recognizedMe,
    c.expression,
    c.words,
    c.note,
    r.content,
    r.achievements,
    r.note,
    s.speaker,
    s.content,
    s.medicationChange,
    s.nextMeeting,
  ]
  return (
    record.overall === null &&
    r.types.length === 0 &&
    record.photos.length === 0 &&
    texts.every((t) => t.trim() === '')
  )
}
