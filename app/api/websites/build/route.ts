import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { WordPressBuilder } from "@/lib/wordpress/builder";

/**
 * WordPress構築API
 * POST /api/websites/build
 *
 * サーバー接続情報を使ってWordPressを自動構築する
 */

interface BuildRequest {
  websiteId: string;
  siteTitle: string;
  adminUser: string;
  adminPassword: string;
  adminEmail: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // リクエストボディを取得
    const body: BuildRequest = await request.json();
    const { websiteId, siteTitle, adminUser, adminPassword, adminEmail } = body;

    // バリデーション
    if (!websiteId || !siteTitle || !adminUser || !adminPassword || !adminEmail) {
      return NextResponse.json(
        { error: "すべての項目が必要です" },
        { status: 400 }
      );
    }

    // Websiteがユーザーに属しているか確認 & サーバー接続情報を取得
    const { data: website, error: websiteError } = await supabase
      .from("websites")
      .select(
        "id, user_id, domain, server_host, server_user, server_pass_encrypted, server_key_encrypted, server_port, metadata, wp_detection_result, status"
      )
      .eq("id", websiteId)
      .single();

    if (websiteError || !website || website.user_id !== user.id) {
      return NextResponse.json(
        { error: "Websiteが見つかりません" },
        { status: 404 }
      );
    }

    // ★★★ WordPress既存インストールチェック ★★★
    const detection = website.wp_detection_result as any;
    if (detection?.installed) {
      console.log("[Build API] WordPress already installed! Blocking build.", {
        domain: website.domain,
        wpVersion: detection.wpVersion,
        siteUrl: detection.siteUrl,
      });
      return NextResponse.json(
        {
          error: "WordPressは既にインストール済みです",
          alreadyInstalled: true,
          wpVersion: detection.wpVersion,
          siteUrl: detection.siteUrl,
          message: "新規構築は不要です。プラグインのインストールやページ作成は専用APIをご利用ください。",
        },
        { status: 400 }
      );
    }

    // ステータスチェック（完了済み、SSL待ち、構築中なら拒否）
    const blockedStatuses = ["completed", "active", "ssl_pending", "building"];
    if (blockedStatuses.includes(website.status)) {
      console.log("[Build API] Website already in progress or complete!", { status: website.status });
      const statusMessages: Record<string, string> = {
        completed: "構築完了",
        active: "アクティブ",
        ssl_pending: "SSL設定待ち",
        building: "構築中",
      };
      return NextResponse.json(
        {
          error: `このWebサイトは既に${statusMessages[website.status] || website.status}です`,
          currentStatus: website.status,
        },
        { status: 400 }
      );
    }

    // サーバー接続情報が設定されているか確認
    // パスワード認証またはキー認証のどちらかが必要
    const hasCredentials =
      website.server_host &&
      website.server_user &&
      (website.server_pass_encrypted || website.server_key_encrypted);

    if (!hasCredentials) {
      return NextResponse.json(
        { error: "サーバー接続情報が設定されていません" },
        { status: 400 }
      );
    }

    // ステータスを「構築中」に更新
    await supabase
      .from("websites")
      .update({
        status: "building",
        current_step: 3,
        updated_at: new Date().toISOString(),
      })
      .eq("id", websiteId);

    // サーバープロバイダーをmetadataから取得
    const serverProvider = (website.metadata as any)?.server_provider || "other";

    // WordPress構築を非同期で実行
    // 注: 実際の本番環境では、バックグラウンドジョブ（Queueなど）を使用すべき
    buildWordPressAsync(
      websiteId,
      website.domain,
      website.server_host,
      website.server_port || 22,
      website.server_user,
      website.server_pass_encrypted || null,
      website.server_key_encrypted || null,
      serverProvider,
      {
        domain: website.domain,
        siteTitle,
        adminUser,
        adminPassword,
        adminEmail,
      }
    ).catch((error) => {
      console.error("[WordPress Build Error]", error);
    });

    return NextResponse.json({
      success: true,
      message: "WordPress構築を開始しました。完了までしばらくお待ちください。",
      websiteId,
    });
  } catch (error: any) {
    console.error("[Build API Error]", error);
    return NextResponse.json(
      { error: "エラーが発生しました", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * WordPress構築を非同期で実行
 */
async function buildWordPressAsync(
  websiteId: string,
  domain: string,
  host: string,
  port: number,
  username: string,
  encryptedPassword: string | null,
  encryptedKey: string | null,
  serverProvider: string,
  config: {
    domain: string;
    siteTitle: string;
    adminUser: string;
    adminPassword: string;
    adminEmail: string;
  }
) {
  const supabase = await createClient();

  try {
    console.log(`[WordPress Build] 構築開始: ${domain} (provider: ${serverProvider})`);

    // WordPressBuilderインスタンス作成
    const builder = new WordPressBuilder(
      websiteId,
      host,
      port,
      username,
      encryptedPassword,
      encryptedKey,
      serverProvider
    );

    // 構築実行
    await builder.build(config);

    // 成功: ステータスを「SSL設定待ち」に更新
    await supabase
      .from("websites")
      .update({
        status: "ssl_pending",
        current_step: 4,
        wp_version: "latest", // 実際のバージョンを取得する場合はWP-CLIで確認
        updated_at: new Date().toISOString(),
      })
      .eq("id", websiteId);

    console.log(`[WordPress Build] 構築完了: ${domain}`);
  } catch (error: any) {
    console.error(`[WordPress Build] 構築失敗: ${domain}`, error);

    // エラー: ステータスを「エラー」に更新
    await supabase
      .from("websites")
      .update({
        status: "error",
        error_message: error.message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", websiteId);
  }
}
