# パフォーマンスとアクセシビリティガイド

このドキュメントでは、Martyアプリケーションで実装されているパフォーマンス最適化とアクセシビリティ機能について説明します。

## 📊 パフォーマンス最適化

### 1. 画像最適化

**実装場所**: `next.config.ts`

- **AVIF/WebP形式**: 最新の画像フォーマットで自動変換
- **レスポンシブ画像**: デバイスサイズに応じた最適な画像サイズを提供
- **遅延読み込み**: スクロールに応じて画像を読み込み

```typescript
images: {
  formats: ["image/avif", "image/webp"],
  deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
}
```

### 2. コード分割とLazy Loading

**実装場所**: `lib/lazy-components.ts`

重いコンポーネントを動的インポートして初期バンドルサイズを削減：

- `LazyImageGenerationModal` - 画像生成モーダル
- `LazyPurchaseModal` - クレジット購入モーダル
- `LazyIntegrationModal` - 連携設定モーダル
- `LazyCreditUsageChart` - Rechartsグラフ（クライアントサイドのみ）

**使用例**:
```typescript
import { LazyImageGenerationModal } from "@/lib/lazy-components";

// モーダルが必要になるまでバンドルに含まれない
{showModal && <LazyImageGenerationModal />}
```

### 3. Core Web Vitals計測

**実装場所**: `components/web-vitals.tsx`

以下のメトリクスを自動計測：

- **LCP** (Largest Contentful Paint) - 最大コンテンツの描画
- **FID** (First Input Delay) - 初回入力遅延
- **CLS** (Cumulative Layout Shift) - 累積レイアウトシフト
- **FCP** (First Contentful Paint) - 初回コンテンツの描画
- **TTFB** (Time to First Byte) - 最初のバイトまでの時間

開発環境では自動的にコンソールに表示され、本番環境ではGoogle Analyticsに送信されます。

## ♿ アクセシビリティ対応

### 1. キーボードナビゲーション

**実装場所**: `hooks/use-keyboard-navigation.ts`

#### 主要機能：

- **カスタムショートカット**: キーボードショートカットの定義と処理
- **フォーカストラップ**: モーダル内でフォーカスを閉じ込める
- **Skip to Content**: メインコンテンツへのスキップリンク

**使用例**:
```typescript
import { useKeyboardNavigation } from "@/hooks/use-keyboard-navigation";

useKeyboardNavigation([
  {
    key: "s",
    ctrlKey: true,
    action: () => handleSave(),
    description: "保存",
  },
]);
```

### 2. スクリーンリーダー対応

**実装場所**:
- `components/accessibility/skip-to-content.tsx`
- `components/accessibility/visually-hidden.tsx`

#### Skip to Content

キーボードユーザーとスクリーンリーダーユーザーがナビゲーションをスキップできるリンク：

```tsx
<SkipToContent />
// Tab キーを押すと "メインコンテンツへスキップ" リンクが表示される
```

#### VisuallyHidden

視覚的には隠すがスクリーンリーダーには読み上げられるテキスト：

```tsx
<VisuallyHidden>追加情報をスクリーンリーダーに提供</VisuallyHidden>
```

#### ARIA Live Region

動的コンテンツの変更を通知：

```tsx
<AriaLive politeness="polite">
  {successMessage}
</AriaLive>
```

### 3. カラーコントラスト

**実装場所**: `app/globals.css`

WCAG 2.1 AA基準に準拠したカラーコントラスト：

- **通常テキスト**: 4.5:1以上
- **大きなテキスト**: 3:1以上
- **高コントラストモード**: ユーザー設定に対応

```css
@media (prefers-contrast: high) {
  * {
    border-width: 2px !important;
  }
}
```

### 4. アニメーション削減

**実装場所**: `app/globals.css`

ユーザーがアニメーションを減らす設定にしている場合に対応：

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### 5. アクセシビリティチェッカー（開発環境のみ）

**実装場所**: `components/accessibility/a11y-checker.tsx`

開発環境で自動的にアクセシビリティの問題を検出：

- alt属性のない画像
- ラベルのないボタン
- ラベルのないフォーム要素
- 見出しレベルのスキップ
- カラーコントラスト不足

## 🎯 ベストプラクティス

### 画像を使用する場合

```tsx
import Image from "next/image";

// ✅ 良い例
<Image
  src="/image.jpg"
  alt="画像の説明"
  width={800}
  height={600}
  loading="lazy"
/>

// ❌ 悪い例
<img src="/image.jpg" /> // alt属性がない、最適化されない
```

### ボタンを作成する場合

```tsx
// ✅ 良い例
<button aria-label="メニューを開く">
  <MenuIcon />
</button>

// ❌ 悪い例
<button>
  <MenuIcon />
</button> // アイコンのみでラベルがない
```

### フォーム要素を作成する場合

```tsx
// ✅ 良い例
<label htmlFor="email">メールアドレス</label>
<input id="email" type="email" required />

// ❌ 悪い例
<input type="email" placeholder="メールアドレス" />
// ラベルがない
```

### モーダルを作成する場合

```tsx
import { useFocusTrap } from "@/hooks/use-keyboard-navigation";

function Modal({ isOpen, onClose }) {
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, isOpen);

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <h2 id="modal-title">モーダルタイトル</h2>
      {/* コンテンツ */}
    </div>
  );
}
```

## 🧪 テスト方法

### キーボードナビゲーション

1. Tabキーでフォーカスを移動
2. Enterキーでボタンを押す
3. Escapeキーでモーダルを閉じる
4. 矢印キーでリスト内を移動

### スクリーンリーダー

- **macOS**: VoiceOver (Cmd + F5)
- **Windows**: NVDA (無料) または JAWS
- **Chrome拡張**: ChromeVox

### カラーコントラスト

ブラウザの開発者ツールでコントラスト比を確認：
1. 要素を検査
2. スタイルパネルでコントラスト比を確認
3. WCAG AA/AAA基準を満たしているか確認

### パフォーマンス

```bash
# Lighthouseで計測
npm run build
npm run start
# Chrome DevTools > Lighthouse > Generate Report
```

## 📚 参考リンク

- [WCAG 2.1 ガイドライン](https://www.w3.org/WAI/WCAG21/quickref/)
- [Next.js Image Optimization](https://nextjs.org/docs/basic-features/image-optimization)
- [Core Web Vitals](https://web.dev/vitals/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
