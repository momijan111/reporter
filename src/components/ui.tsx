// 画面のあちこちで使いまわす、入力まわりの部品。

import type { ReactNode } from 'react'
import type { Option } from '../data/labels'

export function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="section">
      <h2 className="section-title">{title}</h2>
      {description && <p className="section-desc">{description}</p>}
      <div className="section-body">{children}</div>
    </section>
  )
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

/** 1つだけ選ぶボタン群。同じ選択肢をもう一度押すと選択を取り消せる */
export function ChoiceGroup<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: Option<T>[]
  value: T | '' | null
  onChange: (value: T | null) => void
}) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="chips">
        {options.map((option) => {
          const selected = value === option.value
          return (
            <button
              key={String(option.value)}
              type="button"
              className={selected ? 'chip chip-on' : 'chip'}
              aria-pressed={selected}
              onClick={() => onChange(selected ? null : option.value)}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** いくつでも選べるボタン群 */
export function CheckGroup<T extends string>({
  label,
  options,
  values,
  onChange,
}: {
  label: string
  options: Option<T>[]
  values: T[]
  onChange: (values: T[]) => void
}) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="chips">
        {options.map((option) => {
          const selected = values.includes(option.value)
          return (
            <button
              key={option.value}
              type="button"
              className={selected ? 'chip chip-on' : 'chip'}
              aria-pressed={selected}
              onClick={() =>
                onChange(
                  selected
                    ? values.filter((v) => v !== option.value)
                    : [...values, option.value],
                )
              }
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
