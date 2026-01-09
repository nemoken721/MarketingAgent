"use client";

import { useState } from "react";
import { Mail, Send, Loader2, ArrowLeft, CheckCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { AnimatedContainer } from "@/components/ui/animated-container";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "送信に失敗しました");
        return;
      }

      setSubmitted(true);
      toast.success("お問い合わせを送信しました");
    } catch (error) {
      console.error("Contact form error:", error);
      toast.error("送信中にエラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <AnimatedContainer className="max-w-md w-full">
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-bold mb-2">送信完了</h1>
            <p className="text-muted-foreground mb-6">
              お問い合わせありがとうございます。
              <br />
              2営業日以内にご返信いたします。
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              <ArrowLeft className="w-4 h-4" />
              ホームに戻る
            </Link>
          </div>
        </AnimatedContainer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <AnimatedContainer>
          <div className="mb-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              ホームに戻る
            </Link>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">お問い合わせ</h1>
                <p className="text-muted-foreground">
                  ご質問やご要望がございましたら、お気軽にお問い合わせください
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name */}
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium mb-2"
                >
                  お名前 <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="山田 太郎"
                />
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium mb-2"
                >
                  メールアドレス <span className="text-destructive">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="you@example.com"
                />
              </div>

              {/* Subject */}
              <div>
                <label
                  htmlFor="subject"
                  className="block text-sm font-medium mb-2"
                >
                  件名 <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="お問い合わせ内容の要約"
                />
              </div>

              {/* Message */}
              <div>
                <label
                  htmlFor="message"
                  className="block text-sm font-medium mb-2"
                >
                  お問い合わせ内容 <span className="text-destructive">*</span>
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={6}
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  placeholder="お問い合わせ内容を詳しくご記入ください"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    送信中...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    送信する
                  </>
                )}
              </button>
            </form>

            {/* Info */}
            <div className="mt-6 p-4 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">
                ※ いただいたお問い合わせには、2営業日以内にご返信いたします
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                ※ 営業時間: 平日 10:00〜18:00（土日祝日を除く）
              </p>
            </div>
          </div>
        </AnimatedContainer>
      </div>
    </div>
  );
}
