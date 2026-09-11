// 保存した1日ぶんの記録を読む画面。

import { useState } from 'react'
import { labelOf } from '../data/labels'
import { formatDateLong, toPlainText } from '../lib/record'
import type { DailyRecord } from '../types'
import { PhotoImage } from './PhotoImage'
import { Section } from './ui'

function Row({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null
  return (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value}</span>
    </div>
  )
}

/** 中身が空のセクションは表示しない */
function hasAnyValue(values: string[]): boolean {
  return values.some((v) => v.trim() !== '')
}

export function RecordDetail({
  record,
  onEdit,
  onDelete,
  onBack,
}: {
  record: DailyRecord
  onEdit: () => void
  onDelete: () => void
  onBack: () => void
}) {
  const [copied, setCopied] = useState('')
  const [zoomPhotoId, setZoomPhotoId] = useState<string | null>(null)

  const v = record.vitals
  const c = record.consciousness
  const r = record.rehab
  const s = record.staffTalk

  const bloodPressure =
    v.bpSystolic || v.bpDiastolic ? `${v.bpSystolic || '—'} / ${v.bpDiastolic || '—'}` : ''
  const visit = record.visitFrom || record.visitTo
    ? `${record.visitFrom || '—'} 〜 ${record.visitTo || '—'}`
    : ''

  async function handleCopy() {
    const text = toPlainText(record)
    try {
      await navigator.clipboard.writeText(text)
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
        {record.overall !== null && (
          <span className={`badge badge-${record.overall}`}>
            {labelOf('overall', record.overall)}
          </span>
        )}
      </div>

      {visit && (
        <Section title="面会">
          <Row label="時間" value={visit} />
        </Section>
      )}

      {hasAnyValue([
        v.temperature,
        bloodPressure,
        v.pulse,
        v.spo2,
        v.mealMain,
        v.mealSide,
        v.hydration,
        v.sleep,
        v.excretion,
        v.note,
      ]) && (
        <Section title="体調・バイタル">
          <Row label="体温" value={v.temperature ? `${v.temperature} ℃` : ''} />
          <Row label="血圧" value={bloodPressure} />
          <Row label="脈拍" value={v.pulse ? `${v.pulse} 回/分` : ''} />
          <Row label="SpO2" value={v.spo2 ? `${v.spo2} %` : ''} />
          <Row label="主食" value={labelOf('meal', v.mealMain)} />
          <Row label="副食" value={labelOf('meal', v.mealSide)} />
          <Row label="水分" value={v.hydration ? `${v.hydration} ml` : ''} />
          <Row label="睡眠" value={labelOf('sleep', v.sleep)} />
          <Row label="排泄" value={v.excretion} />
          <Row label="メモ" value={v.note} />
        </Section>
      )}

      {hasAnyValue([c.response, c.recognizedMe, c.expression, c.words, c.note]) && (
        <Section title="意識・会話の様子">
          <Row label="受け答え" value={labelOf('response', c.response)} />
          <Row label="こちらを認識" value={labelOf('tristate', c.recognizedMe)} />
          <Row label="表情" value={labelOf('expression', c.expression)} />
          <Row label="話した言葉" value={c.words} />
          <Row label="メモ" value={c.note} />
        </Section>
      )}

      {(r.types.length > 0 || hasAnyValue([r.content, r.achievements, r.note])) && (
        <Section title="リハビリ・できたこと">
          <Row
            label="受けたリハビリ"
            value={r.types.map((t) => labelOf('rehab', t)).join('・')}
          />
          <Row label="内容" value={r.content} />
          <Row label="できたこと" value={r.achievements} />
          <Row label="メモ" value={r.note} />
        </Section>
      )}

      {hasAnyValue([s.speaker, s.content, s.medicationChange, s.nextMeeting]) && (
        <Section title="医師・看護師から聞いた話">
          <Row label="話した人" value={s.speaker} />
          <Row label="内容" value={s.content} />
          <Row label="薬の変更" value={s.medicationChange} />
          <Row label="次回の予定" value={s.nextMeeting} />
        </Section>
      )}

      {record.photos.length > 0 && (
        <Section title={`写真（${record.photos.length}枚）`}>
          <div className="photo-grid">
            {record.photos.map((photo) => (
              <div className="photo-item" key={photo.id}>
                <PhotoImage
                  photoId={photo.id}
                  alt={photo.name}
                  onClick={() => setZoomPhotoId(photo.id)}
                />
              </div>
            ))}
          </div>
        </Section>
      )}

      {record.freeNote.trim() !== '' && (
        <Section title="そのほか">
          <Row label="自由メモ" value={record.freeNote} />
        </Section>
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

      {zoomPhotoId && (
        <div
          className="lightbox"
          role="presentation"
          onClick={() => setZoomPhotoId(null)}
        >
          <PhotoImage photoId={zoomPhotoId} alt="拡大した写真" />
          <p className="lightbox-hint">タップで閉じる</p>
        </div>
      )}
    </div>
  )
}
