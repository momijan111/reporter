// Supabase への接続とログインまわり。

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { CLOUD_ANON_KEY, CLOUD_URL, isCloudConfigured } from './cloudConfig'

let client: SupabaseClient | null = null

/** Supabase のクライアント。未設定のときは null */
export function getClient(): SupabaseClient | null {
  if (!isCloudConfigured()) return null
  if (!client) {
    client = createClient(CLOUD_URL, CLOUD_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  }
  return client
}

/** いまログインしている人のメールアドレス。していなければ null */
export async function currentEmail(): Promise<string | null> {
  const supabase = getClient()
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user.email ?? null
}

export async function signIn(email: string, password: string): Promise<void> {
  const supabase = getClient()
  if (!supabase) throw new Error('クラウド共有が設定されていません。')
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    throw new Error(
      error.message === 'Invalid login credentials'
        ? 'メールアドレスか合い言葉がちがうようです。'
        : `ログインできませんでした（${error.message}）`,
    )
  }
}

export async function signOut(): Promise<void> {
  const supabase = getClient()
  if (!supabase) return
  await supabase.auth.signOut()
}

/**
 * 家族の誰かが記録を変えたときに、すぐ知らせてもらうしくみ。
 * 戻り値を呼ぶと受け取りをやめる。
 */
export function subscribeToChanges(onChange: () => void): () => void {
  const supabase = getClient()
  if (!supabase) return () => {}

  const channel = supabase
    .channel('records-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'records' }, () => {
      onChange()
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'medicines' }, () => {
      onChange()
    })
    .subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}
