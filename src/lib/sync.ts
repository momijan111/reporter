// 端末の中の記録と、クラウド（Supabase）の記録を合わせる処理。
//
// 考えかたはかんたんで、
//   1. クラウドにあって、こちらより新しいものを取り込む
//   2. こちらにあって、クラウドより新しいものを送る
// だけ。同じ記録を同時に直した場合は「あとに保存したほう」が残る。
//
// 写真は家族で共有する（Supabase の保管場所に置く）。
// 動画は容量が大きいので共有せず、撮った端末の中にだけ残す。

import type { DailyRecord, MediaRef, Medicine, Slots } from '../types'
import { getClient } from './cloud'
import { store } from './storage'

const BUCKET = 'photos'

interface CloudRow {
  id: string
  date: string
  slots: Slots
  note: string | null
  medicine_ids: string[] | null
  media: MediaRef[] | null
  deleted: boolean
  created_at: string
  updated_at: string
}

interface MedicineRow {
  id: string
  name: string
  note: string | null
  archived: boolean
  created_at: string
  updated_at: string
}

export interface SyncResult {
  pulled: number
  pushed: number
  photosUp: number
  photosDown: number
}

/** 薬の一覧を家族と合わせる */
async function syncMedicines(
  supabase: NonNullable<ReturnType<typeof getClient>>,
  ownerId: string,
): Promise<void> {
  const { data, error } = await supabase.from('medicines').select('*')
  if (error) throw new Error(`薬の一覧を受け取れませんでした（${error.message}）`)
  const remote = (data ?? []) as MedicineRow[]

  const local = await store.listMedicines()
  const localById = new Map(local.map((m) => [m.id, m]))

  for (const row of remote) {
    const mine = localById.get(row.id)
    if (mine && time(mine.updatedAt) >= time(row.updated_at)) continue
    await store.saveMedicine({
      id: row.id,
      name: row.name,
      note: row.note ?? '',
      archived: row.archived,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })
  }

  const remoteById = new Map(remote.map((r) => [r.id, r]))
  const toPush = local.filter((m) => {
    const row = remoteById.get(m.id)
    return !row || time(row.updated_at) < time(m.updatedAt)
  })

  if (toPush.length > 0) {
    const rows = toPush.map((m: Medicine) => ({
      id: m.id,
      owner: ownerId,
      name: m.name,
      note: m.note,
      archived: m.archived ?? false,
      created_at: m.createdAt,
      updated_at: m.updatedAt,
    }))
    const { error: pushError } = await supabase.from('medicines').upsert(rows)
    if (pushError) throw new Error(`薬の一覧を送れませんでした（${pushError.message}）`)
  }
}

/** 日時を比べられる数値にする（クラウドとこちらで書き方が違うため） */
function time(value: string): number {
  const ms = Date.parse(value)
  return Number.isNaN(ms) ? 0 : ms
}

// すでにクラウドへ送った写真をおぼえておき、毎回送り直さないようにする
const UPLOADED_KEY = 'hospital-log:uploaded-photos'

function loadUploaded(): Set<string> {
  try {
    const raw = localStorage.getItem(UPLOADED_KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

function saveUploaded(ids: Set<string>): void {
  try {
    localStorage.setItem(UPLOADED_KEY, JSON.stringify([...ids]))
  } catch {
    // 保存できなくても、次回もう一度送るだけなので問題ない
  }
}

export async function syncNow(): Promise<SyncResult> {
  const supabase = getClient()
  if (!supabase) throw new Error('クラウド共有が設定されていません。')

  const { data: sessionData } = await supabase.auth.getSession()
  const session = sessionData.session
  if (!session) throw new Error('ログインしていません。')

  // 先に薬の一覧を合わせる（記録がその名前を使うため）
  await syncMedicines(supabase, session.user.id)

  const { data, error } = await supabase.from('records').select('*')
  if (error) {
    // クラウド側の表がまだ作られていないときは、分かりやすく伝える
    if (error.code === 'PGRST205' || error.message.includes('Could not find the table')) {
      throw new Error('クラウド側の準備（SQLの実行）がまだのようです。')
    }
    throw new Error(`記録を受け取れませんでした（${error.message}）`)
  }
  const remote = (data ?? []) as CloudRow[]

  const local = await store.listAllRecords()
  const localById = new Map(local.map((r) => [r.id, r]))

  // 1. クラウドのほうが新しいものを取り込む
  let pulled = 0
  for (const row of remote) {
    const mine = localById.get(row.id)
    if (mine && time(mine.updatedAt) >= time(row.updated_at)) continue

    const remotePhotos = (row.media ?? []).filter((m) => m.kind === 'photo')
    // 動画は共有しないので、この端末にあるものをそのまま残す
    const localVideos = (mine?.media ?? []).filter((m) => m.kind === 'video')

    await store.saveRecord({
      id: row.id,
      date: row.date,
      slots: row.slots,
      note: row.note ?? '',
      medicineIds: row.medicine_ids ?? [],
      media: [...remotePhotos, ...localVideos],
      deleted: row.deleted,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })
    pulled += 1
  }

  // 2. こちらのほうが新しいものを送る
  const remoteById = new Map(remote.map((r) => [r.id, r]))
  const toPush = local.filter((r) => {
    const row = remoteById.get(r.id)
    return !row || time(row.updated_at) < time(r.updatedAt)
  })

  if (toPush.length > 0) {
    const rows = toPush.map((r: DailyRecord) => ({
      id: r.id,
      owner: session.user.id,
      date: r.date,
      slots: r.slots,
      note: r.note,
      medicine_ids: r.medicineIds,
      // 共有するのは写真だけ
      media: r.media.filter((m) => m.kind === 'photo'),
      deleted: r.deleted ?? false,
      created_at: r.createdAt,
      updated_at: r.updatedAt,
    }))
    const { error: pushError } = await supabase.from('records').upsert(rows)
    if (pushError) throw new Error(`記録を送れませんでした（${pushError.message}）`)
  }

  // 3. 写真をやりとりする
  const uploaded = loadUploaded()
  let photosUp = 0
  let photosDown = 0

  // 写真は「家族のアカウントの番号」フォルダの下に置く。
  // こうしておくと、ほかの人のファイルには手が届かない設定にできる。
  const folder = session.user.id
  const current = await store.listAllRecords()
  for (const record of current) {
    if (record.deleted) continue
    for (const item of record.media) {
      if (item.kind !== 'photo') continue

      const blob = await store.getMedia(item.id)

      if (blob) {
        // この端末にある写真をクラウドへ
        if (uploaded.has(item.id)) continue
        const { error: upError } = await supabase.storage
          .from(BUCKET)
          .upload(`${folder}/${item.id}`, blob, {
            contentType: item.type || 'image/jpeg',
            upsert: true,
          })
        if (!upError) {
          uploaded.add(item.id)
          photosUp += 1
        }
      } else {
        // 家族が撮った写真をこの端末へ
        const { data: file, error: downError } = await supabase.storage
          .from(BUCKET)
          .download(`${folder}/${item.id}`)
        if (!downError && file) {
          await store.saveMedia(item.id, file)
          uploaded.add(item.id)
          photosDown += 1
        }
      }
    }
  }

  saveUploaded(uploaded)

  return { pulled, pushed: toPush.length, photosUp, photosDown }
}

/** 記録を消すときに、クラウドに置いた写真も片づける */
export async function removeCloudPhotos(media: MediaRef[]): Promise<void> {
  const supabase = getClient()
  if (!supabase) return
  const { data } = await supabase.auth.getSession()
  const folder = data.session?.user.id
  if (!folder) return

  const paths = media.filter((m) => m.kind === 'photo').map((m) => `${folder}/${m.id}`)
  if (paths.length === 0) return
  await supabase.storage.from(BUCKET).remove(paths)
}
