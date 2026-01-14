"use client";

import { useState } from "react";
import { Mail, RefreshCw, LogOut, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * メール確認待ちページ
 * サインアップ後、メール確認までアクセスを制限
 */
export default function VerifyEmailPage() {
  const router = useRouter();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleResendEmail = async () => {
    setResending(true);

    try {
      const response = await fetch("/api/auth/resend-confirmation", {
        method: "POST",
      });

      if (response.ok) {
        setResent(true);
        setTimeout(() => setResent(false), 5000); // 5秒後にメッセージを消す
      } else {
        alert("メールの再送信に失敗しました。");
      }
    } catch (error) {
      console.error("Failed to resend email:", error);
      alert("メールの再送信に失敗しました。");
    } finally {
      setResending(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      // クライアントサイドで直接Supabaseのサインアウトを実行
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Logout error:", error);
        alert("ログアウトに失敗しました: " + error.message);
        return;
      }

      // ログインページにリダイレクト
      window.location.href = "/auth/login";
    } catch (error) {
      console.error("Logout failed:", error);
      alert("ログアウトに失敗しました。");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full bg-card border border-border rounded-lg p-8">
        {/* アイコン */}
        <div className="mb-6 flex justify-center">
          <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center">
            <Mail className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        {/* タイトル */}
        <h1 className="text-2xl font-bold mb-2 text-center">
          メールアドレスを確認してください
        </h1>

        {/* 説明 */}
        <p className="text-muted-foreground text-center mb-6">
          ご登録いただいたメールアドレスに確認メールを送信しました。
          <br />
          メール内のリンクをクリックして、アカウントを有効化してください。
        </p>

        {/* 注意事項 */}
        <div className="bg-muted p-4 rounded-md mb-6">
          <h3 className="text-sm font-semibold mb-2">メールが届かない場合:</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• 迷惑メールフォルダをご確認ください</li>
            <li>• メールアドレスが正しいかご確認ください</li>
            <li>• 数分お待ちいただいてから再送信してください</li>
          </ul>
        </div>

        {/* アクション */}
        <div className="space-y-3">
          {/* 再送信ボタン */}
          <button
            onClick={handleResendEmail}
            disabled={resending || resent}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resending ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                送信中...
              </>
            ) : resent ? (
              <>
                <RefreshCw className="w-4 h-4" />
                送信しました
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                確認メールを再送信
              </>
            )}
          </button>

          {/* ログアウトボタン */}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loggingOut ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                ログアウト中...
              </>
            ) : (
              <>
                <LogOut className="w-4 h-4" />
                ログアウト
              </>
            )}
          </button>
        </div>

        {/* サポート */}
        <p className="text-xs text-muted-foreground text-center mt-6">
          問題が解決しない場合は、
          <a
            href="mailto:support@marty.example.com"
            className="underline hover:text-foreground"
          >
            サポート
          </a>
          までお問い合わせください。
        </p>
      </div>
    </div>
  );
}
