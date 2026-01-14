import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  ChatThread,
  ChatMessage,
  ChatThreadRow,
  ChatMessageRow,
  UpdateThreadRequest,
  toThread,
  toMessage,
} from "@/types/chat";

/**
 * スレッド詳細取得 API
 * GET /api/chat-threads/[threadId]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const supabase = await createClient();
    const { threadId } = await params;

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // スレッド取得
    const { data: threadRow, error: threadError } = await supabase
      .from("chat_threads")
      .select("*")
      .eq("id", threadId)
      .single();

    if (threadError || !threadRow) {
      return NextResponse.json(
        { error: "スレッドが見つかりません" },
        { status: 404 }
      );
    }

    // 権限チェック
    if (threadRow.user_id !== user.id) {
      return NextResponse.json(
        { error: "このスレッドにアクセスする権限がありません" },
        { status: 403 }
      );
    }

    // メッセージ取得
    const { data: messageRows, error: messagesError } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });

    if (messagesError) {
      console.error("[Thread Detail API] Messages Error:", messagesError);
    }

    const thread = toThread(threadRow as ChatThreadRow);
    const messages: ChatMessage[] = (messageRows || []).map((row: ChatMessageRow) =>
      toMessage(row)
    );

    return NextResponse.json({ thread, messages });
  } catch (error: any) {
    console.error("[Thread Detail API Error]", error);
    return NextResponse.json(
      { error: "エラーが発生しました", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * スレッド更新 API
 * PATCH /api/chat-threads/[threadId]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const supabase = await createClient();
    const { threadId } = await params;

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // リクエストボディ
    const body: UpdateThreadRequest = await request.json();

    // 更新データ構築
    const updateData: Record<string, any> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.isArchived !== undefined) updateData.is_archived = body.isArchived;
    if (body.canvasMode !== undefined) updateData.canvas_mode = body.canvasMode;
    if (body.canvasContext !== undefined) updateData.canvas_context = body.canvasContext;

    // スレッド更新
    const { data: threadRow, error } = await supabase
      .from("chat_threads")
      .update(updateData)
      .eq("id", threadId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("[Thread Update API] Error:", error);
      return NextResponse.json(
        { error: "スレッドの更新に失敗しました" },
        { status: 500 }
      );
    }

    if (!threadRow) {
      return NextResponse.json(
        { error: "スレッドが見つかりません" },
        { status: 404 }
      );
    }

    const thread = toThread(threadRow as ChatThreadRow);

    return NextResponse.json({ thread });
  } catch (error: any) {
    console.error("[Thread Update API Error]", error);
    return NextResponse.json(
      { error: "エラーが発生しました", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * スレッド削除 API
 * DELETE /api/chat-threads/[threadId]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const supabase = await createClient();
    const { threadId } = await params;

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // スレッド削除（RLSで自分のスレッドのみ削除可能）
    const { error } = await supabase
      .from("chat_threads")
      .delete()
      .eq("id", threadId)
      .eq("user_id", user.id);

    if (error) {
      console.error("[Thread Delete API] Error:", error);
      return NextResponse.json(
        { error: "スレッドの削除に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Thread Delete API Error]", error);
    return NextResponse.json(
      { error: "エラーが発生しました", details: error.message },
      { status: 500 }
    );
  }
}
