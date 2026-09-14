// IndexedDB（スマホのブラウザの中にあるデータベース）を使うための小さな道具。
// ここでは「箱を開ける／出す／入れる／消す」だけを用意している。

const DB_NAME = 'hospital-log'
const DB_VERSION = 2

export const STORE_RECORDS = 'records'
// 写真と動画の両方をここに入れる（名前は最初に作ったときのまま）
export const STORE_MEDIA = 'photos'
export const STORE_MEDICINES = 'medicines'

let dbPromise: Promise<IDBDatabase> | null = null

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_RECORDS)) {
        db.createObjectStore(STORE_RECORDS, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORE_MEDIA)) {
        db.createObjectStore(STORE_MEDIA, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORE_MEDICINES)) {
        db.createObjectStore(STORE_MEDICINES, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export function getDb(): Promise<IDBDatabase> {
  if (!dbPromise) dbPromise = openDatabase()
  return dbPromise
}

function wrap<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function dbGetAll<T>(store: string): Promise<T[]> {
  const db = await getDb()
  const tx = db.transaction(store, 'readonly')
  return wrap<T[]>(tx.objectStore(store).getAll())
}

export async function dbGet<T>(store: string, key: string): Promise<T | undefined> {
  const db = await getDb()
  const tx = db.transaction(store, 'readonly')
  return wrap<T | undefined>(tx.objectStore(store).get(key))
}

export async function dbPut(store: string, value: unknown): Promise<void> {
  const db = await getDb()
  const tx = db.transaction(store, 'readwrite')
  tx.objectStore(store).put(value)
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

export async function dbDelete(store: string, key: string): Promise<void> {
  const db = await getDb()
  const tx = db.transaction(store, 'readwrite')
  tx.objectStore(store).delete(key)
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}
