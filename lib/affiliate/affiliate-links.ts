import { createClient } from "@/lib/supabase/server";

/**
 * アフィリエイトリンク情報の型定義
 */
export interface AffiliateLink {
  id: string;
  provider_name: string;
  display_name: string;
  affiliate_url: string;
  description: string | null;
  features: string[] | null;
  recommended_plan: string | null;
  price_range: string | null;
  is_active: boolean;
  display_order: number;
}

/**
 * 有効なアフィリエイトリンクを全て取得
 * 表示順序でソート
 */
export async function getActiveAffiliateLinks(): Promise<AffiliateLink[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("affiliate_links")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error) {
      console.error("[Affiliate Links] データ取得エラー:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("[Affiliate Links] 予期しないエラー:", error);
    return [];
  }
}

/**
 * 特定のプロバイダーのアフィリエイトリンクを取得
 */
export async function getAffiliateLinkByProvider(
  providerName: string
): Promise<AffiliateLink | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("affiliate_links")
      .select("*")
      .eq("provider_name", providerName)
      .eq("is_active", true)
      .single();

    if (error) {
      console.error(
        `[Affiliate Links] ${providerName} の取得エラー:`,
        error
      );
      return null;
    }

    return data;
  } catch (error) {
    console.error("[Affiliate Links] 予期しないエラー:", error);
    return null;
  }
}

/**
 * アフィリエイトリンクをMarkdown形式でフォーマット
 * チャットUIで表示する際に使用
 */
export function formatAffiliateLinkAsMarkdown(link: AffiliateLink): string {
  let markdown = `### ${link.display_name}\n\n`;

  if (link.description) {
    markdown += `${link.description}\n\n`;
  }

  if (link.features && link.features.length > 0) {
    markdown += `**特徴:**\n`;
    link.features.forEach((feature) => {
      markdown += `- ${feature}\n`;
    });
    markdown += `\n`;
  }

  if (link.recommended_plan) {
    markdown += `**おすすめプラン:** ${link.recommended_plan}\n\n`;
  }

  if (link.price_range) {
    markdown += `**料金:** ${link.price_range}\n\n`;
  }

  markdown += `👉 [${link.display_name}の詳細はこちら](${link.affiliate_url})\n\n`;

  return markdown;
}

/**
 * 全アフィリエイトリンクをMarkdown形式でフォーマット
 */
export function formatAllAffiliateLinksAsMarkdown(
  links: AffiliateLink[]
): string {
  if (links.length === 0) {
    return "現在、利用可能なサーバー情報はありません。";
  }

  let markdown = `## おすすめレンタルサーバー\n\n`;
  markdown += `WordPress構築に最適なレンタルサーバーをご紹介します。\n\n`;
  markdown += `---\n\n`;

  links.forEach((link) => {
    markdown += formatAffiliateLinkAsMarkdown(link);
    markdown += `---\n\n`;
  });

  return markdown;
}
