import { NextRequest, NextResponse } from "next/server";
import { Client } from "ssh2";
import { createClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/encryption";

/**
 * サーバー認証情報保存API
 * POST /api/websites/save-credentials
 *
 * SSH接続テストを実行し、成功した場合のみ暗号化して保存
 */

interface SaveCredentialsRequest {
  websiteId: string;
  host: string;
  user: string;
  password?: string;
  privateKey?: string;
  port: number;
  authMethod: "password" | "privateKey";
}

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

    // リクエストボディを取得
    const body: SaveCredentialsRequest = await request.json();
    const { websiteId, host, user: sshUser, password, privateKey, port = 22, authMethod = "password" } = body;

    // バリデーション
    if (!websiteId || !host || !sshUser) {
      return NextResponse.json(
        { error: "必須項目（WebsiteID、ホスト名、ユーザー名）が不足しています" },
        { status: 400 }
      );
    }

    if (authMethod === "password" && !password) {
      return NextResponse.json(
        { error: "パスワードを入力してください" },
        { status: 400 }
      );
    }

    if (authMethod === "privateKey" && !privateKey) {
      return NextResponse.json(
        { error: "秘密鍵を入力してください" },
        { status: 400 }
      );
    }

    // Websiteがユーザーに属しているか確認
    const { data: website, error: websiteError } = await supabase
      .from("websites")
      .select("id, user_id")
      .eq("id", websiteId)
      .single();

    if (websiteError || !website || website.user_id !== user.id) {
      return NextResponse.json(
        { error: "Websiteが見つかりません" },
        { status: 404 }
      );
    }

    // SSH接続テストを実行
    console.log(`[SSH Test] Connecting to ${host}:${port} as ${sshUser} (${authMethod})`);
    const testResult = await testSSHConnection(host, port, sshUser, authMethod, password, privateKey);

    if (!testResult.success) {
      console.error(`[SSH Test Failed]`, testResult.error);
      return NextResponse.json(
        {
          error: "SSH接続テストに失敗しました",
          details: testResult.error,
        },
        { status: 400 }
      );
    }

    console.log(`[SSH Test Success] Connected to ${host}`);

    // 認証情報を暗号化
    const encryptedCredential = authMethod === "password"
      ? encrypt(password!)
      : encrypt(privateKey!);

    // データベースに保存
    const { error: updateError } = await supabase
      .from("websites")
      .update({
        server_host: host,
        server_user: sshUser,
        server_pass_encrypted: authMethod === "password" ? encryptedCredential : null,
        server_key_encrypted: authMethod === "privateKey" ? encryptedCredential : null,
        server_port: port,
        server_auth_method: authMethod,
        current_step: 3, // ステップ3（お店の建設）に進む
        status: "building",
        updated_at: new Date().toISOString(),
      })
      .eq("id", websiteId);

    if (updateError) {
      console.error("[Database Update Error]", updateError);
      return NextResponse.json(
        { error: "データベースの更新に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "サーバー接続情報を保存しました",
      currentStep: 3,
    });
  } catch (error: any) {
    console.error("[Save Credentials Error]", error);
    return NextResponse.json(
      { error: "エラーが発生しました", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * SSH接続テストを実行
 * @param host SSHホスト名
 * @param port SSHポート
 * @param username SSHユーザー名
 * @param authMethod 認証方式
 * @param password SSHパスワード（パスワード認証時）
 * @param privateKey SSH秘密鍵（鍵認証時）
 * @returns 接続結果
 */
function testSSHConnection(
  host: string,
  port: number,
  username: string,
  authMethod: "password" | "privateKey",
  password?: string,
  privateKey?: string
): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const conn = new Client();
    let isResolved = false;

    // タイムアウト設定（30秒）
    const timeout = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        conn.end();
        resolve({
          success: false,
          error: "接続がタイムアウトしました（30秒）",
        });
      }
    }, 30000);

    conn
      .on("ready", () => {
        clearTimeout(timeout);
        if (!isResolved) {
          isResolved = true;
          conn.end();
          resolve({ success: true });
        }
      })
      .on("error", (err: Error) => {
        clearTimeout(timeout);
        if (!isResolved) {
          isResolved = true;
          conn.end();

          // エラーメッセージを分かりやすく変換
          let errorMessage = err.message;
          if (errorMessage.includes("ENOTFOUND")) {
            errorMessage = "ホスト名が見つかりません。SSHホスト名を確認してください。";
          } else if (errorMessage.includes("ECONNREFUSED")) {
            errorMessage = "接続が拒否されました。ポート番号を確認してください。";
          } else if (errorMessage.includes("ETIMEDOUT")) {
            errorMessage = "接続がタイムアウトしました。ホスト名とポート番号を確認してください。";
          } else if (errorMessage.includes("Authentication")) {
            errorMessage = authMethod === "privateKey"
              ? "認証に失敗しました。秘密鍵の内容を確認してください。"
              : "認証に失敗しました。ユーザー名とパスワードを確認してください。";
          } else if (errorMessage.includes("Cannot parse privateKey") || errorMessage.includes("Unsupported key format")) {
            errorMessage = "秘密鍵の形式が正しくありません。ダウンロードした.keyファイルをメモ帳で開き、「-----BEGIN」から「-----END」まで全てをコピーして貼り付けてください。";
          }

          resolve({
            success: false,
            error: errorMessage,
          });
        }
      })
      .on("timeout", () => {
        clearTimeout(timeout);
        if (!isResolved) {
          isResolved = true;
          conn.end();
          resolve({
            success: false,
            error: "接続がタイムアウトしました",
          });
        }
      })
      .connect({
        host,
        port,
        username,
        ...(authMethod === "password"
          ? { password }
          : { privateKey }),
        readyTimeout: 30000,
      });
  });
}
