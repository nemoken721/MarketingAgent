import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * RAG検索 API
 * POST /api/chat-threads/search
 *
 * クエリテキストで関連メッセージ・スレッドをベクトル検索
 * pgvectorを使用した類似度検索
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { query, limit = 10 } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "検索クエリが必要です" },
        { status: 400 }
      );
    }

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // クエリのembeddingを生成
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI APIキーが設定されていません" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const embeddingModel = genAI.getGenerativeModel({
      model: "text-embedding-004",
    });

    const embeddingResult = await embeddingModel.embedContent(query);
    const queryEmbedding = embeddingResult.embedding.values;

    // pgvectorによるベクトル類似度検索
    // RPC関数を呼び出す（Supabaseで事前に定義が必要）
    const { data: searchResults, error: searchError } = await supabase.rpc(
      "search_messages_by_embedding",
      {
        query_embedding: queryEmbedding,
        match_threshold: 0.7, // 類似度閾値
        match_count: limit,
        user_id_filter: user.id,
      }
    );

    if (searchError) {
      console.error("[Search API] Search Error:", searchError);

      // RPC関数が存在しない場合のフォールバック：テキスト検索
      console.log("[Search API] Falling back to text search...");

      const { data: textSearchResults, error: textSearchError } = await supabase
        .from("chat_messages")
        .select(`
          id,
          content,
          role,
          created_at,
          thread_id,
          chat_threads!inner (
            id,
            title,
            user_id
          )
        `)
        .eq("chat_threads.user_id", user.id)
        .ilike("content", `%${query}%`)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (textSearchError) {
        console.error("[Search API] Text Search Error:", textSearchError);
        return NextResponse.json(
          { error: "検索に失敗しました", details: textSearchError.message },
          { status: 500 }
        );
      }

      // テキスト検索結果を整形
      const formattedResults = (textSearchResults || []).map((msg: any) => ({
        messageId: msg.id,
        threadId: msg.thread_id,
        threadTitle: msg.chat_threads?.title || "無題",
        content: msg.content,
        role: msg.role,
        createdAt: msg.created_at,
        similarity: null, // テキスト検索では類似度なし
      }));

      return NextResponse.json({
        success: true,
        results: formattedResults,
        searchType: "text",
        query,
      });
    }

    // ベクトル検索結果を整形
    const formattedResults = (searchResults || []).map((result: any) => ({
      messageId: result.message_id,
      threadId: result.thread_id,
      threadTitle: result.thread_title,
      content: result.content,
      role: result.role,
      createdAt: result.created_at,
      similarity: result.similarity,
    }));

    console.log("[Search API] Success:", {
      query,
      resultCount: formattedResults.length,
      searchType: "vector",
    });

    return NextResponse.json({
      success: true,
      results: formattedResults,
      searchType: "vector",
      query,
    });
  } catch (error: any) {
    console.error("[Search API Error]", error);
    return NextResponse.json(
      { error: "エラーが発生しました", details: error.message },
      { status: 500 }
    );
  }
}
