"use client";

import { useEffect } from "react";
import { Download, RefreshCw } from "lucide-react";
import Image from "next/image";

interface ImagePreviewProps {
  data: {
    success: boolean;
    imageUrl?: string;
    prompt?: string;
    aspectRatio?: string;
    costPaid?: number;
    newBalance?: number;
    error?: string;
    balance?: number;
    required?: number;
  };
}

export function ImagePreview({ data }: ImagePreviewProps) {
  // 画像生成成功時にクレジット更新イベントを発火
  useEffect(() => {
    if (data.success && data.newBalance !== undefined) {
      console.log("🔥 creditUpdated イベント発火:", data.newBalance);
      window.dispatchEvent(new Event("creditUpdated"));
    }
  }, [data.success, data.newBalance]);
  // エラー時の表示
  if (!data.success) {
    return (
      <div className="w-full max-w-md bg-red-500/10 border border-red-500 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">
          画像生成に失敗しました
        </h3>
        <p className="text-sm text-red-600 dark:text-red-400 mb-4">
          {data.error}
        </p>
        {data.balance !== undefined && data.required !== undefined && (
          <div className="bg-background rounded p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">現在の残高:</span>
              <span className="font-semibold">{data.balance} pt</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">必要ポイント:</span>
              <span className="font-semibold text-red-600">
                {data.required} pt
              </span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 mt-2">
              <span className="text-muted-foreground">不足:</span>
              <span className="font-semibold text-red-600">
                {data.required - data.balance} pt
              </span>
            </div>
          </div>
        )}
        <button className="mt-4 w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
          Ma-Pointをチャージする
        </button>
      </div>
    );
  }

  // 成功時の表示
  return (
    <div className="w-full max-w-md bg-background border border-border rounded-lg p-4 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold">画像が生成されました</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {data.prompt?.substring(0, 60)}
            {data.prompt && data.prompt.length > 60 ? "..." : ""}
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">消費ポイント</div>
          <div className="text-sm font-semibold text-red-600">
            -{data.costPaid} pt
          </div>
        </div>
      </div>

      {/* 画像プレビュー */}
      <div className="relative w-full bg-muted rounded-lg overflow-hidden">
        <img
          src={data.imageUrl}
          alt={data.prompt || "Generated image"}
          className="w-full h-auto"
        />
      </div>

      {/* アスペクト比情報 */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>
          アスペクト比:{" "}
          {data.aspectRatio === "square"
            ? "1:1 (正方形)"
            : data.aspectRatio === "portrait"
              ? "9:16 (縦長)"
              : "16:9 (横長)"}
        </span>
      </div>

      {/* アクションボタン */}
      <div className="flex gap-2">
        <button className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center justify-center gap-2">
          <Download className="w-4 h-4" />
          ダウンロード
        </button>
        <button className="px-4 py-2 bg-muted text-foreground rounded-md hover:bg-muted/80 flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          再生成
        </button>
      </div>

      {/* 残高表示 */}
      <div className="bg-muted rounded p-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">残り Ma-Point:</span>
          <span className="font-semibold">{data.newBalance} pt</span>
        </div>
      </div>
    </div>
  );
}
