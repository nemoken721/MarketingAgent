"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, Loader2, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [validating, setValidating] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // URLからアクセストークンを確認
    const checkToken = async () => {
      const hashParams = new URLSearchParams(
        window.location.hash.substring(1)
      );
      const accessToken = hashParams.get("access_token");
      const type = hashParams.get("type");

      if (type === "recovery" && accessToken) {
        // トークンが有効
        setValidating(false);
      } else {
        // トークンがない場合はエラー
        setError("無効なリセットリンクです。もう一度お試しください。");
        setValidating(false);
      }
    };

    checkToken();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // バリデーション
    if (password.length < 6) {
      setError("パスワードは6文字以上で入力してください");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("パスワードが一致しません");
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setSuccess(true);

      // 3秒後にログインページへリダイレクト
      setTimeout(() => {
        router.push("/auth/login");
      }, 3000);
    } catch (err: any) {
      setError(err.message || "パスワードの更新に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">確認中...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          <div className="bg-card border border-border rounded-lg p-8 shadow-lg">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-2xl font-bold mb-2">
                パスワードを更新しました
              </h1>
              <p className="text-sm text-muted-foreground">
                新しいパスワードでログインできます。
                <br />
                自動的にログインページへ移動します...
              </p>
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
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-2">新しいパスワードを設定</h1>
            <p className="text-sm text-muted-foreground">
              新しいパスワードを入力してください
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
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-2"
              >
                新しいパスワード
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
              <p className="text-xs text-muted-foreground mt-1">
                6文字以上で入力してください
              </p>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium mb-2"
              >
                パスワード（確認）
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
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
                  更新中...
                </>
              ) : (
                "パスワードを更新"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
