// トップに出すカレンダー。1日ぶんのマスを、3つの時間帯の色だけで表す。
// 左＝昨日の夜、中＝昼間、右＝面会時間。

import { useRef } from 'react'
import { SLOTS, awakeLabel } from '../data/labels'
import { todayString } from '../lib/record'
import type { DailyRecord } from '../types'

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** その月の日数 */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export function Calendar({
  year,
  /** 1〜12 */
  month,
  records,
  onPrevMonth,
  onNextMonth,
  onSelectDate,
}: {
  year: number
  month: number
  records: DailyRecord[]
  onPrevMonth: () => void
  onNextMonth: () => void
  onSelectDate: (date: string) => void
}) {
  // 日付から記録を引けるようにしておく（同じ日が複数あるときは最初のもの）
  const byDate = new Map<string, DailyRecord>()
  for (const record of records) {
    if (!byDate.has(record.date)) byDate.set(record.date, record)
  }

  const today = todayString()
  const firstWeekday = new Date(year, month - 1, 1).getDay()
  const total = daysInMonth(year, month)
  const weeks = Math.ceil((firstWeekday + total) / 7)
  const cells = weeks * 7

  // 横にスワイプしても月が変わるようにする
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  function handleTouchStart(e: React.TouchEvent) {
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const start = touchStart.current
    touchStart.current = null
    if (!start) return
    const t = e.changedTouches[0]
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    // 縦スクロールと間違えないよう、はっきり横に動いたときだけ反応する
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 2) return
    if (dx > 0) onPrevMonth()
    else onNextMonth()
  }

  return (
    <div className="calendar">
      <div className="calendar-head">
        <button
          type="button"
          className="calendar-nav"
          onClick={onPrevMonth}
          aria-label="前の月"
        >
          ‹
        </button>
        <h2 className="calendar-month">
          {year}年{month}月
        </h2>
        <button
          type="button"
          className="calendar-nav"
          onClick={onNextMonth}
          aria-label="次の月"
        >
          ›
        </button>
      </div>

      <div
        className="calendar-body"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="calendar-weekdays">
          {WEEKDAYS.map((name, index) => (
            <span key={name} className={`weekday weekday-${index}`}>
              {name}
            </span>
          ))}
        </div>

        <div className="calendar-grid">
          {Array.from({ length: cells }, (_, index) => {
            const day = index - firstWeekday + 1
            if (day < 1 || day > total) {
              return <span key={index} className="day day-blank" />
            }

            const date = `${year}-${pad(month)}-${pad(day)}`
            const record = byDate.get(date)
            const isToday = date === today

            const description = SLOTS.map(
              (slot) => `${slot.label}は${awakeLabel(record?.slots[slot.key]) || '記録なし'}`,
            ).join('、')

            return (
              <button
                key={index}
                type="button"
                className={`day${isToday ? ' day-today' : ''}${record ? ' day-has' : ''}`}
                onClick={() => onSelectDate(date)}
                aria-label={`${month}月${day}日 ${record ? description : '記録なし'}`}
              >
                <span className="day-number">{day}</span>
                <span className="day-bars">
                  {SLOTS.map((slot) => (
                    <span
                      key={slot.key}
                      className={`day-bar level-${record?.slots[slot.key] || 'none'}`}
                    />
                  ))}
                </span>
                {record && record.media.length > 0 && <span className="day-dot" />}
              </button>
            )
          })}
        </div>
      </div>

      <div className="legend">
        <p className="legend-note">
          <span className="legend-columns" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          左＝昨日の夜／中＝昼間／右＝面会時間
        </p>
        <ul className="legend-items">
          <li>
            <span className="legend-swatch level-awake" />
            よく起きている
          </li>
          <li>
            <span className="legend-swatch level-drowsy" />
            少し起きてる
          </li>
          <li>
            <span className="legend-swatch level-asleep" />
            寝てる
          </li>
          <li>
            <span className="legend-swatch level-none" />
            記録なし
          </li>
        </ul>
      </div>

    </div>
  )
}
