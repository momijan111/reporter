// 検索したときに出る、記録の一覧。

import { SLOTS, awakeLabel } from '../data/labels'
import { formatDate } from '../lib/record'
import type { DailyRecord } from '../types'

export function RecordList({
  records,
  keyword,
  onSelect,
}: {
  records: DailyRecord[]
  keyword: string
  onSelect: (id: string) => void
}) {
  if (records.length === 0) {
    return <p className="empty">「{keyword}」に当てはまる記録はありませんでした。</p>
  }

  return (
    <ul className="card-list">
      {records.map((record) => (
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
                  <span key={slot.key} className={`card-slot level-${value || 'none'}`}>
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
  )
}
