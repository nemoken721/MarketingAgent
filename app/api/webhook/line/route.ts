import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  verifyLineSignature,
  replyMessage,
  getMessageContent,
  getUserProfile,
  createLiffButtonMessage,
  LineWebhookBody,
  LineWebhookEvent,
  LineMessage,
} from "@/lib/line";

// Supabaseクライアント（サービスロール）
const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient(supabaseUrl, supabaseServiceKey);
};

export async function POST(request: NextRequest) {
  try {
    // リクエストボディを取得
    const body = await request.text();
    const signature = request.headers.get("x-line-signature") || "";

    // 署名検証
    if (!verifyLineSignature(body, signature)) {
      console.error("Invalid LINE signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // イベントを解析
    const webhookBody: LineWebhookBody = JSON.parse(body);
    const { events } = webhookBody;

    // 各イベントを処理
    for (const event of events) {
      await handleEvent(event);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("LINE Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Webhook検証用（LINEからのGETリクエスト）
export async function GET() {
  return NextResponse.json({ status: "ok" });
}

/**
 * イベントハンドラー
 */
async function handleEvent(event: LineWebhookEvent): Promise<void> {
  const userId = event.source.userId;

  if (!userId) {
    console.log("No userId in event");
    return;
  }

  switch (event.type) {
    case "follow":
      await handleFollow(event, userId);
      break;
    case "unfollow":
      await handleUnfollow(userId);
      break;
    case "message":
      await handleMessage(event, userId);
      break;
    case "postback":
      await handlePostback(event, userId);
      break;
    default:
      console.log("Unknown event type:", event.type);
  }
}

/**
 * 友だち追加時の処理
 */
async function handleFollow(
  event: LineWebhookEvent,
  userId: string
): Promise<void> {
  const supabase = getSupabaseAdmin();

  // ユーザープロフィールを取得
  const profile = await getUserProfile(userId);

  // DBにユーザーを登録/更新
  const { error } = await supabase.from("users").upsert(
    {
      line_user_id: userId,
      line_display_name: profile?.displayName || null,
      email_confirmed: true, // LINE経由は確認不要
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "line_user_id",
    }
  );

  if (error) {
    console.error("Failed to create user:", error);
  }

  // 挨拶メッセージを送信
  if (event.replyToken) {
    const messages: LineMessage[] = [
      {
        type: "text",
        text: `採用ありがとうございます！AI社員のMartyです🎉\n\nまずは商品の写真を1枚送ってください！\nインスタ投稿用のクリエイティブを作成します📸`,
      },
    ];

    await replyMessage(event.replyToken, messages);
  }
}

/**
 * ブロック時の処理
 */
async function handleUnfollow(userId: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  // ユーザーのLINE連携を解除（削除はしない）
  await supabase
    .from("users")
    .update({ line_user_id: null, line_display_name: null })
    .eq("line_user_id", userId);
}

/**
 * メッセージ受信時の処理
 */
async function handleMessage(
  event: LineWebhookEvent,
  userId: string
): Promise<void> {
  const message = event.message;
  if (!message) return;

  switch (message.type) {
    case "image":
    case "video":
      await handleMediaMessage(event, userId, message.id);
      break;
    case "text":
      await handleTextMessage(event, userId, message.text || "");
      break;
    default:
      // その他のメッセージタイプはLIFFへ誘導
      if (event.replyToken) {
        await replyMessage(event.replyToken, [
          createLiffButtonMessage(
            "制作ルームで詳しくお伺いしますね！",
            "制作ルームを開く",
            "create"
          ),
        ]);
      }
  }
}

/**
 * 画像・動画メッセージの処理
 */
async function handleMediaMessage(
  event: LineWebhookEvent,
  userId: string,
  messageId: string
): Promise<void> {
  const supabase = getSupabaseAdmin();

  try {
    // LINEから画像データを取得
    const contentBuffer = await getMessageContent(messageId);
    if (!contentBuffer) {
      throw new Error("Failed to get content from LINE");
    }

    // ユーザーを取得または作成
    let { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("line_user_id", userId)
      .single();

    if (!user) {
      // ユーザーが存在しない場合は作成
      const profile = await getUserProfile(userId);
      const { data: newUser, error } = await supabase
        .from("users")
        .insert({
          line_user_id: userId,
          line_display_name: profile?.displayName || null,
          line_picture_url: profile?.pictureUrl || null,
          email_confirmed: true,
        })
        .select("id")
        .single();

      if (error) throw error;
      user = newUser;
    }

    // Supabase Storageに保存
    const fileName = `line-uploads/${userId}/${messageId}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("uploads")
      .upload(fileName, contentBuffer, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      throw uploadError;
    }

    // 公開URLを取得
    const { data: urlData } = supabase.storage
      .from("uploads")
      .getPublicUrl(fileName);

    const imageUrl = urlData.publicUrl;

    // アクティブなセッションを取得または作成
    let { data: session } = await supabase
      .from("line_sessions")
      .select("id")
      .eq("line_user_id", userId)
      .eq("status", "active")
      .single();

    if (!session) {
      const { data: newSession, error: sessionError } = await supabase
        .from("line_sessions")
        .insert({
          user_id: user.id,
          line_user_id: userId,
          status: "active",
          context: {},
          last_activity_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (sessionError) throw sessionError;
      session = newSession;
    } else {
      // セッションのアクティビティを更新
      await supabase
        .from("line_sessions")
        .update({ last_activity_at: new Date().toISOString() })
        .eq("id", session.id);
    }

    // line_uploaded_imagesテーブルに画像を記録
    await supabase.from("line_uploaded_images").insert({
      user_id: user.id,
      session_id: session.id,
      message_id: messageId,
      file_path: imageUrl,
      content_type: "image/jpeg",
      file_size: contentBuffer.length,
      status: "completed",
    });

    // 応答メッセージを送信
    if (event.replyToken) {
      await replyMessage(event.replyToken, [
        {
          type: "text",
          text: "画像を受け取りました！📸",
        },
        createLiffButtonMessage(
          "制作ルームを開いて投稿を作成しましょう👇",
          "制作ルームを開く",
          "create"
        ),
      ]);
    }
  } catch (error) {
    console.error("Failed to handle media message:", error);

    // エラー時も応答
    if (event.replyToken) {
      await replyMessage(event.replyToken, [
        {
          type: "text",
          text: "申し訳ありません、画像の処理中にエラーが発生しました。もう一度お試しください。",
        },
      ]);
    }
  }
}

/**
 * テキストメッセージの処理
 */
async function handleTextMessage(
  event: LineWebhookEvent,
  userId: string,
  text: string
): Promise<void> {
  // テキストは基本的にLIFFへ誘導
  if (event.replyToken) {
    // 特定のキーワードに反応
    const lowerText = text.toLowerCase();

    if (
      lowerText.includes("作って") ||
      lowerText.includes("投稿") ||
      lowerText.includes("作成")
    ) {
      await replyMessage(event.replyToken, [
        createLiffButtonMessage(
          "制作ルームで詳しくお伺いしますね！こちらへどうぞ👇",
          "制作ルームを開く",
          "create"
        ),
      ]);
    } else if (
      lowerText.includes("分析") ||
      lowerText.includes("診断") ||
      lowerText.includes("レポート")
    ) {
      await replyMessage(event.replyToken, [
        createLiffButtonMessage(
          "アカウント分析画面を開きます👇",
          "分析を見る",
          "analytics"
        ),
      ]);
    } else if (
      lowerText.includes("設定") ||
      lowerText.includes("プラン") ||
      lowerText.includes("変更")
    ) {
      await replyMessage(event.replyToken, [
        createLiffButtonMessage("設定画面を開きます👇", "設定を開く", "settings"),
      ]);
    } else if (
      lowerText.includes("ヘルプ") ||
      lowerText.includes("使い方") ||
      lowerText.includes("help")
    ) {
      await replyMessage(event.replyToken, [
        {
          type: "text",
          text: `Martyの使い方をご説明します！\n\n📸 **投稿を作成**\n商品の写真を送ってください。AIがインスタ投稿用のクリエイティブを作成します。\n\n📊 **分析を見る**\n「分析」と送信すると、アカウント診断画面を開けます。\n\n⚙️ **設定**\n「設定」と送信すると、プロフィールやプランの変更ができます。`,
        },
      ]);
    } else {
      // デフォルト応答
      await replyMessage(event.replyToken, [
        {
          type: "text",
          text: "メッセージありがとうございます！\n\n投稿を作成するには、商品の写真を送ってくださいね📸",
        },
        createLiffButtonMessage(
          "または、制作ルームで直接作成することもできます👇",
          "制作ルームを開く",
          "create"
        ),
      ]);
    }
  }
}

/**
 * Postback処理
 */
async function handlePostback(
  event: LineWebhookEvent,
  userId: string
): Promise<void> {
  const data = event.postback?.data;
  if (!data || !event.replyToken) return;

  // Postbackデータに応じた処理
  const params = new URLSearchParams(data);
  const action = params.get("action");

  switch (action) {
    case "open_liff":
      const path = params.get("path") || "";
      await replyMessage(event.replyToken, [
        createLiffButtonMessage("こちらからどうぞ👇", "開く", path),
      ]);
      break;
    default:
      console.log("Unknown postback action:", action);
  }
}
