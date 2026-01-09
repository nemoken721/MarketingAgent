"use client";

import { useState } from "react";
import { X, Loader2, Image as ImageIcon, Download, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { celebrateSuccess } from "@/lib/confetti";

interface ImageGenerationModalProps {
  onClose: () => void;
}

export default function ImageGenerationModal({
  onClose,
}: ImageGenerationModalProps) {
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState<"1024x1024" | "1024x1792" | "1792x1024">(
    "1024x1024"
  );
  const [quality, setQuality] = useState<"standard" | "hd">("standard");
  const [loading, setLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [revisedPrompt, setRevisedPrompt] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("プロンプトを入力してください");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, size, quality }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 402) {
          toast.error(
            `クレジットが不足しています（必要: ${data.required}pt、現在: ${data.current}pt）`
          );
        } else {
          toast.error(data.error || "画像の生成に失敗しました");
        }
        return;
      }

      setGeneratedImage(data.imageUrl);
      setRevisedPrompt(data.revisedPrompt);
      toast.success("画像を生成しました！");
      celebrateSuccess();

      // クレジット更新イベントを発火
      window.dispatchEvent(new Event("creditUpdated"));
    } catch (error) {
      console.error("Image generation error:", error);
      toast.error("画像生成中にエラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (generatedImage) {
      const link = document.createElement("a");
      link.href = generatedImage;
      link.download = `marty-image-${Date.now()}.png`;
      link.click();
      toast.success("画像をダウンロードしました");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">AI画像生成（DALL-E 3）</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Generated Image */}
          {generatedImage && (
            <div className="space-y-3">
              <div className="relative rounded-lg overflow-hidden border border-border bg-muted">
                <img
                  src={generatedImage}
                  alt="Generated"
                  className="w-full h-auto"
                />
              </div>
              {revisedPrompt && (
                <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
                  <strong>修正されたプロンプト:</strong> {revisedPrompt}
                </div>
              )}
              <button
                onClick={handleDownload}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                <Download className="w-4 h-4" />
                画像をダウンロード
              </button>
            </div>
          )}

          {/* Prompt Input */}
          <div>
            <label className="block text-sm font-medium mb-2">
              プロンプト（生成したい画像の説明）
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="例: 未来都市の夕暮れの風景、サイバーパンクスタイル、ネオンライト"
              rows={4}
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          {/* Size Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">サイズ</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setSize("1024x1024")}
                className={`px-4 py-2 border rounded-md transition-colors ${
                  size === "1024x1024"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input hover:bg-muted"
                }`}
              >
                正方形
                <br />
                <span className="text-xs text-muted-foreground">
                  1024×1024
                </span>
              </button>
              <button
                onClick={() => setSize("1024x1792")}
                className={`px-4 py-2 border rounded-md transition-colors ${
                  size === "1024x1792"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input hover:bg-muted"
                }`}
              >
                縦長
                <br />
                <span className="text-xs text-muted-foreground">
                  1024×1792
                </span>
              </button>
              <button
                onClick={() => setSize("1792x1024")}
                className={`px-4 py-2 border rounded-md transition-colors ${
                  size === "1792x1024"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input hover:bg-muted"
                }`}
              >
                横長
                <br />
                <span className="text-xs text-muted-foreground">
                  1792×1024
                </span>
              </button>
            </div>
          </div>

          {/* Quality Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">品質</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setQuality("standard")}
                className={`px-4 py-2 border rounded-md transition-colors ${
                  quality === "standard"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input hover:bg-muted"
                }`}
              >
                標準
                <br />
                <span className="text-xs text-muted-foreground">
                  100クレジット
                </span>
              </button>
              <button
                onClick={() => setQuality("hd")}
                className={`px-4 py-2 border rounded-md transition-colors ${
                  quality === "hd"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input hover:bg-muted"
                }`}
              >
                高品質（HD）
                <br />
                <span className="text-xs text-muted-foreground">
                  150クレジット
                </span>
              </button>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                画像を生成
              </>
            )}
          </button>

          {/* Info */}
          <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
            <p>
              ※
              DALL-E 3はOpenAIが開発した最新の画像生成AIです。プロンプトから高品質な画像を生成できます。
            </p>
            <p className="mt-1">
              ※ 生成には100〜150クレジットが必要です（品質により異なります）
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
