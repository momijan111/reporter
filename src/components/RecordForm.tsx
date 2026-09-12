// 記録を入力する画面。

import { useRef, useState } from 'react'
import { SLOTS } from '../data/labels'
import { shrinkImage } from '../lib/image'
import { isEmptyRecord, newId } from '../lib/record'
import { store } from '../lib/storage'
import type { AwakeLevel, DailyRecord, MediaRef, SlotKey } from '../types'
import { MediaView } from './MediaView'
import { SlotPicker } from './SlotPicker'

export function RecordForm({
  initialRecord,
  isNew,
  onSaved,
  onCancel,
}: {
  initialRecord: DailyRecord
  isNew: boolean
  onSaved: (record: DailyRecord) => void
  onCancel: () => void
}) {
  const [record, setRecord] = useState<DailyRecord>(initialRecord)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')

  // この画面で追加した／外したものをおぼえておき、
  // 保存か取り消しのタイミングで、いらないデータを消す。
  const addedMediaIds = useRef<string[]>([])
  const removedMediaIds = useRef<string[]>([])

  function setSlot(key: SlotKey, value: AwakeLevel | '') {
    setRecord((prev) => ({ ...prev, slots: { ...prev.slots, [key]: value } }))
  }

  async function handleAddMedia(files: FileList | null, kind: MediaRef['kind']) {
    if (!files || files.length === 0) return
    setBusy(kind === 'video' ? '動画を保存しています…' : '写真を保存しています…')
    setError('')
    try {
      for (const file of Array.from(files)) {
        // 写真は保存前に小さくする。動画はそのまま保存する
        const blob = kind === 'photo' ? await shrinkImage(file) : file
        const id = newId()
        await store.saveMedia(id, blob)
        addedMediaIds.current.push(id)
        setRecord((prev) => ({
          ...prev,
          media: [
            ...prev.media,
            { id, kind, name: file.name, type: blob.type || file.type, size: blob.size },
          ],
        }))
      }
    } catch {
      setError(
        kind === 'video'
          ? '動画を保存できませんでした。端末の空き容量を確認してみてください。'
          : '写真を保存できませんでした。もう一度試してみてください。',
      )
    } finally {
      setBusy('')
    }
  }

  function handleRemoveMedia(mediaId: string) {
    removedMediaIds.current.push(mediaId)
    setRecord((prev) => ({ ...prev, media: prev.media.filter((m) => m.id !== mediaId) }))
  }

  async function handleSave() {
    if (!record.date) {
      setError('日付を入れてください。')
      return
    }
    if (isEmptyRecord(record)) {
      setError('まだ何も入力されていません。ひとつだけでも入力すると保存できます。')
      return
    }

    setBusy('保存しています…')
    setError('')
    try {
      // 1日1件にするため、新しい記録の名前（id）には日付をそのまま使う。
      // すでにその日の記録があるときは、上書きしないで知らせる。
      if (isNew) {
        const existing = await store.getRecord(record.date)
        if (existing && !existing.deleted) {
          setError('この日の記録はすでにあります。カレンダーからその日をタップして開いてください。')
          setBusy('')
          return
        }
      }

      const saved: DailyRecord = {
        ...record,
        id: isNew ? record.date : record.id,
        deleted: false,
        updatedAt: new Date().toISOString(),
      }
      await store.saveRecord(saved)
      // 外した写真・動画のデータを消す
      for (const id of removedMediaIds.current) {
        if (!saved.media.some((m) => m.id === id)) await store.deleteMedia(id)
      }
      removedMediaIds.current = []
      addedMediaIds.current = []
      onSaved(saved)
    } catch {
      setError('保存できませんでした。端末の空き容量を確認してみてください。')
      setBusy('')
    }
  }

  async function handleCancel() {
    // 追加したけれど保存しなかったものを片づける
    const keep = new Set(initialRecord.media.map((m) => m.id))
    for (const id of addedMediaIds.current) {
      if (!keep.has(id)) await store.deleteMedia(id)
    }
    onCancel()
  }

  return (
    <div className="form">
      <section className="section">
        <label className="field">
          <span className="field-label">日付</span>
          <input
            type="date"
            value={record.date}
            onChange={(e) => setRecord((prev) => ({ ...prev, date: e.target.value }))}
          />
        </label>
      </section>

      <section className="section">
        <h2 className="section-title">起きていたか</h2>
        <div className="slot-list">
          {SLOTS.map((slot) => (
            <SlotPicker
              key={slot.key}
              slot={slot}
              value={record.slots[slot.key]}
              onChange={(value) => setSlot(slot.key, value)}
            />
          ))}
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">メモ</h2>
        <textarea
          className="note-input"
          rows={10}
          placeholder="様子、話したこと、先生から聞いたこと、気づいたことなど"
          value={record.note}
          onChange={(e) => setRecord((prev) => ({ ...prev, note: e.target.value }))}
        />
      </section>

      <section className="section">
        <h2 className="section-title">写真・動画</h2>
        {record.media.length > 0 && (
          <div className="media-grid">
            {record.media.map((item) => (
              <div className="media-item" key={item.id}>
                <MediaView item={item} />
                {item.kind === 'video' && <span className="media-badge">動画</span>}
                <button
                  type="button"
                  className="media-remove"
                  onClick={() => handleRemoveMedia(item.id)}
                  aria-label="これを外す"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="capture-buttons">
          <label className="capture">
            <span aria-hidden="true">📷</span> 写真を撮る
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => {
                void handleAddMedia(e.target.files, 'photo')
                e.target.value = ''
              }}
            />
          </label>
          <label className="capture">
            <span aria-hidden="true">🎥</span> 動画を撮る
            <input
              type="file"
              accept="video/*"
              capture="environment"
              onChange={(e) => {
                void handleAddMedia(e.target.files, 'video')
                e.target.value = ''
              }}
            />
          </label>
        </div>
      </section>

      {busy && <p className="notice">{busy}</p>}
      {error && <p className="error">{error}</p>}

      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={() => void handleCancel()}>
          やめる
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy !== ''}
          onClick={() => void handleSave()}
        >
          {isNew ? 'この内容で保存' : '変更を保存'}
        </button>
      </div>
    </div>
  )
}
