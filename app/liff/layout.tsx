"use client";

import { useEffect, ReactNode } from "react";
import { useLiff } from "@/context/liff-context";
import { Loader2 } from "lucide-react";

interface LiffLayoutProps {
  children: ReactNode;
}

/**
 * LIFF専用レイアウト
 * LINE内での表示に最適化された全画面レイアウト
 */
export default function LiffLayout({ children }: LiffLayoutProps) {
  const { isLoading, isInitialized, isLoggedIn, login, profile, error } =
    useLiff();

  // LIFF未ログイン時は自動ログイン
  useEffect(() => {
    if (isInitialized && !isLoggedIn) {
      login();
    }
  }, [isInitialized, isLoggedIn, login]);

  // ローディング中
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  // LIFF初期化エラー
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h1 className="text-lg font-bold text-gray-900 mb-2">
            接続エラー
          </h1>
          <p className="text-gray-600 text-sm mb-4">
            LINEとの接続に問題が発生しました。
            <br />
            アプリを再起動してください。
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium"
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  // LIFF環境外からのアクセス（開発用）
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📱</span>
          </div>
          <h1 className="text-lg font-bold text-gray-900 mb-2">
            LINEアプリからアクセスしてください
          </h1>
          <p className="text-gray-600 text-sm">
            このページはLINEアプリ内からのみ
            <br />
            アクセス可能です。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white liff-page">
      {/* ユーザー情報バナー（開発確認用、本番では非表示可） */}
      {profile && process.env.NODE_ENV === "development" && (
        <div className="bg-green-50 px-4 py-2 text-xs text-green-800 border-b border-green-100">
          <span className="font-medium">{profile.displayName}</span> として接続中
        </div>
      )}
      {children}
    </div>
  );
}
