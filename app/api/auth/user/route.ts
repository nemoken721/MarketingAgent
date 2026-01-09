import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  // ユーザープロファイル情報を取得
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("Profile fetch error:", profileError);
  }

  // クレジット残高を取得
  const { data: credits, error: creditsError } = await supabase
    .from("credits")
    .select("balance")
    .eq("user_id", user.id)
    .single();

  if (creditsError) {
    console.error("Credits fetch error:", creditsError);
  }

  return NextResponse.json({
    user: {
      ...user,
      profile,
      credits: credits?.balance || 0,
    },
  });
}
