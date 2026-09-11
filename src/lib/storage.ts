// 記録の保存場所を扱うところ。
// 画面側は RecordStore という「決まった形」しか使わないので、
// あとでクラウド保存（Supabase など）を足すときは、
// 同じ形の別の実装を作って store を差し替えるだけでよい。

import type { DailyRecord, PhotoBlob } from '../types'
import {
  STORE_PHOTOS,
  STORE_RECORDS,
  dbDelete,
  dbGet,
  dbGetAll,
  dbPut,
} from './db'

export interface RecordStore {
  listRecords(): Promise<DailyRecord[]>
  getRecord(id: string): Promise<DailyRecord | undefined>
  saveRecord(record: DailyRecord): Promise<void>
  deleteRecord(id: string): Promise<void>
  getPhoto(id: string): Promise<Blob | undefined>
  savePhoto(id: string, blob: Blob): Promise<void>
  deletePhoto(id: string): Promise<void>
}

/** スマホ（ブラウザ）の中だけに保存する実装 */
export const localStore: RecordStore = {
  async listRecords() {
    const records = await dbGetAll<DailyRecord>(STORE_RECORDS)
    // 新しい日付が先に来るように並べる
    return records.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  },

  getRecord(id) {
    return dbGet<DailyRecord>(STORE_RECORDS, id)
  },

  saveRecord(record) {
    return dbPut(STORE_RECORDS, record)
  },

  deleteRecord(id) {
    return dbDelete(STORE_RECORDS, id)
  },

  async getPhoto(id) {
    const row = await dbGet<PhotoBlob>(STORE_PHOTOS, id)
    return row?.blob
  },

  savePhoto(id, blob) {
    return dbPut(STORE_PHOTOS, { id, blob } satisfies PhotoBlob)
  },

  deletePhoto(id) {
    return dbDelete(STORE_PHOTOS, id)
  },
}

/** 画面から使う保存先。クラウドに変えるときはここを差し替える */
export const store: RecordStore = localStore
