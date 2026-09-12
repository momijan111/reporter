// 設定画面の「家族と共有」のところ。ログインと手動同期。

import { useState } from 'react'
import { isCloudConfigured } from '../lib/cloudConfig'
import { signIn, signOut } from '../lib/cloud'

export function CloudPanel({
  email,
  syncing,
  lastSyncedAt,
  onChanged,
  onSyncNow,
}: {
  email: string | null
  syncing: boolean
  lastSyncedAt: string
  onChanged: () => void
  onSyncNow: () => void
}) {
  const [inputEmail, setInputEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!isCloudConfigured()) {
    return (
      <section className="section">
        <h2 className="section-title">家族と共有</h2>
        <p className="note-text">
          この版では、まだ家族との共有が設定されていません。記録はこの端末の中だけに保存されます。
        </p>
      </section>
    )
  }

  async function handleSignIn() {
    setBusy(true)
    setError('')
    try {
      await signIn(inputEmail.trim(), password)
      setInputEmail('')
      setPassword('')
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ログインできませんでした。')
    } finally {
      setBusy(false)
    }
  }

  async function handleSignOut() {
    const ok = window.confirm(
      'ログアウトします。この端末に入っている記録は残りますが、家族との同期は止まります。よろしいですか？',
    )
    if (!ok) return
    setBusy(true)
    try {
      await signOut()
      onChanged()
    } finally {
      setBusy(false)
    }
  }

  if (email) {
    return (
      <section className="section">
        <h2 className="section-title">家族と共有</h2>
        <p className="section-desc">
          {email} でログイン中です。記録は自動で家族と同じ内容になります。
        </p>
        <p className="note-text">
          最後に合わせた時刻：{lastSyncedAt || 'まだ合わせていません'}
        </p>
        <p className="note-text">
          写真も家族と共有されます。動画は容量が大きいため共有されず、撮った端末の中にだけ残ります。
        </p>
        <button
          type="button"
          className="btn btn-primary btn-block"
          disabled={syncing || busy}
          onClick={onSyncNow}
        >
          {syncing ? '合わせています…' : '今すぐ家族と合わせる'}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-block btn-small"
          disabled={busy}
          onClick={() => void handleSignOut()}
        >
          ログアウト
        </button>
      </section>
    )
  }

  return (
    <section className="section">
      <h2 className="section-title">家族と共有</h2>
      <p className="section-desc">
        家族で決めたメールアドレスと合い言葉を入れると、同じ記録を家族全員で見られます。
      </p>
      <label className="field">
        <span className="field-label">メールアドレス</span>
        <input
          type="email"
          autoComplete="username"
          inputMode="email"
          value={inputEmail}
          onChange={(e) => setInputEmail(e.target.value)}
        />
      </label>
      <label className="field">
        <span className="field-label">合い言葉（パスワード）</span>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {error && <p className="error">{error}</p>}
      <button
        type="button"
        className="btn btn-primary btn-block"
        disabled={busy || inputEmail.trim() === '' || password === ''}
        onClick={() => void handleSignIn()}
      >
        {busy ? 'ログイン中…' : 'ログイン'}
      </button>
      <p className="note-text">
        ログインすると、記録（日付・3段階・メモ・写真）がインターネット上の家族用の保管場所に保存されます。動画は共有されません。
      </p>
    </section>
  )
}
