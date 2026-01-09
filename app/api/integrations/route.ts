import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ユーザーの連携情報を取得
  const { data: integrations, error } = await supabase
    .from("integrations")
    .select("id, platform, expires_at, created_at")
    .eq("user_id", user.id);

  if (error) {
    console.error("Integrations fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch integrations" },
      { status: 500 }
    );
  }

  // プラットフォームごとの連携状態を整形
  const status = {
    instagram: integrations?.some((i) => i.platform === "instagram") || false,
    x: integrations?.some((i) => i.platform === "x") || false,
    wordpress: integrations?.some((i) => i.platform === "wordpress") || false,
  };

  return NextResponse.json({ integrations, status });
}
