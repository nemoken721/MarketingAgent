"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { User, Lock, Mail, FileText, Rocket, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * WordPress管理者情報入力フォームコンポーネント
 * サイトタイトル、管理者ユーザー名、パスワード、メールアドレスを入力
 */

interface WordPressAdminFormProps {
  websiteId: string;
  domain: string;
  onSuccess?: () => void;
  className?: string;
}

interface AdminInfo {
  siteTitle: string;
  adminUser: string;
  adminPassword: string;
  adminEmail: string;
}

export function WordPressAdminForm({
  websiteId,
  domain,
  onSuccess,
  className,
}: WordPressAdminFormProps) {
  const [adminInfo, setAdminInfo] = useState<AdminInfo>({
    siteTitle: "",
    adminUser: "admin",
    adminPassword: "",
    adminEmail: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // バリデーション
    if (
      !adminInfo.siteTitle ||
      !adminInfo.adminUser ||
      !adminInfo.adminPassword ||
      !adminInfo.adminEmail
    ) {
      toast.error("すべての項目を入力してください");
      return;
    }

    // メールアドレス形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminInfo.adminEmail)) {
      toast.error("有効なメールアドレスを入力してください");
      return;
    }

    // パスワード強度チェック
    if (adminInfo.adminPassword.length < 8) {
      toast.error("パスワードは8文字以上にしてください");
      return;
    }

    setIsLoading(true);

    try {
      // API呼び出し: WordPress構築開始
      const response = await fetch("/api/websites/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteId,
          ...adminInfo,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "WordPress構築の開始に失敗しました");
      }

      toast.success(
        "WordPress構築を開始しました！完了までしばらくお待ちください。"
      );
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error("[WordPressAdminForm Error]", error);
      toast.error(error.message || "エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-slate-800 border border-slate-600 rounded-xl p-5",
        className
      )}
    >
      {/* ヘッダー */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
          <Rocket className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-white text-sm">
            WordPress管理者情報の設定
          </h3>
          <p className="text-xs text-slate-400">
            あと一歩で完成です！
          </p>
        </div>
      </div>

      {/* 説明 */}
      <div className="p-3 mb-4 bg-blue-900/30 rounded-lg border border-blue-700/50">
        <p className="text-xs text-blue-200">
          <strong className="text-blue-100">ドメイン: {domain}</strong>
          <br />
          サーバーの準備ができました！これからWordPressをインストールします。
          ログインに必要な管理者情報を入力してください。
        </p>
      </div>

      {/* フォーム */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* サイトタイトル */}
        <div>
          <label htmlFor="siteTitle" className="block text-xs font-medium text-slate-300 mb-1">
            <FileText className="w-3.5 h-3.5 inline mr-1" />
            サイトタイトル
          </label>
          <input
            id="siteTitle"
            type="text"
            value={adminInfo.siteTitle}
            onChange={(e) =>
              setAdminInfo({ ...adminInfo, siteTitle: e.target.value })
            }
            placeholder="例: 田中パン屋"
            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
          <p className="text-xs text-slate-500 mt-1">
            サイトのタイトルです。後から変更できます。
          </p>
        </div>

        {/* 管理者ユーザー名 */}
        <div>
          <label htmlFor="adminUser" className="block text-xs font-medium text-slate-300 mb-1">
            <User className="w-3.5 h-3.5 inline mr-1" />
            管理者ユーザー名
          </label>
          <input
            id="adminUser"
            type="text"
            value={adminInfo.adminUser}
            onChange={(e) =>
              setAdminInfo({ ...adminInfo, adminUser: e.target.value })
            }
            placeholder="例: admin"
            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
          <p className="text-xs text-slate-500 mt-1">
            WordPressにログインするときのユーザー名です。
          </p>
        </div>

        {/* 管理者パスワード */}
        <div>
          <label
            htmlFor="adminPassword"
            className="block text-xs font-medium text-slate-300 mb-1"
          >
            <Lock className="w-3.5 h-3.5 inline mr-1" />
            管理者パスワード
          </label>
          <div className="relative">
            <input
              id="adminPassword"
              type={showPassword ? "text" : "password"}
              value={adminInfo.adminPassword}
              onChange={(e) =>
                setAdminInfo({ ...adminInfo, adminPassword: e.target.value })
              }
              placeholder="8文字以上の強力なパスワード"
              className="w-full px-3 py-2 pr-10 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-700 rounded"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4 text-slate-400" />
              ) : (
                <Eye className="w-4 h-4 text-slate-400" />
              )}
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            8文字以上の強力なパスワードを設定してください。
          </p>
        </div>

        {/* 管理者メールアドレス */}
        <div>
          <label htmlFor="adminEmail" className="block text-xs font-medium text-slate-300 mb-1">
            <Mail className="w-3.5 h-3.5 inline mr-1" />
            管理者メールアドレス
          </label>
          <input
            id="adminEmail"
            type="email"
            value={adminInfo.adminEmail}
            onChange={(e) =>
              setAdminInfo({ ...adminInfo, adminEmail: e.target.value })
            }
            placeholder="例: tanaka@example.com"
            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
          <p className="text-xs text-slate-500 mt-1">
            WordPressからの通知を受け取るメールアドレスです。
          </p>
        </div>

        {/* 送信ボタン */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 transition-colors flex items-center justify-center gap-2 font-semibold text-sm"
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>WordPress構築中...</span>
            </>
          ) : (
            <>
              <Rocket className="w-5 h-5" />
              <span>WordPress構築を開始</span>
            </>
          )}
        </button>
      </form>

      {/* 注意事項 */}
      <p className="mt-3 text-xs text-slate-500">
        ⚠️ 構築には数分かかる場合があります。完了するまでお待ちください。
      </p>
    </motion.div>
  );
}
