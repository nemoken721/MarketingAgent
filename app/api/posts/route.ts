import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// 企画を承認してpostsテーブルに保存
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { plans } = body;

    if (!plans || !Array.isArray(plans)) {
      return NextResponse.json(
        { error: "Invalid plans data" },
        { status: 400 }
      );
    }

    // 複数の企画を一括でpostsテーブルに保存
    const postsToInsert = plans.map((plan: any) => ({
      user_id: user.id,
      platform: plan.platform.toLowerCase(), // Instagram, X → instagram, x
      status: "draft",
      content: plan.content,
      media_url: null,
      media_type: "none",
      scheduled_at: plan.scheduledAt || null,
      metadata: {
        day: plan.day,
        time: plan.time,
        originalPlan: plan,
      },
    }));

    const { data: insertedPosts, error } = await supabase
      .from("posts")
      .insert(postsToInsert)
      .select();

    if (error) {
      console.error("Posts insert error:", error);
      return NextResponse.json(
        { error: "Failed to save posts" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      posts: insertedPosts,
      count: insertedPosts.length,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ユーザーの投稿一覧を取得
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: posts, error } = await supabase
    .from("posts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Posts fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch posts" },
      { status: 500 }
    );
  }

  return NextResponse.json({ posts });
}
