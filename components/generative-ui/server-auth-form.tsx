"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Server, Lock, User, Shield, AlertCircle, CheckCircle2, Eye, EyeOff, Key, Hash } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * サーバー認証情報入力フォームコンポーネント
 * SSH接続情報を安全に受け取り、暗号化して保存
 */

interface ServerAuthFormProps {
  websiteId: string;
  serverProvider: "xserver" | "conoha" | "other";
  onSuccess?: () => void;
  className?: string;
}

interface ServerCredentials {
  host: string;
  user: string;
  password: string;
  privateKey: string;
  port: number;
  authMethod: "password" | "privateKey";
}

export function ServerAuthForm({
  websiteId,
  serverProvider,
  onSuccess,
  className,
}: ServerAuthFormProps) {
  // プロバイダー別のデフォルト設定
  const getProviderDefaults = () => {
    switch (serverProvider) {
      case "xserver":
        return { port: 10022, authMethod: "privateKey" as const };
      case "conoha":
        return { port: 22, authMethod: "privateKey" as const };
      default:
        return { port: 22, authMethod: "password" as const };
    }
  };

  const defaults = getProviderDefaults();

  const [credentials, setCredentials] = useState<ServerCredentials>({
    host: "",
    user: "",
    password: "",
    privateKey: "",
    port: defaults.port,
    authMethod: defaults.authMethod,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // バリデーション
    if (!credentials.host || !credentials.user) {
      toast.error("ホスト名とユーザー名を入力してください");
      return;
    }

    if (credentials.authMethod === "password" && !credentials.password) {
      toast.error("パスワードを入力してください");
      return;
    }

    if (credentials.authMethod === "privateKey" && !credentials.privateKey) {
      toast.error("秘密鍵を入力してください");
      return;
    }

    // 秘密鍵のフォーマットチェック
    if (credentials.authMethod === "privateKey") {
      const key = credentials.privateKey.trim();
      const hasValidHeader =
        key.includes("-----BEGIN OPENSSH PRIVATE KEY-----") ||
        key.includes("-----BEGIN RSA PRIVATE KEY-----") ||
        key.includes("-----BEGIN EC PRIVATE KEY-----") ||
        key.includes("-----BEGIN PRIVATE KEY-----");

      if (!hasValidHeader) {
        toast.error(
          "秘密鍵のフォーマットが正しくありません。\n「-----BEGIN」から「-----END」まで全てをコピーしてください。",
          { duration: 5000 }
        );
        return;
      }
    }

    setIsLoading(true);

    try {
      // API呼び出し: SSH接続テスト & 暗号化保存
      const response = await fetch("/api/websites/save-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteId,
          host: credentials.host,
          user: credentials.user,
          port: credentials.port,
          authMethod: credentials.authMethod,
          password: credentials.authMethod === "password" ? credentials.password : undefined,
          privateKey: credentials.authMethod === "privateKey" ? credentials.privateKey : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "接続テストに失敗しました");
      }

      toast.success("サーバー接続情報を保存しました！");
      setIsSuccess(true);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error("[ServerAuthForm Error]", error);
      toast.error(error.message || "エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  const getProviderHint = () => {
    switch (serverProvider) {
      case "xserver":
        return {
          title: "Xserverサーバーパネルで確認（公開鍵認証）",
          items: [
            "サーバーパネル > サーバー > SSH設定 を開く",
            "ホスト名: [サーバーID].xsrv.jp 形式",
            "ユーザー名: サーバーID",
            "ポート: 10022（Xserver専用ポート）",
            "認証方式: 公開鍵認証（秘密鍵が必要）",
            "秘密鍵: SSH設定 > 公開鍵認証用鍵ペアの生成 からダウンロード",
          ],
        };
      case "conoha":
        return {
          title: "ConoHa WINGのコントロールパネルで確認",
          items: [
            "サーバー管理 > SSH を開く",
            "SSH Privatekeyをダウンロード",
            "ホスト名: サーバー情報に記載",
            "ユーザー名: ユーザー情報に記載",
            "ポート: 22",
          ],
        };
      default:
        return {
          title: "サーバー会社からのメールを確認",
          items: [
            "サーバー契約時に送られてきたメールを確認してください",
            "「SSH情報」または「FTP情報」を探してください",
            "認証方式がパスワードか公開鍵かを確認してください",
          ],
        };
    }
  };

  const hint = getProviderHint();

  // 成功状態の表示
  if (isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "bg-emerald-900/30 border-2 border-emerald-500 rounded-xl p-5",
          className
        )}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-emerald-100 text-sm">
              接続成功！
            </h3>
            <p className="text-xs text-emerald-300">
              サーバーへの接続情報を安全に保存しました
            </p>
          </div>
        </div>
        <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-600">
          <p className="text-sm text-white">
            ✨ Martyに<strong>「次へ進みましょう」</strong>と伝えてください！
          </p>
          <p className="text-xs text-slate-400 mt-1">
            デザインのヒアリングを開始します
          </p>
        </div>
      </motion.div>
    );
  }

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
        <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
          <Lock className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-white text-sm">
            サーバー接続情報の入力
          </h3>
          <p className="text-xs text-slate-400">
            WordPressインストールに必要な情報
          </p>
        </div>
      </div>

      {/* ヒント表示トグル */}
      <button
        type="button"
        onClick={() => setShowHint(!showHint)}
        className="w-full mb-4 p-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-left hover:bg-slate-700 transition-colors flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-300">
            {showHint ? "ヒントを隠す" : "どこで確認できる？"}
          </span>
        </div>
        <motion.div
          animate={{ rotate: showHint ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-slate-400 text-xs"
        >
          ▼
        </motion.div>
      </button>

      {/* ヒント内容 */}
      <motion.div
        initial={false}
        animate={{ height: showHint ? "auto" : 0, opacity: showHint ? 1 : 0 }}
        className="overflow-hidden"
      >
        <div className="mb-4 p-3 bg-slate-700/30 border border-slate-600 rounded-lg">
          <h4 className="font-semibold text-xs text-white mb-2">{hint.title}</h4>
          <ul className="space-y-1">
            {hint.items.map((item, index) => (
              <li key={index} className="text-xs text-slate-400 flex gap-2">
                <span className="text-blue-400">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </motion.div>

      {/* フォーム */}
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* SSHホスト名 */}
        <div>
          <label htmlFor="host" className="block text-xs font-medium text-slate-300 mb-1">
            <Server className="w-3.5 h-3.5 inline mr-1" />
            SSHホスト名
          </label>
          <input
            id="host"
            type="text"
            value={credentials.host}
            onChange={(e) =>
              setCredentials({ ...credentials, host: e.target.value })
            }
            placeholder={serverProvider === "xserver" ? "sv12345.xserver.jp" : "your-server.example.com"}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* ポートとユーザー名 */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label htmlFor="port" className="block text-xs font-medium text-slate-300 mb-1">
              <Hash className="w-3.5 h-3.5 inline mr-1" />
              ポート
            </label>
            <input
              id="port"
              type="number"
              value={credentials.port}
              onChange={(e) =>
                setCredentials({ ...credentials, port: parseInt(e.target.value) || 22 })
              }
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          <div className="col-span-2">
            <label htmlFor="user" className="block text-xs font-medium text-slate-300 mb-1">
              <User className="w-3.5 h-3.5 inline mr-1" />
              ユーザー名
            </label>
            <input
              id="user"
              type="text"
              value={credentials.user}
              onChange={(e) =>
                setCredentials({ ...credentials, user: e.target.value })
              }
              placeholder="your_username"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
        </div>

        {/* 認証方式選択 */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-2">
            <Key className="w-3.5 h-3.5 inline mr-1" />
            認証方式
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCredentials({ ...credentials, authMethod: "privateKey" })}
              className={cn(
                "flex-1 px-3 py-2 rounded-lg border text-xs font-medium transition-colors",
                credentials.authMethod === "privateKey"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-slate-900 text-slate-300 border-slate-600 hover:bg-slate-700"
              )}
            >
              🔑 秘密鍵認証
            </button>
            <button
              type="button"
              onClick={() => setCredentials({ ...credentials, authMethod: "password" })}
              className={cn(
                "flex-1 px-3 py-2 rounded-lg border text-xs font-medium transition-colors",
                credentials.authMethod === "password"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-slate-900 text-slate-300 border-slate-600 hover:bg-slate-700"
              )}
            >
              🔒 パスワード
            </button>
          </div>
        </div>

        {/* 秘密鍵入力（秘密鍵認証の場合） */}
        {credentials.authMethod === "privateKey" && (
          <div>
            <label htmlFor="privateKey" className="block text-xs font-medium text-slate-300 mb-1">
              <Key className="w-3.5 h-3.5 inline mr-1" />
              SSH秘密鍵
            </label>
            <textarea
              id="privateKey"
              value={credentials.privateKey}
              onChange={(e) =>
                setCredentials({ ...credentials, privateKey: e.target.value })
              }
              placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;b3BlbnNza...&#10;-----END OPENSSH PRIVATE KEY-----"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={6}
              required
            />
            <div className="mt-2 p-2 bg-amber-900/30 rounded-lg border border-amber-700/50">
              <p className="text-xs text-amber-300 font-medium mb-1">📋 秘密鍵の貼り付け方</p>
              <p className="text-xs text-amber-200/80">
                ダウンロードした <code className="bg-slate-700 px-1 rounded">.key</code> ファイルをメモ帳で開き、
                <strong className="text-amber-100">「-----BEGIN」から「-----END」まで全て</strong>をコピーして貼り付けてください。
              </p>
            </div>
          </div>
        )}

        {/* SSHパスワード（パスワード認証の場合） */}
        {credentials.authMethod === "password" && (
          <div>
            <label htmlFor="password" className="block text-xs font-medium text-slate-300 mb-1">
              <Lock className="w-3.5 h-3.5 inline mr-1" />
              SSHパスワード
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={credentials.password}
                onChange={(e) =>
                  setCredentials({ ...credentials, password: e.target.value })
                }
                placeholder="サーバーのSSHパスワード"
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
          </div>
        )}

        {/* セキュリティ説明 */}
        <div className="flex gap-2 p-2.5 bg-emerald-900/20 rounded-lg border border-emerald-700/50">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-emerald-300">
            この情報は<strong>AES-256暗号化</strong>され、安全に保存されます。
          </p>
        </div>

        {/* 送信ボタン */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-600 disabled:text-slate-400 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>接続テスト中...</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              <span>接続テストして保存</span>
            </>
          )}
        </button>
      </form>

      {/* 注意事項 */}
      <p className="mt-3 text-xs text-slate-500">
        ⚠️ 送信すると即座に接続テストを行います。成功時のみ保存されます。
      </p>
    </motion.div>
  );
}
