# Phase 5: データベースと認証の強化 - セットアップガイド

Phase 5 では、以下のセキュリティと堅牢性の向上を実装しました:

1. **RLS（Row Level Security）の強化** - きめ細かい権限設定
2. **credit_ledger テーブル** - クレジット履歴の詳細な記録と監査証跡
3. **トランザクション処理** - ポイント消費時の排他制御（二重消費防止）
4. **メール確認必須化** - スパム登録の防止（本番環境のみ）
5. **セッション管理の強化** - トークンの有効期限管理

---

## 📋 実装内容

### 1. データベーススキーマの拡張

#### credit_ledger テーブル（新規）
- すべてのクレジット増減を記録
- `balance_after` カラムで変動後の残高を保存（監査証跡）
- `reference_id` で Stripe決済ID や投稿ID を参照

#### users テーブルの拡張
- `stripe_customer_id` - Stripe 顧客ID
- `subscription_status` - サブスクリプション状態
- `email_confirmed` - メール確認フラグ

#### integrations テーブルの拡張
- `token_expires_at` - トークン有効期限
- `is_valid` - 連携が有効かフラグ
- `last_error` - 最後のエラーログ

#### posts テーブルの拡張
- `error_message` - 投稿失敗時のエラーメッセージ
- `status` に `pending_approval` を追加

### 2. RLS ポリシーの強化

すべてのテーブルで、SELECT/INSERT/UPDATE/DELETE を分離して細かく制御:

```sql
-- 例: posts テーブル
CREATE POLICY "posts_select_own" ON public.posts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "posts_insert_own" ON public.posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "posts_update_own" ON public.posts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "posts_delete_own" ON public.posts FOR DELETE
  USING (auth.uid() = user_id);
```

### 3. トランザクション処理用のデータベース関数

#### `consume_credits()` - クレジット消費
```sql
SELECT public.consume_credits(
  'user-uuid',          -- ユーザーID
  10,                   -- 消費量
  '画像生成',           -- 説明
  'post-uuid'           -- 参照ID（オプション）
);
```

- 排他ロック (`FOR UPDATE`) で同時実行を制御
- 残高チェック
- アトミックな更新（credits + credit_ledger）

#### `grant_credits()` - クレジット付与
```sql
SELECT public.grant_credits(
  'user-uuid',          -- ユーザーID
  500,                  -- 付与量
  'purchase',           -- トランザクションタイプ
  'Stripe購入',         -- 説明
  'stripe-payment-id'   -- 参照ID（オプション）
);
```

### 4. メール確認必須化

#### フロー
1. ユーザーがサインアップ
2. Resend 経由で確認メールを送信
3. ユーザーがメール内のリンクをクリック
4. `/auth/confirm` で確認処理
5. `users.email_confirmed` が `true` に更新
6. ログイン可能に

#### 本番環境のみ有効
ミドルウェアで `NODE_ENV === 'production'` の場合のみチェック:

```typescript
if (requireEmailConfirmation && !userData.email_confirmed) {
  // /auth/verify-email にリダイレクト
}
```

開発環境ではメール確認なしでログイン可能です。

---

## 🚀 セットアップ手順

### 1. マイグレーションの実行

Supabase Dashboard の SQL Editor で以下のマイグレーションを実行:

```bash
supabase/migrations/20260103_phase5_enhanced_security.sql
```

または、Supabase CLI を使用:

```bash
supabase db push
```

### 2. 実行内容の確認

以下が正しく作成されたか確認:

✅ **credit_ledger テーブル**
```sql
SELECT * FROM public.credit_ledger LIMIT 5;
```

✅ **users テーブルの新しいカラム**
```sql
SELECT id, email, email_confirmed, stripe_customer_id, subscription_status
FROM public.users LIMIT 5;
```

✅ **データベース関数**
```sql
-- 関数の存在確認
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('consume_credits', 'grant_credits');
```

### 3. RLS ポリシーの確認

```sql
-- ポリシーの一覧表示
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### 4. 開発サーバーの再起動

```bash
# 現在のサーバーを停止（Ctrl+C）
npm run dev
```

---

## 🧪 動作確認

### 1. クレジット消費のテスト

画像生成を実行して、以下を確認:

1. **ポイントが正しく減る**
   - Sidebar の Ma-Point が 10pt 減少

2. **credit_ledger に記録される**
   ```sql
   SELECT * FROM public.credit_ledger
   WHERE user_id = 'your-user-id'
   ORDER BY created_at DESC
   LIMIT 5;
   ```

3. **残高不足時のエラー**
   - 残高 < 10pt の状態で画像生成を試み、エラーメッセージが表示される

### 2. 排他制御のテスト（高度）

同時に複数の画像生成リクエストを送信し、残高が正しく管理されるか確認:

```javascript
// ブラウザのコンソールで実行
Promise.all([
  fetch('/api/chat', { method: 'POST', body: JSON.stringify({messages: [{role: 'user', content: '画像を生成して'}]}) }),
  fetch('/api/chat', { method: 'POST', body: JSON.stringify({messages: [{role: 'user', content: '画像を生成して'}]}) }),
  fetch('/api/chat', { method: 'POST', body: JSON.stringify({messages: [{role: 'user', content: '画像を生成して'}]}) }),
]);
```

期待される結果:
- 残高が正確に減る（二重消費なし）
- credit_ledger に正しく記録される

### 3. メール確認のテスト（本番環境）

1. **新規ユーザー登録**
   - `/auth/signup` でアカウント作成

2. **確認メールの受信**
   - Resend Dashboard で送信ログを確認
   - メール受信確認

3. **メール確認前のアクセス制限**
   - ログイン後、`/auth/verify-email` にリダイレクトされる

4. **メール確認**
   - メール内のリンクをクリック
   - `/auth/confirm` で確認処理
   - ホームページにリダイレクト

5. **データベース確認**
   ```sql
   SELECT id, email, email_confirmed FROM public.users WHERE email = 'test@example.com';
   ```
   `email_confirmed` が `true` になっていることを確認

---

## 🔒 セキュリティチェックリスト

Phase 5 をデプロイする前に確認:

- ✅ **RLS が有効化されている**
  - すべてのテーブルで `ENABLE ROW LEVEL SECURITY`

- ✅ **credits テーブルへの直接更新が禁止されている**
  - ポリシーが SELECT のみ
  - 更新は `consume_credits()` / `grant_credits()` 関数経由のみ

- ✅ **排他制御が機能している**
  - データベース関数内で `FOR UPDATE` を使用

- ✅ **メール確認が本番環境で必須化されている**
  - `NODE_ENV === 'production'` でのみチェック

- ✅ **Sentry でエラーが監視されている**
  - クレジット関連のエラーが Sentry に送信される

---

## 📊 監視とメンテナンス

### 1. credit_ledger の監視

不正なクレジット操作を検出:

```sql
-- マイナス残高のチェック（あってはならない）
SELECT * FROM public.credit_ledger WHERE balance_after < 0;

-- 大量消費の検出（1時間に50pt以上消費）
SELECT user_id, SUM(ABS(amount)) as total_consumed
FROM public.credit_ledger
WHERE transaction_type = 'usage'
AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY user_id
HAVING SUM(ABS(amount)) > 50;
```

### 2. メール確認率の監視

```sql
-- メール未確認ユーザーの割合
SELECT
  COUNT(*) FILTER (WHERE email_confirmed = false) as unconfirmed,
  COUNT(*) as total,
  ROUND(100.0 * COUNT(*) FILTER (WHERE email_confirmed = false) / COUNT(*), 2) as unconfirmed_percentage
FROM public.users;
```

### 3. RLS ポリシーの定期確認

```sql
-- すべてのテーブルでRLSが有効か確認
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = false;

-- 結果が空であれば OK
```

---

## 🐛 トラブルシューティング

### エラー: "function consume_credits does not exist"

**原因:** マイグレーションが実行されていない

**解決策:**
```sql
-- Supabase Dashboard の SQL Editor で実行
\i supabase/migrations/20260103_phase5_enhanced_security.sql
```

### エラー: "Insufficient credits"

**原因:** ポイント残高が不足

**確認:**
```sql
SELECT balance FROM public.credits WHERE user_id = 'your-user-id';
```

**解決策:**
```sql
-- テスト用にポイントを追加
SELECT public.grant_credits(
  'your-user-id',
  1000,
  'bonus',
  'テスト用ボーナス',
  NULL
);
```

### メール確認ページにリダイレクトされ続ける

**原因:** `email_confirmed` が `false` のまま

**確認:**
```sql
SELECT id, email, email_confirmed FROM public.users WHERE id = 'your-user-id';
```

**解決策（開発環境のみ）:**
```sql
-- 強制的に確認済みにする
UPDATE public.users
SET email_confirmed = true
WHERE id = 'your-user-id';
```

---

## 📚 参考リンク

- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL FOR UPDATE](https://www.postgresql.org/docs/current/sql-select.html#SQL-FOR-UPDATE-SHARE)
- [Supabase Database Functions](https://supabase.com/docs/guides/database/functions)

---

## 🎉 Phase 5 完了

これでデータベースと認証の強化が完了しました。

次のステップ（Phase 6）では、API とロジックの堅牢化を行います:

- Instagram/X API の本番連携
- Stripe Webhook の署名検証強化
- Cron Jobs による予約投稿

ご質問やエラーが発生した場合は、お気軽にお知らせください。
