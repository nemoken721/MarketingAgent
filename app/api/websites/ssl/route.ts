import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CertbotInstaller } from "@/lib/ssl/certbot-installer";

/**
 * SSL証明書インストールAPI
 * POST /api/websites/ssl
 *
 * Let's Encryptを使用してSSL証明書を自動インストールする
 */

interface SSLInstallRequest {
  websiteId: string;
  email: string; // Let's Encrypt通知用メールアドレス
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
    const body: SSLInstallRequest = await request.json();
    const { websiteId, email } = body;

    // バリデーション
    if (!websiteId || !email) {
      return NextResponse.json(
        { error: "すべての項目が必要です" },
        { status: 400 }
      );
    }

    // Websiteがユーザーに属しているか確認 & サーバー接続情報を取得
    const { data: website, error: websiteError } = await supabase
      .from("websites")
      .select(
        "id, user_id, domain, server_host, server_user, server_pass_encrypted, server_port, status"
      )
      .eq("id", websiteId)
      .single();

    if (websiteError || !website || website.user_id !== user.id) {
      return NextResponse.json(
        { error: "Websiteが見つかりません" },
        { status: 404 }
      );
    }

    // WordPress構築が完了しているか確認
    if (website.status !== "ssl_pending") {
      return NextResponse.json(
        {
          error: "WordPress構築が完了していません",
          details: "まずWordPressの構築を完了してください",
        },
        { status: 400 }
      );
    }

    // サーバー接続情報が設定されているか確認
    if (
      !website.server_host ||
      !website.server_user ||
      !website.server_pass_encrypted
    ) {
      return NextResponse.json(
        { error: "サーバー接続情報が設定されていません" },
        { status: 400 }
      );
    }

    // ステータスを「SSL設定中」に更新
    await supabase
      .from("websites")
      .update({
        status: "ssl_installing",
        current_step: 5,
        updated_at: new Date().toISOString(),
      })
      .eq("id", websiteId);

    // SSL証明書インストールを非同期で実行
    installSSLAsync(
      websiteId,
      website.domain,
      website.server_host,
      website.server_port || 22,
      website.server_user,
      website.server_pass_encrypted,
      email
    ).catch((error) => {
      console.error("[SSL Install Error]", error);
    });

    return NextResponse.json({
      success: true,
      message: "SSL証明書のインストールを開始しました。完了までしばらくお待ちください。",
      websiteId,
    });
  } catch (error: any) {
    console.error("[SSL API Error]", error);
    return NextResponse.json(
      { error: "エラーが発生しました", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * SSL証明書インストールを非同期で実行
 */
async function installSSLAsync(
  websiteId: string,
  domain: string,
  host: string,
  port: number,
  username: string,
  encryptedPassword: string,
  email: string
) {
  const supabase = await createClient();

  try {
    console.log(`[SSL Install] インストール開始: ${domain}`);

    // CertbotInstallerインスタンス作成
    const installer = new CertbotInstaller(
      websiteId,
      host,
      port,
      username,
      encryptedPassword
    );

    // SSL証明書インストール実行
    await installer.install({
      domain,
      email,
    });

    // 成功: ステータスを「完了」に更新
    await supabase
      .from("websites")
      .update({
        status: "completed",
        current_step: 6,
        ssl_enabled: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", websiteId);

    console.log(`[SSL Install] インストール完了: ${domain}`);
  } catch (error: any) {
    console.error(`[SSL Install] インストール失敗: ${domain}`, error);

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
