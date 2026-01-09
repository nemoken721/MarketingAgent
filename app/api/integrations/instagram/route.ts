import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Instagram連携を作成（ダミーOAuth処理）
export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ダミーのアクセストークンを生成
  const dummyAccessToken = `dummy_instagram_token_${Date.now()}`;
  const dummyRefreshToken = `dummy_instagram_refresh_${Date.now()}`;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 60); // 60日後に期限切れ

  // すでに連携済みか確認
  const { data: existing } = await supabase
    .from("integrations")
    .select("id")
    .eq("user_id", user.id)
    .eq("platform", "instagram")
    .single();

  if (existing) {
    // 既存の連携を更新
    const { data, error } = await supabase
      .from("integrations")
      .update({
        access_token: dummyAccessToken,
        refresh_token: dummyRefreshToken,
        expires_at: expiresAt.toISOString(),
        metadata: {
          username: "demo_user",
          connected_at: new Date().toISOString(),
        },
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      console.error("Instagram integration update error:", error);
      return NextResponse.json(
        { error: "Failed to update integration" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, integration: data });
  } else {
    // 新規連携を作成
    const { data, error } = await supabase
      .from("integrations")
      .insert({
        user_id: user.id,
        platform: "instagram",
        access_token: dummyAccessToken,
        refresh_token: dummyRefreshToken,
        expires_at: expiresAt.toISOString(),
        metadata: {
          username: "demo_user",
          connected_at: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (error) {
      console.error("Instagram integration create error:", error);
      return NextResponse.json(
        { error: "Failed to create integration" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, integration: data });
  }
}

// Instagram連携を削除
export async function DELETE() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("integrations")
    .delete()
    .eq("user_id", user.id)
    .eq("platform", "instagram");

  if (error) {
    console.error("Instagram integration delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete integration" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
