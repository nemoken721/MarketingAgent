import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { WordPressBuilder, WPDetectionResult } from "@/lib/wordpress/builder";

/**
 * WordPress検出API
 * POST /api/websites/detect-wordpress
 *
 * SSH経由でサーバーに接続し、WordPressがインストール済みか検出する
 */

interface DetectRequest {
  websiteId: string;
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
    const body: DetectRequest = await request.json();
    const { websiteId } = body;

    if (!websiteId) {
      return NextResponse.json(
        { error: "websiteIdが必要です" },
        { status: 400 }
      );
    }

    // Websiteがユーザーに属しているか確認 & サーバー接続情報を取得
    const { data: website, error: websiteError } = await supabase
      .from("websites")
      .select(
        "id, user_id, domain, server_host, server_user, server_pass_encrypted, server_key_encrypted, server_port, metadata"
      )
      .eq("id", websiteId)
      .single();

    if (websiteError || !website || website.user_id !== user.id) {
      return NextResponse.json(
        { error: "Websiteが見つかりません" },
        { status: 404 }
      );
    }

    // サーバー接続情報が設定されているか確認
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

    // サーバープロバイダーをmetadataから取得
    const serverProvider = (website.metadata as any)?.server_provider || "other";

    // WordPressBuilderインスタンス作成
    const builder = new WordPressBuilder(
      websiteId,
      website.server_host,
      website.server_port || 22,
      website.server_user,
      website.server_pass_encrypted || null,
      website.server_key_encrypted || null,
      serverProvider
    );

    try {
      // SSH接続
      await builder.connect();

      // WordPress検出
      const detectionResult = await builder.detectExistingWordPress(website.domain);

      // 検出結果をDBに保存
      await supabase
        .from("websites")
        .update({
          wp_detection_result: detectionResult,
          updated_at: new Date().toISOString(),
        })
        .eq("id", websiteId);

      // SSH切断
      builder.disconnect();

      return NextResponse.json({
        success: true,
        detection: detectionResult,
        message: detectionResult.installed
          ? "WordPressを検出しました"
          : "WordPressは未インストールです",
      });
    } catch (sshError: any) {
      return NextResponse.json(
        {
          success: false,
          error: "SSH接続エラー",
          details: sshError.message,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("[Detect WordPress API Error]", error);
    return NextResponse.json(
      { error: "エラーが発生しました", details: error.message },
      { status: 500 }
    );
  }
}
