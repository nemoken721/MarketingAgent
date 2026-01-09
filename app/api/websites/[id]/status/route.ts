import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * WordPress構築進捗確認API
 * GET /api/websites/[id]/status
 *
 * リアルタイムで構築進捗を取得する
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("[Status API] リクエスト受信 - ハンドラ開始");

  try {
    const { id: websiteId } = await params;
    console.log("[Status API] Website ID:", websiteId);

    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log("[Status API] 認証エラー:", authError?.message);
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    console.log("[Status API] 認証OK - ユーザー:", user.id);

    // Websiteがユーザーに属しているか確認 & 進捗情報を取得
    const { data: website, error: websiteError } = await supabase
      .from("websites")
      .select("id, user_id, status, build_progress, ssl_progress, error_message")
      .eq("id", websiteId)
      .single();

    if (websiteError) {
      console.log("[Status API] DBエラー:", websiteError.message, websiteError.code);
      return NextResponse.json(
        { error: "Websiteの取得に失敗しました: " + websiteError.message },
        { status: 404 }
      );
    }

    if (!website) {
      console.log("[Status API] Websiteが見つかりません:", websiteId);
      return NextResponse.json(
        { error: "Websiteが見つかりません" },
        { status: 404 }
      );
    }

    if (website.user_id !== user.id) {
      console.log("[Status API] 権限エラー:", {
        websiteUserId: website.user_id,
        requestUserId: user.id
      });
      return NextResponse.json(
        { error: "このWebsiteにアクセスする権限がありません" },
        { status: 403 }
      );
    }

    console.log("[Status API] 成功:", { status: website.status });

    return NextResponse.json({
      success: true,
      status: website.status,
      buildProgress: website.build_progress || {
        step: 0,
        message: "",
        percent: 0,
        completed: false,
      },
      sslProgress: website.ssl_progress || {
        step: 0,
        message: "",
        percent: 0,
        completed: false,
      },
      errorMessage: website.error_message || null,
    });
  } catch (error: any) {
    console.error("[Status API Error]", error);
    return NextResponse.json(
      { error: "エラーが発生しました", details: error.message },
      { status: 500 }
    );
  }
}
