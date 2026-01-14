/**
 * LIFF (LINE Front-end Framework) ユーティリティ
 * LINE連携のコア機能を提供
 */

import liff from "@line/liff";

export type LiffProfile = {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
};

export type LiffContext = {
  type: "utou" | "room" | "group" | "square_chat" | "none" | "external";
  viewType?: "compact" | "tall" | "full" | "frame" | "full-flex";
  userId?: string;
  utouId?: string;
  roomId?: string;
  groupId?: string;
  squareMemberId?: string;
};

/**
 * LIFFを初期化
 */
export async function initializeLiff(liffId: string): Promise<boolean> {
  try {
    await liff.init({ liffId });
    return true;
  } catch (error) {
    console.error("LIFF initialization failed:", error);
    return false;
  }
}

/**
 * LINEアプリ内で実行されているかを判定
 */
export function isInLineClient(): boolean {
  try {
    return liff.isInClient();
  } catch {
    return false;
  }
}

/**
 * ログイン状態を確認
 */
export function isLoggedIn(): boolean {
  try {
    return liff.isLoggedIn();
  } catch {
    return false;
  }
}

/**
 * LINEログインを実行
 */
export function login(redirectUri?: string): void {
  if (!isLoggedIn()) {
    liff.login({ redirectUri });
  }
}

/**
 * ログアウト
 */
export function logout(): void {
  if (isLoggedIn()) {
    liff.logout();
  }
}

/**
 * ユーザープロフィールを取得
 */
export async function getProfile(): Promise<LiffProfile | null> {
  try {
    if (!isLoggedIn()) {
      return null;
    }
    const profile = await liff.getProfile();
    return {
      userId: profile.userId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl,
      statusMessage: profile.statusMessage,
    };
  } catch (error) {
    console.error("Failed to get profile:", error);
    return null;
  }
}

/**
 * アクセストークンを取得
 */
export function getAccessToken(): string | null {
  try {
    return liff.getAccessToken();
  } catch {
    return null;
  }
}

/**
 * IDトークンを取得
 */
export function getIdToken(): string | null {
  try {
    return liff.getIDToken();
  } catch {
    return null;
  }
}

/**
 * LIFFコンテキストを取得（トーク画面の情報等）
 */
export function getLiffContext(): LiffContext | null {
  try {
    const context = liff.getContext();
    if (!context) return null;
    return {
      type: context.type,
      viewType: context.viewType,
      userId: context.userId,
      utouId: context.utouId,
      roomId: context.roomId,
      groupId: context.groupId,
      squareMemberId: context.squareMemberId,
    };
  } catch {
    return null;
  }
}

/**
 * LIFFウィンドウを閉じる
 */
export function closeWindow(): void {
  try {
    if (isInLineClient()) {
      liff.closeWindow();
    }
  } catch (error) {
    console.error("Failed to close window:", error);
  }
}

/**
 * メッセージをLINEトークに送信
 */
export async function sendMessage(message: string): Promise<boolean> {
  try {
    if (!isInLineClient()) {
      console.warn("sendMessage is only available in LINE client");
      return false;
    }
    await liff.sendMessages([
      {
        type: "text",
        text: message,
      },
    ]);
    return true;
  } catch (error) {
    console.error("Failed to send message:", error);
    return false;
  }
}

/**
 * OS情報を取得
 */
export function getOS(): "ios" | "android" | "web" {
  try {
    return liff.getOS() as "ios" | "android" | "web";
  } catch {
    return "web";
  }
}

/**
 * LIFFの準備完了を待機
 */
export async function ready(): Promise<void> {
  try {
    await liff.ready;
  } catch {
    // ignore
  }
}
