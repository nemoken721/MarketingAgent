"use client";

import { useState, useEffect, useRef } from "react";
import { useChat } from "ai/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  ImageIcon,
  ChevronUp,
  ChevronDown,
  Loader2,
  Sparkles,
  Calendar,
} from "lucide-react";
import { useLiff } from "@/context/liff-context";
import { cn } from "@/lib/utils";

// Generative UI Components
import { ImagePreview } from "@/components/generative-ui/image-preview";
import { ContentFramePreview } from "@/components/generative-ui/content-frame-preview";

interface UploadedImage {
  id: string;
  url: string;
  status: "pending" | "processing" | "completed";
}

/**
 * LIFF 制作ルーム
 * LINEアプリ内でのAIチャット＆画像生成画面
 */
export default function LiffCreatePage() {
  const { profile, accessToken, isInClient } = useLiff();
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isLoadingContext, setIsLoadingContext] = useState(true);
  const [showOperationPanel, setShowOperationPanel] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AIチャット
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading: isChatLoading,
    setMessages,
  } = useChat({
    api: "/api/chat",
    body: {
      context: {
        mode: "liff-create",
        lineUserId: profile?.userId,
      },
    },
  });

  // 初期化: LINEから送信された画像を取得
  useEffect(() => {
    const fetchContext = async () => {
      if (!profile?.userId || !accessToken) {
        setIsLoadingContext(false);
        return;
      }

      try {
        const response = await fetch("/api/user/context", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "X-Line-User-Id": profile.userId,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.recentImages && data.recentImages.length > 0) {
            setUploadedImages(
              data.recentImages.map((img: any) => ({
                id: img.id,
                url: img.file_path,
                status: img.status,
              }))
            );

            // 自動的に最初のメッセージを表示
            setMessages([
              {
                id: "initial",
                role: "assistant",
                content: `画像を${data.recentImages.length}枚受け取りました！📸\n\nこの画像を使って、どんな投稿を作りましょうか？\n\n例：\n・「商品紹介の投稿を作って」\n・「キャンペーン告知にしたい」\n・「おしゃれな雰囲気で」`,
              },
            ]);
          }
        }
      } catch (error) {
        console.error("Failed to fetch context:", error);
      } finally {
        setIsLoadingContext(false);
      }
    };

    fetchContext();
  }, [profile?.userId, accessToken, setMessages]);

  // メッセージが追加されたら自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 画像アップロード処理
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append("images", file);
    });

    try {
      const response = await fetch("/api/upload/image", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "X-Line-User-Id": profile?.userId || "",
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setUploadedImages((prev) => [
          ...prev,
          ...data.images.map((img: any) => ({
            id: img.id,
            url: img.url,
            status: "pending",
          })),
        ]);
      }
    } catch (error) {
      console.error("Upload failed:", error);
    }
  };

  // 操作パネルの開閉
  const toggleOperationPanel = () => {
    setShowOperationPanel(!showOperationPanel);
  };

  // ローディング中
  if (isLoadingContext) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* ヘッダー（コンパクト） */}
      <header className="flex-shrink-0 bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-500" />
            <h1 className="font-bold text-gray-900">制作ルーム</h1>
          </div>
          {uploadedImages.length > 0 && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              画像 {uploadedImages.length}枚
            </span>
          )}
        </div>
      </header>

      {/* アップロード済み画像のプレビュー（横スクロール） */}
      {uploadedImages.length > 0 && (
        <div className="flex-shrink-0 bg-white border-b">
          <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
            {uploadedImages.map((img) => (
              <div
                key={img.id}
                className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-100"
              >
                <img
                  src={img.url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-shrink-0 w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-400 transition-colors"
            >
              <ImageIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* チャットエリア */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4 space-y-4">
          {/* 初期状態（画像なし） */}
          {uploadedImages.length === 0 && messages.length === 0 && (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ImageIcon className="w-10 h-10 text-blue-500" />
              </div>
              <h2 className="font-bold text-gray-900 mb-2">
                画像を追加して始めましょう
              </h2>
              <p className="text-gray-600 text-sm mb-6">
                商品写真やイメージ画像をアップロードすると、
                <br />
                AIが投稿を作成します
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-full font-medium shadow-lg shadow-blue-500/30"
              >
                <ImageIcon className="w-5 h-5" />
                画像をアップロード
              </button>
            </div>
          )}

          {/* メッセージ一覧 */}
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3",
                  message.role === "user"
                    ? "bg-blue-500 text-white rounded-br-md"
                    : "bg-white text-gray-900 rounded-bl-md shadow-sm"
                )}
              >
                <p className="whitespace-pre-wrap text-sm">{message.content}</p>
              </div>
            </div>
          ))}

          {/* 生成中インジケーター */}
          {isChatLoading && (
            <div className="flex justify-start">
              <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  <span className="text-sm text-gray-500">考え中...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 操作パネル（ボトムシート） */}
      <AnimatePresence>
        {showOperationPanel && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 bg-white rounded-t-3xl shadow-2xl z-50"
            style={{ maxHeight: "70vh" }}
          >
            <div className="p-4">
              {/* ハンドル */}
              <div
                className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4 cursor-pointer"
                onClick={toggleOperationPanel}
              />

              {/* 生成画像カルーセル */}
              {generatedImages.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-bold text-gray-900 mb-3">生成画像</h3>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {generatedImages.map((url, index) => (
                      <div
                        key={index}
                        className="flex-shrink-0 w-40 h-40 rounded-xl overflow-hidden"
                      >
                        <img
                          src={url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* パラメータ調整タグ */}
              <div className="mb-6">
                <h3 className="font-bold text-gray-900 mb-3">スタイル調整</h3>
                <div className="flex flex-wrap gap-2">
                  {["明るく", "高級感", "カジュアル", "文字少なめ", "インパクト大"].map(
                    (tag) => (
                      <button
                        key={tag}
                        className="px-3 py-1.5 text-sm rounded-full bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-700 transition-colors"
                      >
                        {tag}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* アクションボタン */}
              <button className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg">
                <Calendar className="w-5 h-5" />
                投稿予約する
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 入力エリア */}
      <div className="flex-shrink-0 bg-white border-t p-4 pb-safe">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim()) {
              handleSubmit(e);
            }
          }}
          className="flex items-end gap-2"
        >
          {/* 画像追加ボタン */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          {/* テキスト入力 */}
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={handleInputChange}
              placeholder="どんな投稿を作りますか？"
              rows={1}
              className="w-full resize-none rounded-2xl border border-gray-200 px-4 py-2.5 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              style={{ maxHeight: "120px" }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
              }}
            />
          </div>

          {/* 送信ボタン */}
          <button
            type="submit"
            disabled={!input.trim() || isChatLoading}
            className={cn(
              "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors",
              input.trim() && !isChatLoading
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-400"
            )}
          >
            <Send className="w-5 h-5" />
          </button>
        </form>

        {/* 操作パネル開閉ボタン */}
        {generatedImages.length > 0 && (
          <button
            onClick={toggleOperationPanel}
            className="w-full mt-3 py-2 text-sm text-blue-500 font-medium flex items-center justify-center gap-1"
          >
            {showOperationPanel ? (
              <>
                <ChevronDown className="w-4 h-4" />
                閉じる
              </>
            ) : (
              <>
                <ChevronUp className="w-4 h-4" />
                調整・投稿予約
              </>
            )}
          </button>
        )}
      </div>

      {/* 非表示のファイル入力 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleImageUpload}
        className="hidden"
      />
    </div>
  );
}
