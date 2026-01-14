import crypto from "crypto";

// LINE環境変数を遅延取得
const getLineConfig = () => ({
  channelSecret: process.env.LINE_CHANNEL_SECRET || "",
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "",
});

/**
 * LINE Webhookの署名を検証
 */
export function verifyLineSignature(
  body: string,
  signature: string
): boolean {
  const { channelSecret } = getLineConfig();
  if (!channelSecret) {
    console.error("LINE_CHANNEL_SECRET is not set");
    return false;
  }

  const hash = crypto
    .createHmac("SHA256", channelSecret)
    .update(body)
    .digest("base64");

  return hash === signature;
}

/**
 * LINE Reply APIでメッセージを送信
 */
export async function replyMessage(
  replyToken: string,
  messages: LineMessage[]
): Promise<boolean> {
  const { channelAccessToken } = getLineConfig();
  if (!channelAccessToken) {
    console.error("LINE_CHANNEL_ACCESS_TOKEN is not set");
    return false;
  }

  try {
    const response = await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${channelAccessToken}`,
      },
      body: JSON.stringify({
        replyToken,
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("LINE Reply API error:", errorText);
      return false;
    }

    return true;
  } catch (error) {
    console.error("LINE Reply API error:", error);
    return false;
  }
}

/**
 * LINE Push APIでメッセージを送信（通知用）
 */
export async function pushMessage(
  userId: string,
  messages: LineMessage[]
): Promise<boolean> {
  const { channelAccessToken } = getLineConfig();
  if (!channelAccessToken) {
    console.error("LINE_CHANNEL_ACCESS_TOKEN is not set");
    return false;
  }

  try {
    const response = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${channelAccessToken}`,
      },
      body: JSON.stringify({
        to: userId,
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("LINE Push API error:", errorText);
      return false;
    }

    return true;
  } catch (error) {
    console.error("LINE Push API error:", error);
    return false;
  }
}

/**
 * LINE Content APIから画像データを取得
 */
export async function getMessageContent(messageId: string): Promise<Buffer | null> {
  const { channelAccessToken } = getLineConfig();
  if (!channelAccessToken) {
    console.error("LINE_CHANNEL_ACCESS_TOKEN is not set");
    return null;
  }

  try {
    const response = await fetch(
      `https://api-data.line.me/v2/bot/message/${messageId}/content`,
      {
        headers: {
          Authorization: `Bearer ${channelAccessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error("LINE Content API error:", response.status);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error("LINE Content API error:", error);
    return null;
  }
}

/**
 * ユーザープロフィールを取得
 */
export async function getUserProfile(userId: string): Promise<LineProfile | null> {
  const { channelAccessToken } = getLineConfig();
  if (!channelAccessToken) {
    console.error("LINE_CHANNEL_ACCESS_TOKEN is not set");
    return null;
  }

  try {
    const response = await fetch(
      `https://api.line.me/v2/bot/profile/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${channelAccessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error("LINE Profile API error:", response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("LINE Profile API error:", error);
    return null;
  }
}

// 型定義
export interface LineMessage {
  type: "text" | "image" | "template" | "flex";
  text?: string;
  originalContentUrl?: string;
  previewImageUrl?: string;
  template?: LineTemplate;
  altText?: string;
  contents?: Record<string, unknown>;
}

export interface LineTemplate {
  type: "buttons" | "confirm" | "carousel";
  text?: string;
  actions?: LineAction[];
  columns?: LineColumn[];
}

export interface LineAction {
  type: "uri" | "message" | "postback";
  label: string;
  uri?: string;
  text?: string;
  data?: string;
}

export interface LineColumn {
  text: string;
  actions: LineAction[];
}

export interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

export interface LineWebhookEvent {
  type: "message" | "follow" | "unfollow" | "postback";
  replyToken?: string;
  source: {
    type: "user" | "group" | "room";
    userId?: string;
    groupId?: string;
    roomId?: string;
  };
  timestamp: number;
  message?: {
    id: string;
    type: "text" | "image" | "video" | "audio" | "file" | "sticker";
    text?: string;
  };
  postback?: {
    data: string;
  };
}

export interface LineWebhookBody {
  destination: string;
  events: LineWebhookEvent[];
}

/**
 * LIFFを開くボタン付きメッセージを作成
 */
export function createLiffButtonMessage(
  text: string,
  buttonLabel: string,
  liffPath: string = ""
): LineMessage {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID || "";
  const liffUrl = liffPath
    ? `https://liff.line.me/${liffId}/${liffPath}`
    : `https://liff.line.me/${liffId}`;

  return {
    type: "template",
    altText: text,
    template: {
      type: "buttons",
      text: text,
      actions: [
        {
          type: "uri",
          label: buttonLabel,
          uri: liffUrl,
        },
      ],
    },
  };
}
