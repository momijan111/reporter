// 画面の切り替えと、記録の読み込み・保存・削除のまとめ役。

import { useEffect, useState } from 'react'
import './App.css'
import { RecordDetail } from './components/RecordDetail'
import { RecordForm } from './components/RecordForm'
import { RecordList } from './components/RecordList'
import { SettingsView } from './components/SettingsView'
import { createEmptyRecord, todayString } from './lib/record'
import { store } from './lib/storage'
import type { DailyRecord } from './types'

type View =
  | { name: 'list' }
  | { name: 'detail'; id: string }
  | { name: 'form'; record: DailyRecord; isNew: boolean }
  | { name: 'settings' }

export default function App() {
  const [records, setRecords] = useState<DailyRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [view, setView] = useState<View>({ name: 'list' })
  const [keyword, setKeyword] = useState('')
  const [notice, setNotice] = useState('')

  async function reload() {
    try {
      setRecords(await store.listRecords())
      setLoadError('')
    } catch {
      setLoadError('記録を読み込めませんでした。ブラウザのプライベートモードでは使えないことがあります。')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // アプリを開いたときに、保存済みの記録をデータベースから読み込む
    // oxlint-disable-next-line react/set-state-in-effect
    void reload()
  }, [])

  function showNotice(text: string) {
    setNotice(text)
    setTimeout(() => setNotice(''), 4000)
  }

  function startToday() {
    const today = todayString()
    const existing = records.find((r) => r.date === today)
    if (existing) {
      showNotice('今日の記録はすでにあります。続きを書き足せます。')
      setView({ name: 'form', record: existing, isNew: false })
      return
    }
    setView({ name: 'form', record: createEmptyRecord(today), isNew: true })
  }

  async function handleSaved(saved: DailyRecord) {
    await reload()
    showNotice('保存しました。')
    setView({ name: 'detail', id: saved.id })
  }

  async function handleDelete(record: DailyRecord) {
    const ok = window.confirm(
      `${record.date} の記録を削除します。元に戻せません。よろしいですか？`,
    )
    if (!ok) return
    for (const item of record.media) {
      await store.deleteMedia(item.id)
    }
    await store.deleteRecord(record.id)
    await reload()
    showNotice('削除しました。')
    setView({ name: 'list' })
  }

  const selected =
    view.name === 'detail' ? records.find((r) => r.id === view.id) : undefined

  // 記録が見つからないとき（削除された直後など）は一覧を出す
  const showList =
    view.name === 'list' || (view.name === 'detail' && !loading && !selected)

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">母の入院記録</h1>
        {view.name === 'list' && (
          <button
            type="button"
            className="btn btn-ghost btn-small"
            onClick={() => setView({ name: 'settings' })}
          >
            設定
          </button>
        )}
      </header>

      {notice && <p className="notice notice-float">{notice}</p>}

      <main className="app-main">
        {loading && <p className="empty">読み込み中…</p>}
        {!loading && loadError && <p className="error">{loadError}</p>}

        {!loading && !loadError && showList && (
          <RecordList
            records={records}
            keyword={keyword}
            onKeywordChange={setKeyword}
            onSelect={(id) => setView({ name: 'detail', id })}
          />
        )}

        {!loading && view.name === 'detail' && selected && (
          <RecordDetail
            record={selected}
            onEdit={() => setView({ name: 'form', record: selected, isNew: false })}
            onDelete={() => void handleDelete(selected)}
            onBack={() => setView({ name: 'list' })}
          />
        )}

        {view.name === 'form' && (
          <RecordForm
            key={view.record.id}
            initialRecord={view.record}
            isNew={view.isNew}
            onSaved={(saved) => void handleSaved(saved)}
            onCancel={() =>
              setView(
                view.isNew ? { name: 'list' } : { name: 'detail', id: view.record.id },
              )
            }
          />
        )}

        {view.name === 'settings' && (
          <SettingsView
            recordCount={records.length}
            onImported={() => void reload()}
            onBack={() => setView({ name: 'list' })}
          />
        )}
      </main>

      {showList && !loading && !loadError && (
        <div className="app-footer">
          <button type="button" className="btn btn-primary btn-block" onClick={startToday}>
            今日の記録をつける
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-block btn-small"
            onClick={() =>
              setView({ name: 'form', record: createEmptyRecord(''), isNew: true })
            }
          >
            別の日の記録を追加
          </button>
        </div>
      )}
    </div>
  )
}
