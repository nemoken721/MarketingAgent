import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

/**
 * LINE認証連携API
 * LIFF経由でLINE User IDを取得し、アプリアカウントと紐付け
 */

interface LineAuthRequest {
  lineUserId: string;
  lineDisplayName: string;
  linePictureUrl?: string;
  accessToken: string;
}

/**
 * POST: LINE IDでログイン/新規登録
 * LIFFから呼び出され、LINE User IDでユーザーを特定または新規作成
 */
export async function POST(request: NextRequest) {
  try {
    const body: LineAuthRequest = await request.json();
    const { lineUserId, lineDisplayName, linePictureUrl, accessToken } = body;

    if (!lineUserId || !accessToken) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // LINEアクセストークンの検証
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
        { error: "Invalid LINE access token" },
        { status: 401 }
      );
    }

    const verifyData = await verifyResponse.json();

    // トークンの有効期限確認
    if (verifyData.expires_in <= 0) {
      return NextResponse.json(
        { error: "LINE access token expired" },
        { status: 401 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // 既存ユーザーをLINE User IDで検索
    const { data: existingUser, error: searchError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("line_user_id", lineUserId)
      .single();

    if (searchError && searchError.code !== "PGRST116") {
      // PGRST116 = not found (expected)
      console.error("User search error:", searchError);
      return NextResponse.json(
        { error: "Database error" },
        { status: 500 }
      );
    }

    if (existingUser) {
      // 既存ユーザー: LINE情報を更新してセッション作成
      const { error: updateError } = await supabaseAdmin
        .from("users")
        .update({
          line_display_name: lineDisplayName,
          line_picture_url: linePictureUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingUser.id);

      if (updateError) {
        console.error("User update error:", updateError);
      }

      // カスタムセッショントークンを生成（Supabase Auth経由）
      // ※本番環境ではJWTカスタムクレームやSupabase Authのカスタムフローを使用
      return NextResponse.json({
        success: true,
        user: {
          id: existingUser.id,
          lineUserId: existingUser.line_user_id,
          displayName: lineDisplayName,
          isNewUser: false,
        },
      });
    }

    // 新規ユーザー作成（LINE経由の簡易登録）
    // メールアドレスなしでの登録を許可（後からBAN対策で任意登録を促す）
    const tempEmail = `line_${lineUserId}@line.local`;
    const tempPassword = crypto.randomUUID();

    const { data: authUser, error: signUpError } =
      await supabaseAdmin.auth.admin.createUser({
        email: tempEmail,
        password: tempPassword,
        email_confirm: true, // 自動確認（LINE認証済みのため）
        user_metadata: {
          line_user_id: lineUserId,
          display_name: lineDisplayName,
          picture_url: linePictureUrl,
          auth_provider: "line",
        },
      });

    if (signUpError || !authUser.user) {
      console.error("User creation error:", signUpError);
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      );
    }

    // usersテーブルにLINE情報を保存
    const { error: insertError } = await supabaseAdmin.from("users").upsert({
      id: authUser.user.id,
      email: tempEmail,
      line_user_id: lineUserId,
      line_display_name: lineDisplayName,
      line_picture_url: linePictureUrl,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error("User insert error:", insertError);
    }

    // 初期クレジットを付与
    const { error: creditsError } = await supabaseAdmin.from("credits").insert({
      user_id: authUser.user.id,
      balance: 100, // 初期クレジット
      created_at: new Date().toISOString(),
    });

    if (creditsError) {
      console.error("Credits insert error:", creditsError);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authUser.user.id,
        lineUserId,
        displayName: lineDisplayName,
        isNewUser: true,
      },
    });
  } catch (error) {
    console.error("LINE auth error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET: 現在のLINE連携状態を取得
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ connected: false }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("line_user_id, line_display_name, line_picture_url")
      .eq("id", user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ connected: false });
    }

    return NextResponse.json({
      connected: !!profile?.line_user_id,
      lineUserId: profile?.line_user_id,
      lineDisplayName: profile?.line_display_name,
      linePictureUrl: profile?.line_picture_url,
    });
  } catch (error) {
    console.error("LINE status check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
