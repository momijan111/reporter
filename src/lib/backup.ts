// 記録をファイルに書き出す／ファイルから読み込む処理。
// 機種を変えるときや、万一アプリのデータが消えたときの備え。

import type { DailyRecord, ExportFile } from '../types'
import { store } from './storage'

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl)
  return response.blob()
}

/** すべての記録を1つのJSONファイルにまとめる */
export async function buildExportFile(includePhotos: boolean): Promise<ExportFile> {
  const records = await store.listRecords()
  const data: ExportFile = {
    app: 'hospital-log',
    version: 1,
    exportedAt: new Date().toISOString(),
    records,
  }

  if (includePhotos) {
    const photos: Record<string, string> = {}
    for (const record of records) {
      for (const photo of record.photos) {
        const blob = await store.getPhoto(photo.id)
        if (blob) photos[photo.id] = await blobToDataUrl(blob)
      }
    }
    data.photos = photos
  }

  return data
}

/** JSONファイルとして端末に保存する */
export async function downloadBackup(includePhotos: boolean): Promise<string> {
  const data = await buildExportFile(includePhotos)
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  // ファイル名は半角英数字にしておく。日本語のファイル名は、
  // 端末やブラウザによっては拡張子ごと落とされてしまうことがあるため。
  const fileName = `hospital-log-${data.exportedAt.slice(0, 10)}.json`

  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  // すぐに消すと保存が間に合わない端末があるので少し待つ
  setTimeout(() => URL.revokeObjectURL(url), 10_000)

  return fileName
}

export interface ImportResult {
  added: number
  updated: number
  photos: number
}

function isExportFile(value: unknown): value is ExportFile {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<ExportFile>
  return candidate.app === 'hospital-log' && Array.isArray(candidate.records)
}

/** 書き出したJSONファイルを読み込んで、記録を復元する */
export async function importBackup(file: File): Promise<ImportResult> {
  const text = await file.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('ファイルの中身を読み取れませんでした。このアプリで書き出したJSONファイルを選んでください。')
  }
  if (!isExportFile(parsed)) {
    throw new Error('このアプリで書き出したファイルではないようです。')
  }

  const existing = await store.listRecords()
  const existingIds = new Set(existing.map((r) => r.id))

  let added = 0
  let updated = 0
  for (const record of parsed.records as DailyRecord[]) {
    if (!record || typeof record.id !== 'string' || typeof record.date !== 'string') continue
    if (existingIds.has(record.id)) updated += 1
    else added += 1
    await store.saveRecord(record)
  }

  let photos = 0
  if (parsed.photos) {
    for (const [id, dataUrl] of Object.entries(parsed.photos)) {
      try {
        await store.savePhoto(id, await dataUrlToBlob(dataUrl))
        photos += 1
      } catch {
        // 1枚読めなくても残りは続ける
      }
    }
  }

  return { added, updated, photos }
}
