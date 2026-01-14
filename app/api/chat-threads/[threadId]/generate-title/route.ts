import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * タイトル自動生成 API
 * POST /api/chat-threads/[threadId]/generate-title
 *
 * 最初の数メッセージからAIでタイトルを生成
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
      .select("id, user_id, title")
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

    // 最初の5メッセージを取得
    const { data: messages, error: messagesError } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .limit(5);

    if (messagesError || !messages || messages.length === 0) {
      return NextResponse.json(
        { error: "メッセージがありません" },
        { status: 400 }
      );
    }

    // メッセージ内容を結合
    const conversationSummary = messages
      .map((m: { role: string; content: string }) => `${m.role === "user" ? "ユーザー" : "AI"}: ${m.content}`)
      .join("\n");

    // Gemini Flash でタイトル生成
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI APIキーが設定されていません" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const prompt = `以下の会話の内容を表す簡潔なタイトルを生成してください。
タイトルは日本語で、15文字以内にしてください。
記号や絵文字は使わないでください。
タイトルのみを出力してください。

会話:
${conversationSummary}`;

    const result = await model.generateContent(prompt);
    const title = result.response.text().trim().slice(0, 30);

    // タイトルを更新
    const { error: updateError } = await supabase
      .from("chat_threads")
      .update({ title })
      .eq("id", threadId);

    if (updateError) {
      console.error("[Generate Title API] Update Error:", updateError);
      return NextResponse.json(
        { error: "タイトルの更新に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ title });
  } catch (error: any) {
    console.error("[Generate Title API Error]", error);
    return NextResponse.json(
      { error: "エラーが発生しました", details: error.message },
      { status: 500 }
    );
  }
}
