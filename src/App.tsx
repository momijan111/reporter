// 画面の切り替えと、記録の読み込み・保存・削除のまとめ役。

import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { Calendar } from './components/Calendar'
import { RecordDetail } from './components/RecordDetail'
import { RecordForm } from './components/RecordForm'
import { RecordList } from './components/RecordList'
import { SettingsView } from './components/SettingsView'
import { currentEmail, subscribeToChanges } from './lib/cloud'
import { isCloudConfigured } from './lib/cloudConfig'
import { createEmptyRecord, toPlainText, todayString } from './lib/record'
import { store } from './lib/storage'
import { removeCloudPhotos, syncNow } from './lib/sync'
import type { DailyRecord } from './types'

type View =
  | { name: 'home' }
  | { name: 'detail'; id: string }
  | { name: 'form'; record: DailyRecord; isNew: boolean }
  | { name: 'settings' }

/** 今日の年月（カレンダーの最初の表示） */
function currentMonth(): { year: number; month: number } {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

export default function App() {
  const [records, setRecords] = useState<DailyRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [view, setView] = useState<View>({ name: 'home' })
  const [shown, setShown] = useState(currentMonth)
  const [keyword, setKeyword] = useState('')
  const [notice, setNotice] = useState('')

  // 家族と共有（クラウド）まわり
  const [cloudEmail, setCloudEmail] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState('')
  const [syncError, setSyncError] = useState('')

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

  // 同時に何度も走らないようにするための目印
  const syncingRef = useRef(false)

  /** 家族と記録を合わせる。ログインしていないときは何もしない */
  async function runSync(showResult = false) {
    if (!isCloudConfigured()) return
    if (syncingRef.current) return
    if (!(await currentEmail())) return

    syncingRef.current = true
    setSyncing(true)
    try {
      await syncNow()
      setRecords(await store.listRecords())
      setLastSyncedAt(new Date().toLocaleString('ja-JP'))
      setSyncError('')
      if (showResult) showNotice('家族と同じ内容になりました。')
    } catch (e) {
      const message = e instanceof Error ? e.message : '家族と合わせられませんでした。'
      setSyncError(message)
      if (showResult) showNotice(message)
    } finally {
      syncingRef.current = false
      setSyncing(false)
    }
  }

  async function refreshCloudEmail() {
    setCloudEmail(await currentEmail())
  }

  useEffect(() => {
    // アプリを開いたときに、保存済みの記録を読み込み、家族とも合わせる
    // oxlint-disable-next-line react/set-state-in-effect
    void (async () => {
      await reload()
      await refreshCloudEmail()
      await runSync()
    })()
  }, [])

  useEffect(() => {
    // 電波が戻ったとき、アプリを開き直したときにも合わせ直す
    function handleOnline() {
      void runSync()
    }
    function handleVisible() {
      if (document.visibilityState === 'visible') void runSync()
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('focus', handleVisible)
    document.addEventListener('visibilitychange', handleVisible)

    // 念のため、開いている間は数分ごとにも確かめる
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void runSync()
    }, 5 * 60 * 1000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('focus', handleVisible)
      document.removeEventListener('visibilitychange', handleVisible)
      window.clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    // 家族の誰かが書いたら、すぐ受け取って画面を更新する
    if (!cloudEmail) return

    let timer = 0
    const stop = subscribeToChanges(() => {
      // 短い間に何度も届くことがあるので、少し待ってからまとめて合わせる
      window.clearTimeout(timer)
      timer = window.setTimeout(() => void runSync(), 1500)
    })

    return () => {
      window.clearTimeout(timer)
      stop()
    }
  }, [cloudEmail])

  function showNotice(text: string) {
    setNotice(text)
    setTimeout(() => setNotice(''), 4000)
  }

  function moveMonth(step: number) {
    setShown((prev) => {
      const date = new Date(prev.year, prev.month - 1 + step, 1)
      return { year: date.getFullYear(), month: date.getMonth() + 1 }
    })
  }

  /** その日の記録を開く。なければ、その日の新しい記録を作る */
  function openDate(date: string) {
    const existing = records.find((r) => r.date === date)
    if (existing) {
      setView({ name: 'detail', id: existing.id })
      return
    }
    setView({ name: 'form', record: createEmptyRecord(date), isNew: true })
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
    void runSync()
  }

  async function handleDelete(record: DailyRecord) {
    const ok = window.confirm(
      `${record.date} の記録を削除します。元に戻せません。よろしいですか？`,
    )
    if (!ok) return
    // クラウドに置いた写真も片づける（つながらないときは残るが、記録は消える）
    try {
      await removeCloudPhotos(record.media)
    } catch {
      // 消せなくても記録の削除は続ける
    }
    for (const item of record.media) {
      await store.deleteMedia(item.id)
    }
    // 家族にも「消した」と伝えるため、行は残して印だけつける
    await store.markDeleted(record.id)
    await reload()
    showNotice('削除しました。')
    setView({ name: 'home' })
    void runSync()
  }

  const selected =
    view.name === 'detail' ? records.find((r) => r.id === view.id) : undefined

  // 記録が見つからないとき（削除された直後など）はトップを出す
  const showHome = view.name === 'home' || (view.name === 'detail' && !loading && !selected)

  const searchHits = useMemo(() => {
    const trimmed = keyword.trim()
    if (trimmed === '') return null
    return records.filter((r) => toPlainText(r).includes(trimmed))
  }, [keyword, records])

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">母の入院記録</h1>
        {showHome && (
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

        {!loading && !loadError && showHome && (
          <>
            {cloudEmail && (
              <p className={syncError ? 'sync-line sync-line-error' : 'sync-line'}>
                {syncing
                  ? '家族と合わせています…'
                  : syncError
                    ? `家族と合わせられません（${syncError}）`
                    : `家族と共有中・自動で同期${lastSyncedAt ? `（最終 ${lastSyncedAt}）` : ''}`}
              </p>
            )}

            <Calendar
              year={shown.year}
              month={shown.month}
              records={records}
              onPrevMonth={() => moveMonth(-1)}
              onNextMonth={() => moveMonth(1)}
              onSelectDate={openDate}
            />

            {records.length > 3 && (
              <input
                type="search"
                className="search"
                placeholder="メモの言葉でさがす"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            )}

            {searchHits !== null && (
              <RecordList
                records={searchHits}
                keyword={keyword.trim()}
                onSelect={(id) => setView({ name: 'detail', id })}
              />
            )}
          </>
        )}

        {!loading && view.name === 'detail' && selected && (
          <RecordDetail
            record={selected}
            onEdit={() => setView({ name: 'form', record: selected, isNew: false })}
            onDelete={() => void handleDelete(selected)}
            onBack={() => setView({ name: 'home' })}
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
                view.isNew ? { name: 'home' } : { name: 'detail', id: view.record.id },
              )
            }
          />
        )}

        {view.name === 'settings' && (
          <SettingsView
            recordCount={records.length}
            cloudEmail={cloudEmail}
            syncing={syncing}
            lastSyncedAt={lastSyncedAt}
            onCloudChanged={() => {
              void (async () => {
                await refreshCloudEmail()
                await runSync()
              })()
            }}
            onSyncNow={() => void runSync(true)}
            onImported={() => void reload()}
            onBack={() => setView({ name: 'home' })}
          />
        )}
      </main>

      {showHome && !loading && !loadError && (
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
