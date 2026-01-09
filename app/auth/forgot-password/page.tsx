"use client";

import { useState } from "react";
import { Mail, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "エラーが発生しました");
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          <div className="bg-card border border-border rounded-lg p-8 shadow-lg">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-2xl font-bold mb-2">メールを送信しました</h1>
              <p className="text-sm text-muted-foreground">
                パスワードリセット用のリンクを{email}に送信しました。
                <br />
                メールをご確認の上、リンクをクリックしてパスワードを再設定してください。
              </p>
            </div>

            <div className="text-center">
              <Link
                href="/auth/login"
                className="text-sm text-primary hover:underline"
              >
                ログインページに戻る
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-lg p-8 shadow-lg">
          {/* Header */}
          <div className="mb-6">
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              ログインに戻る
            </Link>
            <h1 className="text-2xl font-bold mb-2">
              パスワードをお忘れですか？
            </h1>
            <p className="text-sm text-muted-foreground">
              登録したメールアドレスを入力してください。パスワードリセット用のリンクをお送りします。
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive rounded-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                メールアドレス
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full pl-10 pr-4 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  送信中...
                </>
              ) : (
                "リセットリンクを送信"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
