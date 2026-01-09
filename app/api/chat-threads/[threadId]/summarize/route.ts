import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * スレッド自動要約 API
 * POST /api/chat-threads/[threadId]/summarize
 *
 * スレッドの会話を要約してDBに保存
 * - 20メッセージ以上で呼び出しを推奨
 * - 要約はコスト削減のためシステムプロンプトに注入
 */
export async function POST(
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

    // スレッド取得（権限確認）
    const { data: thread, error: threadError } = await supabase
      .from("chat_threads")
      .select("id, user_id, title, message_count, is_summarized, summary")
      .eq("id", threadId)
      .single();

    if (threadError || !thread) {
      return NextResponse.json(
        { error: "スレッドが見つかりません" },
        { status: 404 }
      );
    }

    if (thread.user_id !== user.id) {
      return NextResponse.json(
        { error: "このスレッドにアクセスする権限がありません" },
        { status: 403 }
      );
    }

    // すでに要約済みで、メッセージ数が大幅に増えていない場合はスキップ
    if (thread.is_summarized && thread.message_count < 40) {
      return NextResponse.json({
        success: true,
        summary: thread.summary,
        skipped: true,
        message: "既に要約済みです",
      });
    }

    // 全メッセージを取得
    const { data: messages, error: messagesError } = await supabase
      .from("chat_messages")
      .select("role, content, created_at")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });

    if (messagesError || !messages || messages.length === 0) {
      return NextResponse.json(
        { error: "メッセージがありません" },
        { status: 400 }
      );
    }

    // Gemini Flash で要約生成（低コスト）
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI APIキーが設定されていません" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    // 会話内容を結合
    const conversationText = messages
      .map((m) => `${m.role === "user" ? "ユーザー" : "AI"}: ${m.content}`)
      .join("\n\n");

    const prompt = `以下の会話を簡潔に要約してください。

要約に含めるべき内容：
1. ユーザーの主な目的や要望
2. 議論された主なトピック
3. 重要な決定事項や結論
4. 次のステップがあれば記載

要約は日本語で、300文字以内にしてください。
箇条書きではなく、自然な文章で記述してください。

会話:
${conversationText}`;

    const result = await model.generateContent(prompt);
    const summary = result.response.text().trim();

    // 要約をDBに保存
    const { error: updateError } = await supabase
      .from("chat_threads")
      .update({
        summary,
        is_summarized: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", threadId);

    if (updateError) {
      console.error("[Summarize API] Update Error:", updateError);
      return NextResponse.json(
        { error: "要約の保存に失敗しました" },
        { status: 500 }
      );
    }

    console.log("[Summarize API] Success:", {
      threadId,
      summaryLength: summary.length,
      messageCount: messages.length,
    });

    return NextResponse.json({
      success: true,
      summary,
      messageCount: messages.length,
    });
  } catch (error: any) {
    console.error("[Summarize API Error]", error);
    return NextResponse.json(
      { error: "エラーが発生しました", details: error.message },
      { status: 500 }
    );
  }
}
