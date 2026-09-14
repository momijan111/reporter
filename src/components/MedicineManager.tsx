// 設定画面の「薬の登録」。名前とメモの修正、使用の終了・再開ができる。

import { useState } from 'react'
import { newId } from '../lib/record'
import { store } from '../lib/storage'
import type { Medicine } from '../types'

export function MedicineManager({
  medicines,
  onChanged,
}: {
  /** 登録ずみの薬すべて（使用をやめたものも含む） */
  medicines: Medicine[]
  onChanged: () => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)

  const active = medicines.filter((m) => !m.archived)
  const stopped = medicines.filter((m) => m.archived)

  function startEdit(medicine: Medicine) {
    setAdding(false)
    setEditingId(medicine.id)
    setName(medicine.name)
    setNote(medicine.note)
  }

  function reset() {
    setEditingId(null)
    setAdding(false)
    setName('')
    setNote('')
  }

  async function save(medicine: Medicine) {
    setBusy(true)
    try {
      await store.saveMedicine({ ...medicine, updatedAt: new Date().toISOString() })
      onChanged()
    } finally {
      setBusy(false)
    }
  }

  async function handleSaveEdit() {
    const target = medicines.find((m) => m.id === editingId)
    if (!target || name.trim() === '') return
    await save({ ...target, name: name.trim(), note: note.trim() })
    reset()
  }

  async function handleAdd() {
    if (name.trim() === '') return
    const now = new Date().toISOString()
    await save({
      id: newId(),
      name: name.trim(),
      note: note.trim(),
      archived: false,
      createdAt: now,
      updatedAt: now,
    })
    reset()
  }

  function renderForm(onSubmit: () => void, submitLabel: string) {
    return (
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
          <button type="button" className="btn btn-ghost btn-small" onClick={reset}>
            やめる
          </button>
          <button
            type="button"
            className="btn btn-primary btn-small"
            disabled={busy || name.trim() === ''}
            onClick={onSubmit}
          >
            {submitLabel}
          </button>
        </div>
      </div>
    )
  }

  function renderRow(medicine: Medicine) {
    if (editingId === medicine.id) {
      return <li key={medicine.id}>{renderForm(() => void handleSaveEdit(), '保存')}</li>
    }
    return (
      <li key={medicine.id} className="medicine-row">
        <div className="medicine-name">
          <span>{medicine.name}</span>
          {medicine.note && <span className="medicine-note">{medicine.note}</span>}
        </div>
        <div className="medicine-actions">
          <button
            type="button"
            className="btn btn-ghost btn-small"
            onClick={() => startEdit(medicine)}
          >
            直す
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-small"
            disabled={busy}
            onClick={() => void save({ ...medicine, archived: !medicine.archived })}
          >
            {medicine.archived ? 'また使う' : '使用をやめる'}
          </button>
        </div>
      </li>
    )
  }

  return (
    <section className="section">
      <h2 className="section-title">薬の登録</h2>
      <p className="section-desc">
        ここに登録しておくと、記録の画面では選ぶだけで入力できます。家族全員で同じ一覧を使います。
      </p>

      {active.length === 0 && !adding && (
        <p className="note-text">まだ登録がありません。</p>
      )}

      {active.length > 0 && <ul className="medicine-list">{active.map(renderRow)}</ul>}

      {adding ? (
        renderForm(() => void handleAdd(), '登録する')
      ) : (
        <button
          type="button"
          className="btn btn-ghost btn-block btn-small"
          onClick={() => {
            reset()
            setAdding(true)
          }}
        >
          ＋ 薬を登録
        </button>
      )}

      {stopped.length > 0 && (
        <>
          <h3 className="medicine-subtitle">使用をやめた薬</h3>
          <p className="note-text">
            記録の画面には出てきませんが、過去の記録では名前が表示されます。
          </p>
          <ul className="medicine-list">{stopped.map(renderRow)}</ul>
        </>
      )}
    </section>
  )
}
