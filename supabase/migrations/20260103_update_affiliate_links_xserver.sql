-- アフィリエイトリンクの更新（エックスサーバー推奨強化）
-- アフィリエイトURLにはプレースホルダーを設定（実際のアフィリエイトIDは後で設定）

-- ============================================================================
-- 1. 既存のアフィリエイトリンクを更新
-- ============================================================================

-- エックスサーバー（一番推奨）
UPDATE public.affiliate_links
SET
  description = '【Marty一番のおすすめ】国内シェアNo.1の高速・安定レンタルサーバー。WordPress自動インストール機能付きで初心者でも安心。電話サポートも充実しています。',
  features = ARRAY['国内シェアNo.1', '高速SSD（RAID10構成）', 'WordPress簡単インストール', '無料独自SSL（無制限）', '電話・メールサポート', '10日間無料お試し', '自動バックアップ（14日分）'],
  recommended_plan = 'スタンダードプラン（初心者におすすめ）',
  price_range = '月額990円〜（12ヶ月契約の場合）',
  display_order = 1,
  affiliate_url = 'https://px.a8.net/svt/ejp?a8mat=YOUR_A8_AFFILIATE_ID_XSERVER',
  updated_at = NOW()
WHERE provider_name = 'xserver';

-- ConoHa WING
UPDATE public.affiliate_links
SET
  description = '国内最速クラスのレンタルサーバー。WordPressかんたんセットアップ機能搭載で、申し込みと同時にサイト開設可能。',
  features = ARRAY['国内最速級', 'WordPressかんたんセットアップ', '無料独自SSL', '自動バックアップ', 'WINGパック割引あり'],
  recommended_plan = 'ベーシックプラン',
  price_range = '月額643円〜（36ヶ月契約の場合）',
  display_order = 2,
  affiliate_url = 'https://px.a8.net/svt/ejp?a8mat=YOUR_A8_AFFILIATE_ID_CONOHA',
  updated_at = NOW()
WHERE provider_name = 'conoha-wing';

-- ロリポップ！
UPDATE public.affiliate_links
SET
  description = 'コストパフォーマンスに優れたレンタルサーバー。低価格から始められるので、予算を抑えたい方におすすめ。',
  features = ARRAY['低価格', 'WordPress簡単インストール', '無料独自SSL', '電話サポート'],
  recommended_plan = 'ハイスピードプラン',
  price_range = '月額550円〜',
  display_order = 3,
  affiliate_url = 'https://px.a8.net/svt/ejp?a8mat=YOUR_A8_AFFILIATE_ID_LOLIPOP',
  updated_at = NOW()
WHERE provider_name = 'lolipop';

-- さくらのレンタルサーバ
UPDATE public.affiliate_links
SET
  description = '老舗の安定したレンタルサーバー。長い実績と高い信頼性があります。',
  features = ARRAY['安定性', 'WordPress簡単インストール', '無料SSL', '2週間お試し'],
  recommended_plan = 'スタンダードプラン',
  price_range = '月額425円〜',
  display_order = 4,
  affiliate_url = 'https://px.a8.net/svt/ejp?a8mat=YOUR_A8_AFFILIATE_ID_SAKURA',
  updated_at = NOW()
WHERE provider_name = 'sakura';

-- mixhost
UPDATE public.affiliate_links
SET
  description = 'クラウド型の高速レンタルサーバー。柔軟なリソース拡張が可能。',
  features = ARRAY['高速LiteSpeed', 'WordPress簡単インストール', '無料独自SSL', '自動バックアップ'],
  recommended_plan = 'スタンダードプラン',
  price_range = '月額968円〜',
  display_order = 5,
  affiliate_url = 'https://px.a8.net/svt/ejp?a8mat=YOUR_A8_AFFILIATE_ID_MIXHOST',
  updated_at = NOW()
WHERE provider_name = 'mixhost';

-- ============================================================================
-- 2. コメント
-- ============================================================================
-- 注意: affiliate_url の 'YOUR_A8_AFFILIATE_ID_XXX' の部分は、
-- 実際のアフィリエイトIDに置き換えてください。
--
-- A8.netなどのアフィリエイトサービスに登録後、
-- 各サーバーのアフィリエイトリンクを取得して設定してください。
--
-- 例: https://px.a8.net/svt/ejp?a8mat=3XXXXX+XXXXX+XXXX+XXXXX
