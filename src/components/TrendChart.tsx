// 「全体の調子」の移り変わりを折れ線で見るグラフ。
// ライブラリは使わず、SVGを手で描いている。

import { formatDate } from '../lib/record'
import type { DailyRecord } from '../types'

const WIDTH = 320
const HEIGHT = 120
const PADDING = { top: 12, right: 10, bottom: 22, left: 10 }
const MAX_POINTS = 21

export function TrendChart({ records }: { records: DailyRecord[] }) {
  // records は新しい順で渡されるので、古い順に並べ直す
  const points = records
    .filter((r) => r.overall !== null)
    .slice(0, MAX_POINTS)
    .reverse()

  if (points.length < 2) {
    return (
      <p className="chart-empty">
        「全体の調子」を2日ぶん以上記録すると、ここに変化のグラフが出ます。
      </p>
    )
  }

  const innerWidth = WIDTH - PADDING.left - PADDING.right
  const innerHeight = HEIGHT - PADDING.top - PADDING.bottom

  const x = (index: number) =>
    PADDING.left + (points.length === 1 ? innerWidth / 2 : (innerWidth * index) / (points.length - 1))
  // 調子は1〜5。5が上に来るようにする
  const y = (value: number) => PADDING.top + innerHeight * (1 - (value - 1) / 4)

  const line = points.map((r, i) => `${x(i)},${y(r.overall as number)}`).join(' ')

  return (
    <div className="chart">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="chart-svg"
        role="img"
        aria-label={`全体の調子の推移（${points.length}日ぶん）`}
      >
        {[1, 2, 3, 4, 5].map((value) => (
          <line
            key={value}
            x1={PADDING.left}
            x2={WIDTH - PADDING.right}
            y1={y(value)}
            y2={y(value)}
            className={value === 3 ? 'grid-line grid-line-mid' : 'grid-line'}
          />
        ))}
        <polyline points={line} className="chart-line" />
        {points.map((r, i) => (
          <circle
            key={r.id}
            cx={x(i)}
            cy={y(r.overall as number)}
            r={3.5}
            className={`chart-dot chart-dot-${r.overall}`}
          />
        ))}
        <text x={PADDING.left} y={HEIGHT - 6} className="chart-axis-label">
          {formatDate(points[0].date)}
        </text>
        <text
          x={WIDTH - PADDING.right}
          y={HEIGHT - 6}
          textAnchor="end"
          className="chart-axis-label"
        >
          {formatDate(points[points.length - 1].date)}
        </text>
      </svg>
      <p className="chart-caption">上にいくほど調子が良い日です。</p>
    </div>
  )
}
