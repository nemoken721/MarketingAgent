import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  ChatThread,
  ChatThreadRow,
  CreateThreadRequest,
  toThread,
} from "@/types/chat";

/**
 * スレッド一覧取得 API
 * GET /api/chat-threads?limit=20&archived=false
 */
export async function GET(request: NextRequest) {
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

    // クエリパラメータ
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "20");
    const archived = searchParams.get("archived") === "true";

    // スレッド一覧取得
    let query = supabase
      .from("chat_threads")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_archived", archived)
      .order("last_message_at", { ascending: false })
      .limit(limit);

    const { data: rows, error } = await query;

    if (error) {
      console.error("[Chat Threads API] DB Error:", error);
      return NextResponse.json(
        { error: "スレッド一覧の取得に失敗しました" },
        { status: 500 }
      );
    }

    // 変換
    const threads: ChatThread[] = (rows as ChatThreadRow[]).map(toThread);

    // 総数取得
    const { count } = await supabase
      .from("chat_threads")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_archived", archived);

    return NextResponse.json({
      threads,
      total: count || 0,
    });
  } catch (error: any) {
    console.error("[Chat Threads API Error]", error);
    return NextResponse.json(
      { error: "エラーが発生しました", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * 新規スレッド作成 API
 * POST /api/chat-threads
 */
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

    // リクエストボディ
    const body: CreateThreadRequest = await request.json().catch(() => ({}));

    // スレッド作成
    const { data: row, error } = await supabase
      .from("chat_threads")
      .insert({
        user_id: user.id,
        canvas_mode: body.canvasMode || "home",
        canvas_context: body.canvasContext || {},
      })
      .select()
      .single();

    if (error) {
      console.error("[Chat Threads API] Insert Error:", error);
      return NextResponse.json(
        { error: "スレッドの作成に失敗しました" },
        { status: 500 }
      );
    }

    const thread = toThread(row as ChatThreadRow);

    return NextResponse.json({ thread }, { status: 201 });
  } catch (error: any) {
    console.error("[Chat Threads API Error]", error);
    return NextResponse.json(
      { error: "エラーが発生しました", details: error.message },
      { status: 500 }
    );
  }
}
