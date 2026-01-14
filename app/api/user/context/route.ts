import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

/**
 * ユーザーコンテキスト取得API
 * LIFF起動時に呼び出し、直近アップロードされた画像や未完了タスクを取得
 *
 * 要件定義書 Section 5.2:
 * GET /api/user/context - LINE User IDをキーに、直近アップロードされた画像や未完了タスクを取得
 */
export async function GET(request: NextRequest) {
  try {
    // LINE User IDをヘッダーから取得
    const lineUserId = request.headers.get("X-Line-User-Id");
    const accessToken = request.headers.get("Authorization")?.replace("Bearer ", "");

    if (!lineUserId) {
      return NextResponse.json(
        { error: "LINE User ID is required" },
        { status: 400 }
      );
    }

    // アクセストークンの検証（オプション）
    if (accessToken) {
      const verifyResponse = await fetch(
        "https://api.line.me/oauth2/v2.1/verify",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            access_token: accessToken,
          }),
        }
      );

      if (!verifyResponse.ok) {
        return NextResponse.json(
          { error: "Invalid access token" },
          { status: 401 }
        );
      }
    }

    const supabaseAdmin = createAdminClient();

    // LINE User IDからユーザーを検索
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("id, line_user_id, line_display_name")
      .eq("line_user_id", lineUserId)
      .single();

    if (userError || !user) {
      // ユーザーが見つからない場合は空のコンテキストを返す
      return NextResponse.json({
        userId: null,
        recentImages: [],
        sessionContext: null,
        lastActivity: null,
      });
    }

    // アクティブセッションを取得
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("line_sessions")
      .select("id, context, last_activity_at")
      .eq("line_user_id", lineUserId)
      .eq("status", "active")
      .order("last_activity_at", { ascending: false })
      .limit(1)
      .single();

    // 直近の画像を取得（24時間以内）
    const { data: recentImages, error: imagesError } = await supabaseAdmin
      .from("line_uploaded_images")
      .select("id, file_path, status, created_at, metadata")
      .eq("user_id", user.id)
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(10);

    // 未完了の投稿タスクを取得（もしあれば）
    const { data: pendingPosts, error: postsError } = await supabaseAdmin
      .from("posts")
      .select("id, caption, scheduled_at, status, metadata")
      .eq("user_id", user.id)
      .eq("status", "draft")
      .order("created_at", { ascending: false })
      .limit(5);

    return NextResponse.json({
      userId: user.id,
      lineUserId: user.line_user_id,
      displayName: user.line_display_name,
      recentImages: recentImages || [],
      pendingPosts: pendingPosts || [],
      sessionContext: session?.context || null,
      lastActivity: session?.last_activity_at || null,
    });
  } catch (error) {
    console.error("Context fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * セッションコンテキストの更新
 */
export async function POST(request: NextRequest) {
  try {
    const lineUserId = request.headers.get("X-Line-User-Id");

    if (!lineUserId) {
      return NextResponse.json(
        { error: "LINE User ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { context } = body;

    const supabaseAdmin = createAdminClient();

    // ユーザーを取得
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("line_user_id", lineUserId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // 既存のアクティブセッションを更新または新規作成
    const { data: existingSession } = await supabaseAdmin
      .from("line_sessions")
      .select("id")
      .eq("line_user_id", lineUserId)
      .eq("status", "active")
      .single();

    if (existingSession) {
      // 既存セッションを更新
      await supabaseAdmin
        .from("line_sessions")
        .update({
          context,
          last_activity_at: new Date().toISOString(),
        })
        .eq("id", existingSession.id);
    } else {
      // 新規セッションを作成
      await supabaseAdmin.from("line_sessions").insert({
        user_id: user.id,
        line_user_id: lineUserId,
        context,
        status: "active",
        last_activity_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Context update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
