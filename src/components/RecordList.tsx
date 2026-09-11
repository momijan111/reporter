// 保存した記録の一覧。

import { labelOf } from '../data/labels'
import { formatDate, summarize, toPlainText } from '../lib/record'
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
  const shown =
    trimmed === ''
      ? records
      : records.filter((r) => toPlainText(r).includes(trimmed))

  return (
    <div className="list">
      <input
        type="search"
        className="search"
        placeholder="言葉でさがす（例：リハビリ、先生）"
        value={keyword}
        onChange={(e) => onKeywordChange(e.target.value)}
      />

      {records.length === 0 && (
        <p className="empty">
          まだ記録がありません。下の「今日の記録をつける」から始めてください。
        </p>
      )}
      {records.length > 0 && shown.length === 0 && (
        <p className="empty">「{trimmed}」に当てはまる記録はありませんでした。</p>
      )}

      <ul className="card-list">
        {shown.map((record) => {
          const summary = summarize(record)
          return (
            <li key={record.id}>
              <button type="button" className="card" onClick={() => onSelect(record.id)}>
                <div className="card-head">
                  <span className="card-date">{formatDate(record.date)}</span>
                  {record.overall !== null && (
                    <span className={`badge badge-${record.overall}`}>
                      {labelOf('overall', record.overall)}
                    </span>
                  )}
                </div>
                {summary && <p className="card-summary">{summary}</p>}
                {record.photos.length > 0 && (
                  <span className="card-meta">写真 {record.photos.length}枚</span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
