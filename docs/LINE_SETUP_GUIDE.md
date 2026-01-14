# Marty LINE連携セットアップガイド

このガイドでは、MartyのLINE連携機能をセットアップする手順を説明します。

## Phase 1: LINE Developers Console 設定

### 1. プロバイダーの作成

1. [LINE Developers Console](https://developers.line.biz/) にアクセス
2. LINEアカウントでログイン
3. 「プロバイダーを作成」をクリック
4. プロバイダー名を入力（例: `Marty`）

### 2. Messaging APIチャネルの作成

1. 作成したプロバイダーを選択
2. 「新規チャネル作成」→「Messaging API」を選択
3. 以下の情報を入力:
   - **チャネル名**: Marty
   - **チャネル説明**: AI Marketing Partner
   - **大業種**: その他
   - **小業種**: その他
   - **メールアドレス**: 連絡先メールアドレス

### 3. チャネル設定

#### 基本設定
1. 「Messaging API設定」タブへ移動
2. **チャネルアクセストークン**を発行（長期）
3. **チャネルシークレット**を確認

#### Webhook設定
1. 「Webhook URL」に以下を設定:
   ```
   https://your-domain.com/api/webhook/line
   ```
2. 「Webhookの利用」を**オン**
3. 「応答メッセージ」を**オフ**（カスタム応答を使用）
4. 「あいさつメッセージ」を**オフ**（カスタム応答を使用）

### 4. LINEログインチャネルの作成

1. 同じプロバイダー内で「新規チャネル作成」→「LINEログイン」を選択
2. 以下の情報を入力:
   - **チャネル名**: Marty Login
   - **チャネル説明**: Marty ログイン認証用

### 5. LIFFアプリの登録

1. LINEログインチャネルの「LIFF」タブへ移動
2. 「追加」をクリック
3. 以下を設定:

| 項目 | 設定値 |
|------|--------|
| LIFFアプリ名 | Marty |
| サイズ | Full |
| エンドポイントURL | `https://your-domain.com/liff` |
| Scope | `profile`, `openid` |
| ボットリンク機能 | On (Normal) |

4. 作成後、**LIFF ID**をコピー（形式: `1234567890-abcdefgh`）

---

## Phase 2: 環境変数の設定

`.env.local` ファイルに以下を追加:

```env
# LINE連携 (LIFF / Messaging API)
NEXT_PUBLIC_LIFF_ID=1234567890-abcdefgh  # LIFFアプリID
LINE_CHANNEL_SECRET=your_channel_secret   # Messaging APIチャネルシークレット
LINE_CHANNEL_ACCESS_TOKEN=your_access_token  # チャネルアクセストークン
```

---

## Phase 3: リッチメニューの設定

### LINE Official Account Manager での設定

1. [LINE Official Account Manager](https://manager.line.biz/) にアクセス
2. 該当するアカウントを選択
3. 「リッチメニュー」→「作成」

### レイアウト設計

**推奨: 3分割レイアウト（大サイズ）**

```
+------------------+------------------+------------------+
|                  |                  |                  |
|   画像から作成    |  アカウント診断   |    設定・プラン   |
|      📸          |       📊         |       ⚙️         |
|                  |                  |                  |
+------------------+------------------+------------------+
```

### ボタン設定

| ボタン | アクション | リンク |
|--------|----------|--------|
| 画像から作成 | リンク | `https://liff.line.me/{LIFF_ID}/create?mode=image` |
| アカウント診断 | リンク | `https://liff.line.me/{LIFF_ID}/analytics` |
| 設定・プラン | リンク | `https://liff.line.me/{LIFF_ID}/settings` |

---

## データベースマイグレーション

Supabaseで以下のマイグレーションを実行:

```bash
# Supabase CLI使用の場合
supabase db push

# または SQL Editor で直接実行
# supabase/migrations/20260114_add_line_integration.sql の内容を実行
```

---

## 動作確認

### 1. LIFFアプリのテスト

1. スマートフォンでLINEアプリを開く
2. 作成したMessaging APIチャネルのQRコードを読み取り、友だち追加
3. リッチメニューから「画像から作成」をタップ
4. LIFFアプリが起動することを確認

### 2. Webhook のテスト

1. LINEトーク画面で画像を送信
2. Botが「画像を受け取りました！」と応答することを確認
3. LIFFアプリを開き、送信した画像が表示されることを確認

---

## トラブルシューティング

### LIFFが起動しない

- エンドポイントURLがHTTPSであることを確認
- ドメインがLIFF設定の許可リストに含まれていることを確認

### Webhookが動作しない

- Webhook URLが正しいことを確認
- Webhook検証が成功していることを確認
- サーバーログでエラーを確認

### 画像が取得できない

- `LINE_CHANNEL_ACCESS_TOKEN` が正しいことを確認
- 画像のcontent取得権限があることを確認

---

## セキュリティ考慮事項

1. **チャネルシークレット**: Webhook署名検証に使用。絶対に公開しない
2. **アクセストークン**: Push API等で使用。サーバーサイドのみで使用
3. **LIFF ID**: クライアントサイドで使用。公開可能

---

## 参考リンク

- [LINE Developers Documentation](https://developers.line.biz/ja/docs/)
- [LIFF Documentation](https://developers.line.biz/ja/docs/liff/)
- [Messaging API Reference](https://developers.line.biz/ja/reference/messaging-api/)
