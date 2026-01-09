"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, CreditCard, AlertTriangle, Mail, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; credits: number } | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await fetch("/api/auth/user");
      if (response.ok) {
        const data = await response.json();
        setUser({
          email: data.user?.email || "",
          credits: data.user?.credits || 0,
        });
      } else {
        router.push("/auth/login");
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
      router.push("/auth/login");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "削除") {
      toast.error("「削除」と入力してください");
      return;
    }

    if (
      !confirm(
        "本当にアカウントを削除しますか？この操作は取り消せません。すべてのデータが完全に削除されます。"
      )
    ) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch("/api/auth/delete-account", {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("アカウントが削除されました");
        router.push("/auth/signup");
      } else {
        const data = await response.json();
        toast.error(data.error || "アカウントの削除に失敗しました");
      }
    } catch (error) {
      console.error("Failed to delete account:", error);
      toast.error("アカウントの削除中にエラーが発生しました");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-8" />
          <div className="space-y-6">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            ダッシュボードに戻る
          </Link>
          <h1 className="text-3xl font-bold">設定</h1>
        </div>

        {/* Profile Section */}
        <section className="bg-card border border-border rounded-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold">プロフィール</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                メールアドレス
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="flex-1 px-3 py-2 border border-input rounded-md bg-muted text-muted-foreground"
                />
                <Mail className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                メールアドレスは変更できません
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                パスワード
              </label>
              <Link
                href="/auth/reset-password"
                className="inline-block px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
              >
                パスワードを変更
              </Link>
            </div>
          </div>
        </section>

        {/* Billing Section */}
        <section className="bg-card border border-border rounded-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold">お支払い情報</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                現在のプラン
              </label>
              <div className="px-3 py-2 border border-input rounded-md bg-background">
                <span className="font-semibold">Freeプラン</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                保有クレジット
              </label>
              <div className="px-3 py-2 border border-input rounded-md bg-background">
                <span className="text-2xl font-bold">
                  {user?.credits || 0}
                </span>
                <span className="text-sm text-muted-foreground ml-2">pt</span>
              </div>
            </div>

            <div>
              <Link
                href="/"
                className="inline-block px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                クレジットをチャージ
              </Link>
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="bg-card border border-destructive rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <h2 className="text-xl font-semibold text-destructive">危険な操作</h2>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              アカウントを削除すると、すべてのデータが完全に削除されます。この操作は取り消せません。
            </p>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 text-sm bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90"
              >
                アカウントを削除
              </button>
            ) : (
              <div className="space-y-3 p-4 border border-destructive rounded-md bg-destructive/5">
                <p className="text-sm font-medium">
                  本当にアカウントを削除しますか？
                </p>
                <p className="text-sm text-muted-foreground">
                  確認のため、下のフィールドに「削除」と入力してください。
                </p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="削除"
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirmText !== "削除" || deleting}
                    className="px-4 py-2 text-sm bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deleting ? "削除中..." : "削除を実行"}
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmText("");
                    }}
                    className="px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
