# 忘却曲線単語帳

忘却曲線を用いた今までにない単語帳アプリ。自動で自分用の忘却曲線に沿った単語帳を作成して忘れる前に出題してくれます。記憶に定着しやすい学習方法を提供します。

## 機能

- ユーザー認証（ログイン/サインアップ）
- ダッシュボード（単語帳一覧と暗記学習）
- 単語帳の作成と管理
- 単語の追加と編集
- 忘却曲線に基づいた暗記テスト

## 技術スタック

- Next.js
- TypeScript
- Tailwind CSS
- Supabase (認証・データベース)

## セットアップ

1. リポジトリをクローン
2. 依存関係をインストール: `npm install`
3. 環境変数を設定:
   - `.env.local` ファイルを作成し、Supabaseの認証情報を追加

```
NEXT_PUBLIC_SUPABASE_URL=あなたのSupabase URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=あなたのSupabase Anon Key
```

4. アプリケーションを起動: `npm run dev`

## データベース構造

Supabaseに以下のテーブルが必要です：

### users テーブル
- id (uuid, primary key)
- email (text)
- created_at (timestamp)

### wordbooks テーブル
- id (uuid, primary key)
- user_id (uuid, foreign key to users.id)
- title (text)
- created_at (timestamp)
- last_studied_at (timestamp, nullable) - 最後に学習した日時

### words テーブル
- id (uuid, primary key)
- wordbook_id (uuid, foreign key to wordbooks.id)
- front (text) - 単語
- back (text) - 意味
- created_at (timestamp)
- last_studied_at (timestamp, nullable) - 最後に学習した日時
- next_review_at (timestamp, nullable) - 次回復習予定日時
- level (integer, default 0) - 習熟度レベル

## データベース更新（既存プロジェクト用）

既存のプロジェクトを更新する場合は、以下の手順でデータベースを更新してください：

1. Supabase Studio にアクセス
2. `wordbooks` テーブルに以下のカラムを追加:
   - `last_studied_at` (timestamp, nullable)
3. `words` テーブルに以下のカラムを追加:
   - `last_studied_at` (timestamp, nullable)
   - `next_review_at` (timestamp, nullable)
   - `level` (integer, default 0)

## ライセンス

MIT
