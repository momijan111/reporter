// バックアップ（書き出し・読み込み）と、このアプリについての説明。

import { useState } from 'react'
import { downloadBackup, importBackup } from '../lib/backup'
import { Section } from './ui'

export function SettingsView({
  recordCount,
  onImported,
  onBack,
}: {
  recordCount: number
  onImported: () => void
  onBack: () => void
}) {
  const [includePhotos, setIncludePhotos] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleExport() {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const fileName = await downloadBackup(includePhotos)
      setMessage(`${fileName} を保存しました。`)
    } catch {
      setError('書き出しできませんでした。')
    } finally {
      setBusy(false)
    }
  }

  async function handleImport(file: File | undefined) {
    if (!file) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const result = await importBackup(file)
      setMessage(
        `読み込みました。新規 ${result.added}件 / 上書き ${result.updated}件 / 写真 ${result.photos}枚`,
      )
      onImported()
    } catch (e) {
      setError(e instanceof Error ? e.message : '読み込みできませんでした。')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="settings">
      <div className="detail-head">
        <button type="button" className="btn btn-ghost btn-small" onClick={onBack}>
          ← 一覧
        </button>
        <h1 className="detail-date">設定・バックアップ</h1>
      </div>

      <Section
        title="バックアップを書き出す"
        description={`記録は ${recordCount}件 あります。1つのJSONファイルにまとめて保存できます。機種変更のときや、念のための控えに使ってください。`}
      >
        <label className="checkbox">
          <input
            type="checkbox"
            checked={includePhotos}
            onChange={(e) => setIncludePhotos(e.target.checked)}
          />
          <span>写真も一緒に書き出す（ファイルが大きくなります）</span>
        </label>
        <button
          type="button"
          className="btn btn-primary btn-block"
          disabled={busy}
          onClick={() => void handleExport()}
        >
          {busy ? '処理中…' : 'ファイルに書き出す'}
        </button>
      </Section>

      <Section
        title="バックアップを読み込む"
        description="書き出したJSONファイルを選ぶと、記録が復元されます。同じ記録があるときは上書きされます。"
      >
        <label className="file-button">
          ファイルを選ぶ
          <input
            type="file"
            accept="application/json,.json"
            onChange={(e) => {
              void handleImport(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </label>
      </Section>

      {message && <p className="notice">{message}</p>}
      {error && <p className="error">{error}</p>}

      <Section title="このアプリについて">
        <p className="note-text">
          記録はこのスマホの中（ブラウザのデータベース）だけに保存されます。インターネットには送られません。
        </p>
        <p className="note-text">
          そのため、ブラウザのデータを消したり端末を変えたりすると記録も消えます。ときどきバックアップを書き出しておくと安心です。
        </p>
        <p className="note-text">
          ホーム画面に追加しておくと、ふつうのアプリのように開けます。電波がないところでも使えます。
        </p>
        <p className="note-text">
          このアプリは家族の記録用です。医療の判断は必ず主治医にご相談ください。
        </p>
      </Section>
    </div>
  )
}
