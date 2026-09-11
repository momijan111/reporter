// 保存した記録の一覧。3つの時間帯の色で、様子がひと目で分かるようにしている。

import { SLOTS, awakeLabel } from '../data/labels'
import { formatDate, toPlainText } from '../lib/record'
import type { DailyRecord } from '../types'

export function RecordList({
  records,
  keyword,
  onKeywordChange,
  onSelect,
}: {
  records: DailyRecord[]
  keyword: string
  onKeywordChange: (keyword: string) => void
  onSelect: (id: string) => void
}) {
  const trimmed = keyword.trim()
  const shown = trimmed === '' ? records : records.filter((r) => toPlainText(r).includes(trimmed))

  return (
    <div className="list">
      {records.length > 3 && (
        <input
          type="search"
          className="search"
          placeholder="メモの言葉でさがす"
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
        />
      )}

      {records.length === 0 && (
        <p className="empty">
          まだ記録がありません。下の「今日の記録をつける」から始めてください。
        </p>
      )}
      {records.length > 0 && shown.length === 0 && (
        <p className="empty">「{trimmed}」に当てはまる記録はありませんでした。</p>
      )}

      <ul className="card-list">
        {shown.map((record) => (
          <li key={record.id}>
            <button type="button" className="card" onClick={() => onSelect(record.id)}>
              <div className="card-head">
                <span className="card-date">{formatDate(record.date)}</span>
                {record.media.length > 0 && (
                  <span className="card-meta">写真・動画 {record.media.length}件</span>
                )}
              </div>
              <div className="card-slots">
                {SLOTS.map((slot) => {
                  const value = record.slots[slot.key]
                  return (
                    <span
                      key={slot.key}
                      className={`card-slot level-${value || 'none'}`}
                      title={`${slot.label}: ${awakeLabel(value) || '記録なし'}`}
                    >
                      <span className="card-slot-name">{slot.shortLabel}</span>
                      <span className="card-slot-value">{awakeLabel(value) || '—'}</span>
                    </span>
                  )
                })}
              </div>
              {record.note.trim() !== '' && <p className="card-note">{record.note}</p>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
