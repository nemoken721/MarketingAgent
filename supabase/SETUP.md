# Supabase セットアップガイド

このガイドでは、Martyプロジェクト用のSupabaseデータベースをセットアップする手順を説明します。

## ステップ1: Supabaseプロジェクトの作成

1. **Supabaseにアクセス**
   - [Supabase](https://supabase.com/)にアクセス
   - GitHubアカウントでサインアップ/ログイン

2. **新規プロジェクトを作成**
   - 「New Project」をクリック
   - プロジェクト名: `marty-production`（または任意の名前）
   - Database Password: 安全なパスワードを設定（メモしておく）
   - Region: `Northeast Asia (Tokyo)` を選択（日本からのアクセスが最速）
   - 「Create new project」をクリック

3. **プロジェクトの準備完了を待つ**
   - 数分かかります（緑色の「Active」状態になるまで待機）

## ステップ2: APIキーの取得

1. **Project Settings を開く**
   - 左サイドバーの歯車アイコン「Project Settings」をクリック
   - 「API」タブをクリック

2. **必要な情報をコピー**
   - `Project URL`: プロジェクトのURL
   - `anon public`: 公開用の匿名キー

## ステップ3: 環境変数の設定

プロジェクトの `.env.local` ファイルに以下を追加:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=あなたのProject URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=あなたのanon public key
```

例:
```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## ステップ4: データベーススキーマの作成

1. **SQL Editorを開く**
   - 左サイドバーの「SQL Editor」をクリック

2. **新しいクエリを作成**
   - 「New query」ボタンをクリック

3. **マイグレーションSQLを実行**
   - `supabase/migrations/20260101_initial_schema.sql` の内容を全てコピー
   - SQL Editorに貼り付け
   - 「Run」ボタンをクリック

4. **実行結果を確認**
   - 「Success. No rows returned」と表示されればOK
   - エラーが出た場合は、メッセージを確認して修正

## ステップ5: テーブルの確認

1. **Table Editorを開く**
   - 左サイドバーの「Table Editor」をクリック

2. **作成されたテーブルを確認**
   以下のテーブルが表示されていればOK:
   - `users`
   - `credits`
   - `credit_logs`
   - `integrations`
   - `websites`
   - `affiliate_tools`

## ステップ6: 認証設定

1. **Authenticationを開く**
   - 左サイドバーの「Authentication」をクリック

2. **Email認証を有効化**
   - 「Providers」タブをクリック
   - 「Email」が有効になっていることを確認
   - 必要に応じて「Confirm email」をオフにする（開発中は便利）

3. **Google OAuth（オプション）**
   - 「Providers」タブで「Google」を選択
   - Google Cloud ConsoleでOAuth認証情報を取得
   - Client IDとClient Secretを設定

## ステップ7: セキュリティ設定

1. **Site URLの設定**
   - 「Authentication」→「URL Configuration」
   - Site URL: `http://localhost:3000`（開発環境）
   - Redirect URLs: `http://localhost:3000/auth/callback`

2. **本番環境用**
   - デプロイ後、本番URLを追加:
     - Site URL: `https://your-domain.com`
     - Redirect URLs: `https://your-domain.com/auth/callback`

## ステップ8: Row Level Security (RLS) の確認

すでにマイグレーションSQLで設定済みですが、確認方法:

1. **Table Editorで確認**
   - 各テーブルをクリック
   - 右上の「RLS enabled」が有効になっていることを確認

2. **ポリシーの確認**
   - テーブルを選択
   - 「Policies」タブをクリック
   - 作成されたポリシーが表示される

## トラブルシューティング

### エラー: "relation does not exist"
- SQL実行順序が正しいか確認
- 全てのSQLを一度に実行してください

### エラー: "permission denied"
- RLSポリシーが正しく設定されているか確認
- auth.uid()が正しく取得できているか確認

### 接続エラー
- `.env.local`のURLとキーが正しいか確認
- ブラウザのコンソールでエラーを確認

## 次のステップ

セットアップが完了したら:

1. 開発サーバーを再起動: `npm run dev`
2. ブラウザで `http://localhost:3000` を開く
3. サインアップページでアカウント作成をテスト

## データベースのバックアップ

重要なデータは定期的にバックアップしてください:

1. Supabaseダッシュボード → 「Database」→「Backups」
2. 自動バックアップが有効になっていることを確認
3. 手動バックアップも可能

## 参考リンク

- [Supabase 公式ドキュメント](https://supabase.com/docs)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
