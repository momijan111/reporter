// 保存した1日ぶんの記録を読む画面。

import { useState } from 'react'
import { SLOTS, awakeLabel } from '../data/labels'
import { formatDateLong, medicineNames, toPlainText } from '../lib/record'
import type { DailyRecord, MediaRef, Medicine } from '../types'
import { MediaView } from './MediaView'

export function RecordDetail({
  record,
  medicines,
  onEdit,
  onDelete,
  onBack,
}: {
  record: DailyRecord
  /** 登録ずみの薬すべて（名前を出すために使う） */
  medicines: Medicine[]
  onEdit: () => void
  onDelete: () => void
  onBack: () => void
}) {
  const [copied, setCopied] = useState('')
  const [zoomed, setZoomed] = useState<MediaRef | null>(null)

  const names = medicineNames(record, medicines)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(toPlainText(record, medicines))
      setCopied('コピーしました。LINEなどに貼りつけられます。')
    } catch {
      setCopied('コピーできませんでした。端末の設定で許可が必要な場合があります。')
    }
    setTimeout(() => setCopied(''), 4000)
  }

  return (
    <div className="detail">
      <div className="detail-head">
        <button type="button" className="btn btn-ghost btn-small" onClick={onBack}>
          ← 一覧
        </button>
        <h1 className="detail-date">{formatDateLong(record.date)}</h1>
      </div>

      <section className="section">
        <h2 className="section-title">起きていたか</h2>
        <div className="detail-slots">
          {SLOTS.map((slot) => {
            const value = record.slots[slot.key]
            return (
              <div className="detail-slot" key={slot.key}>
                <span className="detail-slot-label">{slot.label}</span>
                <span className={`level-tag level-${value || 'none'}`}>
                  {awakeLabel(value) || '記録なし'}
                </span>
              </div>
            )
          })}
        </div>
      </section>

      {names.length > 0 && (
        <section className="section">
          <h2 className="section-title">使っている薬</h2>
          <ul className="medicine-tags">
            {names.map((name, index) => (
              <li key={`${name}-${index}`} className="medicine-tag">
                {name}
              </li>
            ))}
          </ul>
        </section>
      )}

      {record.note.trim() !== '' && (
        <section className="section">
          <h2 className="section-title">メモ</h2>
          <p className="detail-note">{record.note}</p>
        </section>
      )}

      {record.media.length > 0 && (
        <section className="section">
          <h2 className="section-title">写真・動画（{record.media.length}件）</h2>
          <div className="media-grid">
            {record.media.map((item) => (
              <div className="media-item" key={item.id}>
                <MediaView item={item} onClick={() => setZoomed(item)} />
                {item.kind === 'video' && <span className="media-badge">動画</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      {copied && <p className="notice">{copied}</p>}

      <div className="detail-actions">
        <button type="button" className="btn btn-ghost" onClick={() => void handleCopy()}>
          文章としてコピー
        </button>
        <button type="button" className="btn btn-primary" onClick={onEdit}>
          編集する
        </button>
      </div>
      <button type="button" className="btn btn-danger btn-block" onClick={onDelete}>
        この記録を削除
      </button>

      {zoomed && (
        <div className="lightbox" role="presentation" onClick={() => setZoomed(null)}>
          <MediaView item={zoomed} full />
          <p className="lightbox-hint">まわりをタップで閉じる</p>
        </div>
      )}
    </div>
  )
}
