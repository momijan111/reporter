# 家族と記録を共有する設定のしかた

家族全員が同じ記録を見られるようにするには、Supabase（無料で使えるデータの置き場）を
1つ用意します。作業は**10〜15分**くらい、**1回だけ**です。

やることは3つ。

1. Supabase でプロジェクトを作る
2. 表（テーブル）と写真置き場を作る ← コピペするSQLを用意しています
3. 家族用のアカウントを1つ作る

最後に、画面に出る**2つの文字列**をアプリに設定すれば完成です。

---

## 1. Supabase でプロジェクトを作る

1. https://supabase.com/ を開いて **Start your project** からアカウントを作る
   （GitHub アカウントでログインできます）
2. **New project** を押す
3. 次を入力して **Create new project**
   - **Name**：`hospital-log`（なんでもよい）
   - **Database Password**：自動生成のままでよい（使いません。念のためメモ）
   - **Region**：`Northeast Asia (Tokyo)`
   - **Plan**：**Free**

できあがるまで1〜2分かかります。

---

## 2. 表と写真置き場を作る

1. 左のメニューの **SQL Editor** を開く
2. **New query** を押す
3. 下のSQLを**まるごとコピーして貼り付け**、**Run** を押す

```sql
-- 記録を入れる表
create table if not exists public.records (
  id text primary key,
  owner uuid not null references auth.users (id) on delete cascade,
  date text not null,
  slots jsonb not null default '{}'::jsonb,
  note text not null default '',
  media jsonb not null default '[]'::jsonb,
  deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 自分（家族のアカウント）の記録だけ読み書きできるようにする
alter table public.records enable row level security;

drop policy if exists "family can use own records" on public.records;
create policy "family can use own records" on public.records
  for all to authenticated
  using (auth.uid() = owner)
  with check (auth.uid() = owner);

-- 写真を入れる場所（外から直接は見えない設定）
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

-- 自分のフォルダの写真だけ読み書きできるようにする
drop policy if exists "family can use own photos" on storage.objects;
create policy "family can use own photos" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 家族の誰かが書いたら、すぐほかの端末に知らせる設定
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'records'
  ) then
    alter publication supabase_realtime add table public.records;
  end if;
end $$;
```

`Success. No rows returned` と出れば成功です。

---

## 3. 家族用のアカウントを1つ作る

家族全員で**同じメールアドレスと合い言葉**を使います。

1. 左のメニューの **Authentication** → **Users** を開く
2. **Add user** → **Create new user** を押す
3. 入力する
   - **Email**：家族で使うメールアドレス（例 `kazoku.kiroku@example.com`）
   - **Password**：**長めの合い言葉**にしてください
     （これを知っている人は記録も写真もすべて見られます。
     「母の名前＋数字＋記号」のような、他人に推測されないものを）
   - **Auto Confirm User**：**オン**にする
4. **Create user**

### 続けて、他人が勝手に登録できないようにする

1. **Authentication** → **Sign In / Providers**（または **Providers** → **Email**）を開く
2. **Allow new users to sign up** を **オフ** にして保存

これで、いま作った1つのアカウントだけがログインできる状態になります。

---

## 4. 2つの文字列をアプリに設定する

1. 左のメニューの **Project Settings**（歯車）→ **API** を開く
2. 次の2つをコピーする
   - **Project URL**（`https://xxxxxxxx.supabase.co` のような形）
   - **Project API keys** の **anon public**（とても長い文字列）
3. `src/lib/cloudConfig.ts` の次の部分に貼り付けて、`main` に push する

```ts
const FALLBACK_URL = 'https://xxxxxxxx.supabase.co'
const FALLBACK_ANON_KEY = 'eyJhbGciOi...（長い文字列）'
```

この2つはアプリの中に埋め込まれる公開用のもので、外から見えても問題ありません。
記録は「ログイン」と「行ごとの権限設定（上のSQL）」で守られます。

---

## 5. 家族に配る

家族それぞれのスマホで、

1. https://momijan111.github.io/reporter/ を開く
2. ホーム画面に追加する
3. **設定 → 家族と共有** で、メールアドレスと合い言葉を入れてログイン

これで全員が同じ記録を見られます。

---

## 覚えておいてほしいこと

- **写真は共有されます。動画は共有されません**（容量が大きいため、撮った端末の中だけに残ります）
- **同じ日の記録を2人が同時に直すと、あとに保存したほうが残ります**
- 同期は**自動**です。家族の誰かが書くとすぐ届き、アプリを開き直したときや
  電波が戻ったときにも合わせ直します。設定画面のボタンはふだん押す必要はありません
- 電波がないところでも記録できます。つながったときに自動で家族と合わせます
- 合い言葉を知っている人は記録をすべて見られます。家族以外に教えないでください
- 無料枠：データベース500MB・写真の保管1GB。
  縮小後の写真は1枚0.2MBほどなので、1GBで数千枚入ります
- Supabase の無料プロジェクトは**1週間まったく使わないと一時停止**します。
  毎日使っていれば止まりません。止まった場合は Supabase の画面から再開できます
