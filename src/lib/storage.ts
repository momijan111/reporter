// 記録の保存場所を扱うところ。
// 画面側は RecordStore という「決まった形」しか使わないので、
// あとでクラウド保存（Supabase など）を足すときは、
// 同じ形の別の実装を作って store を差し替えるだけでよい。

import type { DailyRecord, MediaBlob } from '../types'
import { STORE_MEDIA, STORE_RECORDS, dbDelete, dbGet, dbGetAll, dbPut } from './db'
import { isLegacyRecord, migrateRecord } from './legacy'

export interface RecordStore {
  /** 画面に出す記録（消したものは含まない） */
  listRecords(): Promise<DailyRecord[]>
  /** 同期に使う。消した印のついたものも含む */
  listAllRecords(): Promise<DailyRecord[]>
  getRecord(id: string): Promise<DailyRecord | undefined>
  saveRecord(record: DailyRecord): Promise<void>
  /** 消した印をつける（実際の行は残す） */
  markDeleted(id: string): Promise<void>
  deleteRecord(id: string): Promise<void>
  getMedia(id: string): Promise<Blob | undefined>
  saveMedia(id: string, blob: Blob): Promise<void>
  deleteMedia(id: string): Promise<void>
}

/** スマホ（ブラウザ）の中だけに保存する実装 */
export const localStore: RecordStore = {
  async listAllRecords() {
    const rows = await dbGetAll<unknown>(STORE_RECORDS)
    const records: DailyRecord[] = []

    for (const row of rows) {
      if (isLegacyRecord(row)) {
        // 前のバージョンで保存した記録は、新しい形に変換して保存し直す
        const migrated = migrateRecord(row)
        if (migrated) {
          await dbPut(STORE_RECORDS, migrated)
          records.push(migrated)
        }
        continue
      }
      records.push(row as DailyRecord)
    }

    // 新しい日付が先に来るように並べる。同じ日なら、あとで直したほうを先にする
    return records.sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1
      return a.updatedAt < b.updatedAt ? 1 : -1
    })
  },

  async listRecords() {
    const all = await localStore.listAllRecords()
    return all.filter((r) => !r.deleted)
  },

  async getRecord(id) {
    const row = await dbGet<unknown>(STORE_RECORDS, id)
    if (row === undefined) return undefined
    return isLegacyRecord(row) ? (migrateRecord(row) ?? undefined) : (row as DailyRecord)
  },

  /** 消した印をつける（家族と同期するときに「消したこと」を伝えるため） */
  async markDeleted(id) {
    const record = await localStore.getRecord(id)
    if (!record) return
    await dbPut(STORE_RECORDS, {
      ...record,
      deleted: true,
      media: [],
      note: '',
      slots: { lastNight: '', daytime: '', visit: '' },
      updatedAt: new Date().toISOString(),
    } satisfies DailyRecord)
  },

  saveRecord(record) {
    return dbPut(STORE_RECORDS, record)
  },

  deleteRecord(id) {
    return dbDelete(STORE_RECORDS, id)
  },

  async getMedia(id) {
    const row = await dbGet<MediaBlob>(STORE_MEDIA, id)
    return row?.blob
  },

  saveMedia(id, blob) {
    return dbPut(STORE_MEDIA, { id, blob } satisfies MediaBlob)
  },

  deleteMedia(id) {
    return dbDelete(STORE_MEDIA, id)
  },
}

/** 画面から使う保存先。クラウドに変えるときはここを差し替える */
export const store: RecordStore = localStore
