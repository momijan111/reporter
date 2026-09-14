// 記録の入力画面で、その日に使った薬を選ぶところ。
// 一覧にない薬は、その場で登録できる。

import { useState } from 'react'
import { newId } from '../lib/record'
import { store } from '../lib/storage'
import type { Medicine } from '../types'

export function MedicinePicker({
  medicines,
  selectedIds,
  onChange,
  onMedicineAdded,
}: {
  /** 登録ずみの薬（使用中のものだけ） */
  medicines: Medicine[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  onMedicineAdded: () => void
}) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  // 一覧から消えた薬でも、すでに選ばれていれば選択は残す
  const known = new Set(medicines.map((m) => m.id))

  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id])
  }

  async function handleAdd() {
    const trimmed = name.trim()
    if (trimmed === '') return
    setBusy(true)
    try {
      const now = new Date().toISOString()
      const medicine: Medicine = {
        id: newId(),
        name: trimmed,
        note: note.trim(),
        archived: false,
        createdAt: now,
        updatedAt: now,
      }
      await store.saveMedicine(medicine)
      onChange([...selectedIds, medicine.id])
      onMedicineAdded()
      setName('')
      setNote('')
      setAdding(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="medicines">
      {medicines.length === 0 && !adding && (
        <p className="note-text">
          まだ薬が登録されていません。「＋ 薬を登録」から追加すると、次からは選ぶだけになります。
        </p>
      )}

      {medicines.length > 0 && (
        <div className="chips">
          {medicines.map((medicine) => {
            const selected = selectedIds.includes(medicine.id)
            return (
              <button
                key={medicine.id}
                type="button"
                className={selected ? 'chip chip-on' : 'chip'}
                aria-pressed={selected}
                onClick={() => toggle(medicine.id)}
              >
                {medicine.name}
                {medicine.note && <span className="chip-note">{medicine.note}</span>}
              </button>
            )
          })}
        </div>
      )}

      {selectedIds.some((id) => !known.has(id)) && (
        <p className="note-text">
          使用をやめた薬も選ばれています（記録はそのまま残ります）。
        </p>
      )}

      {adding ? (
        <div className="medicine-form">
          <label className="field">
            <span className="field-label">薬の名前</span>
            <input
              type="text"
              autoFocus
              placeholder="例）アムロジピン"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">メモ（量・タイミングなど・なくてよい）</span>
            <input
              type="text"
              placeholder="例）朝1錠"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-ghost btn-small"
              onClick={() => {
                setAdding(false)
                setName('')
                setNote('')
              }}
            >
              やめる
            </button>
            <button
              type="button"
              className="btn btn-primary btn-small"
              disabled={busy || name.trim() === ''}
              onClick={() => void handleAdd()}
            >
              登録して選ぶ
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn btn-ghost btn-small" onClick={() => setAdding(true)}>
          ＋ 薬を登録
        </button>
      )}
    </div>
  )
}
