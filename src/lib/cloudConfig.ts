// 家族と記録を共有するためのクラウド（Supabase）の接続先。
//
// 【設定のしかた】
// Supabase の「Project Settings → API」に出てくる2つの文字列を、
// 下の2つの '' の中に貼り付けてください。
// これはウェブアプリの中に埋め込まれる公開用のキーで、
// 外から見えても問題ないものです（データは行単位の権限設定とログインで守ります）。
//
// GitHub Actions のシークレット（VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY）を
// 使う場合は、そちらが優先されます。

const FALLBACK_URL = ''
const FALLBACK_ANON_KEY = ''

export const CLOUD_URL: string = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL
export const CLOUD_ANON_KEY: string =
  import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_ANON_KEY

/** クラウド共有が設定されているか */
export function isCloudConfigured(): boolean {
  return CLOUD_URL !== '' && CLOUD_ANON_KEY !== ''
}
