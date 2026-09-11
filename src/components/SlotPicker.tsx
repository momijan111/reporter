// 「昨日の夜」などの時間帯ひとつぶんの、3段階の選びかたボタン。
// もう一度同じボタンを押すと、選択を取り消せる。

import { AWAKE_OPTIONS } from '../data/labels'
import type { SlotDef } from '../data/labels'
import type { AwakeLevel } from '../types'

export function SlotPicker({
  slot,
  value,
  onChange,
}: {
  slot: SlotDef
  value: AwakeLevel | ''
  onChange: (value: AwakeLevel | '') => void
}) {
  return (
    <div className="slot">
      <span className="slot-label">{slot.label}</span>
      <div className="slot-buttons">
        {AWAKE_OPTIONS.map((option) => {
          const selected = value === option.value
          return (
            <button
              key={option.value}
              type="button"
              className={`level level-${option.value}${selected ? ' level-on' : ''}`}
              aria-pressed={selected}
              onClick={() => onChange(selected ? '' : option.value)}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
