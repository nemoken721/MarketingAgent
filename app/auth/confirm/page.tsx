"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Check, AlertCircle, Loader2 } from "lucide-react";

/**
 * メール確認ページ（内部コンポーネント）
 * Supabase Auth のメール確認トークンを処理
 */
function ConfirmContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const confirmEmail = async () => {
      const token = searchParams.get("token");
      const type = searchParams.get("type");
      const redirectTo = searchParams.get("redirect_to") || "/";

      if (!token || !type) {
        setStatus("error");
        setMessage("無効な確認リンクです。");
        return;
      }

      try {
        // Supabase Auth の確認APIを呼び出し
        const response = await fetch("/api/auth/confirm", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token, type }),
        });

        if (!response.ok) {
          throw new Error("メール確認に失敗しました。");
        }

        setStatus("success");
        setMessage("メールアドレスが確認されました。");

        // 3秒後にリダイレクト
        setTimeout(() => {
          router.push(redirectTo);
        }, 3000);
      } catch (error) {
        console.error("Email confirmation error:", error);
        setStatus("error");
        setMessage("メール確認に失敗しました。もう一度お試しください。");
      }
    };

    confirmEmail();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full bg-card border border-border rounded-lg p-8 text-center">
        {/* アイコン */}
        <div className="mb-6 flex justify-center">
          {status === "loading" && (
            <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          )}
          {status === "success" && (
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
              <Check className="w-8 h-8 text-green-500" />
            </div>
          )}
          {status === "error" && (
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          )}
        </div>

        {/* タイトル */}
        <h1 className="text-2xl font-bold mb-2">
          {status === "loading" && "確認中..."}
          {status === "success" && "確認完了"}
          {status === "error" && "エラー"}
        </h1>

        {/* メッセージ */}
        <p className="text-muted-foreground mb-6">{message}</p>

        {/* 成功時の追加メッセージ */}
        {status === "success" && (
          <p className="text-sm text-muted-foreground">
            まもなくリダイレクトされます...
          </p>
        )}

        {/* エラー時のアクション */}
        {status === "error" && (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push("/auth/login")}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              ログインページへ
            </button>
            <a
              href="mailto:support@marty.example.com"
              className="text-sm text-muted-foreground underline"
            >
              サポートに連絡
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * メール確認ページ
 * Suspenseでラップしてクライアントサイドレンダリングに対応
 */
export default function ConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full bg-card border border-border rounded-lg p-8 text-center">
            <div className="mb-6 flex justify-center">
              <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            </div>
            <h1 className="text-2xl font-bold mb-2">読み込み中...</h1>
          </div>
        </div>
      }
    >
      <ConfirmContent />
    </Suspense>
  );
}
