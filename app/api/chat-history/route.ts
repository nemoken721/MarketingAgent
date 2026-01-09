import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * チャット履歴保存 API
 * POST /api/chat-history
 *
 * threadId を指定すると、スレッドに紐づけてメッセージを保存
 * スレッドの preview と last_message_at も自動更新（トリガー）
 *
 * generateEmbedding: true を指定すると、RAG検索用のembeddingを生成
 */
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
    const { threadId, sessionId, role, content, toolCalls, metadata, generateEmbedding } = body;

    // threadId がある場合は権限チェック
    if (threadId) {
      const { data: thread, error: threadError } = await supabase
        .from("chat_threads")
        .select("id, user_id")
        .eq("id", threadId)
        .single();

      if (threadError || !thread) {
        return NextResponse.json(
          { error: "Thread not found" },
          { status: 404 }
        );
      }

      if (thread.user_id !== user.id) {
        return NextResponse.json(
          { error: "Access denied to this thread" },
          { status: 403 }
        );
      }
    }

    // embedding生成（オプション）
    let embedding: number[] | null = null;
    if (generateEmbedding && content && content.length > 10) {
      try {
        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        if (apiKey) {
          const genAI = new GoogleGenerativeAI(apiKey);
          const embeddingModel = genAI.getGenerativeModel({
            model: "text-embedding-004",
          });
          const embeddingResult = await embeddingModel.embedContent(content);
          embedding = embeddingResult.embedding.values;
        }
      } catch (embeddingError) {
        // embedding生成失敗してもメッセージ保存は続行
        console.warn("Embedding generation failed:", embeddingError);
      }
    }

    // メッセージ保存
    const insertData: any = {
      user_id: user.id,
      thread_id: threadId || null,
      session_id: sessionId || threadId || crypto.randomUUID(),
      role,
      content,
      tool_calls: toolCalls || [],
      metadata: metadata || {},
    };

    // embeddingがある場合は追加（pgvectorフォーマット）
    if (embedding) {
      insertData.embedding = `[${embedding.join(",")}]`;
    }

    const { data, error } = await supabase
      .from("chat_messages")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Chat message save error:", error);
      return NextResponse.json(
        { error: "Failed to save message" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: data,
      hasEmbedding: !!embedding,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * チャット履歴取得 API
 * GET /api/chat-history?threadId=xxx&sessionId=xxx&limit=50
 *
 * threadId を優先、なければ sessionId でフィルタ
 */
export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const threadId = searchParams.get("threadId");
  const sessionId = searchParams.get("sessionId");
  const limit = parseInt(searchParams.get("limit") || "50");

  let query = supabase
    .from("chat_messages")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(limit);

  // threadId を優先
  if (threadId) {
    query = query.eq("thread_id", threadId);
  } else if (sessionId) {
    query = query.eq("session_id", sessionId);
  }

  const { data: messages, error } = await query;

  if (error) {
    console.error("Chat history fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat history" },
      { status: 500 }
    );
  }

  return NextResponse.json({ messages });
}
