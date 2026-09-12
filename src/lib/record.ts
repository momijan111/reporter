// 記録そのものを扱う小さな便利関数たち。

import { SLOTS, awakeLabel } from '../data/labels'
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

/**
 * 空っぽの記録を作る。
 * 1日1件にするため、記録の名前（id）には日付をそのまま使う。
 * こうしておくと、家族が別々の端末で同じ日を書いても1つにまとまる。
 */
export function createEmptyRecord(date: string = todayString()): DailyRecord {
  const now = new Date().toISOString()
  return {
    id: date || newId(),
    date,
    slots: { lastNight: '', daytime: '', visit: '' },
    note: '',
    media: [],
    deleted: false,
    createdAt: now,
    updatedAt: now,
  }
}

/** 記録を、そのままLINEなどに貼れる文章に変換する */
export function toPlainText(record: DailyRecord): string {
  const lines: string[] = [`【${formatDateLong(record.date)}の様子】`]

  for (const slot of SLOTS) {
    const label = awakeLabel(record.slots[slot.key])
    if (label) lines.push(`${slot.label}: ${label}`)
  }

  if (record.note.trim()) lines.push('', record.note.trim())

  const photos = record.media.filter((m) => m.kind === 'photo').length
  const videos = record.media.filter((m) => m.kind === 'video').length
  const attachments: string[] = []
  if (photos > 0) attachments.push(`写真 ${photos}枚`)
  if (videos > 0) attachments.push(`動画 ${videos}本`)
  if (attachments.length > 0) lines.push('', attachments.join(' / '))

  return lines.join('\n')
}

/** 入力が1つもない記録かどうか（保存ボタンの判定に使う） */
export function isEmptyRecord(record: DailyRecord): boolean {
  const noSlots = SLOTS.every((slot) => record.slots[slot.key] === '')
  return noSlots && record.note.trim() === '' && record.media.length === 0
}
