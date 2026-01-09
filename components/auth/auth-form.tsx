"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Mail, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AuthFormProps {
  mode: "login" | "signup";
}

export default function AuthForm({ mode }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === "signup") {
        // 利用規約への同意チェック
        if (!agreedToTerms) {
          setError("利用規約とプライバシーポリシーに同意してください");
          setLoading(false);
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) throw error;

        if (data.user) {
          // サインアップ成功
          toast.success(
            "確認メールを送信しました。メールのリンクをクリックして登録を完了してください。"
          );
          router.push("/auth/login");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.user) {
          // ログイン成功
          toast.success("ログインしました");
          router.push("/");
          router.refresh();
        }
      }
    } catch (err: any) {
      setError(err.message || "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-card border border-border rounded-lg p-8 shadow-lg">
        {/* ロゴとタイトル */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Marty</h1>
          <p className="text-muted-foreground">
            {mode === "signup"
              ? "アカウントを作成"
              : "アカウントにログイン"}
          </p>
        </div>

        {/* エラーメッセージ */}
        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive rounded-md">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* フォーム */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* メールアドレス */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium mb-2"
            >
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

          {/* パスワード */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium mb-2"
            >
              パスワード
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full pl-10 pr-4 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {mode === "signup" ? (
              <p className="text-xs text-muted-foreground mt-1">
                6文字以上で入力してください
              </p>
            ) : (
              <div className="text-right">
                <a
                  href="/auth/forgot-password"
                  className="text-xs text-primary hover:underline"
                >
                  パスワードをお忘れですか？
                </a>
              </div>
            )}
          </div>

          {/* 利用規約への同意チェックボックス（サインアップ時のみ） */}
          {mode === "signup" && (
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="terms"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-input"
              />
              <label htmlFor="terms" className="text-sm text-muted-foreground">
                <a
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  利用規約
                </a>
                および
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  プライバシーポリシー
                </a>
                に同意します
              </label>
            </div>
          )}

          {/* 送信ボタン */}
          <button
            type="submit"
            disabled={loading || (mode === "signup" && !agreedToTerms)}
            className="w-full py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                処理中...
              </>
            ) : mode === "signup" ? (
              "アカウントを作成"
            ) : (
              "ログイン"
            )}
          </button>
        </form>

        {/* フッターリンク */}
        <div className="mt-6 text-center text-sm">
          {mode === "signup" ? (
            <p className="text-muted-foreground">
              すでにアカウントをお持ちですか？{" "}
              <a
                href="/auth/login"
                className="text-primary hover:underline font-medium"
              >
                ログイン
              </a>
            </p>
          ) : (
            <p className="text-muted-foreground">
              アカウントをお持ちでないですか？{" "}
              <a
                href="/auth/signup"
                className="text-primary hover:underline font-medium"
              >
                新規登録
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
