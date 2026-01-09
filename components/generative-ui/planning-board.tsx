"use client";

import { useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";

interface PlanItem {
  day: string;
  platform: string;
  content: string;
  time: string;
}

interface PlanningBoardProps {
  data: {
    title: string;
    items: PlanItem[];
  };
}

export function PlanningBoard({ data }: PlanningBoardProps) {
  const [loading, setLoading] = useState(false);
  const [approved, setApproved] = useState(false);

  const handleApprove = async () => {
    setLoading(true);

    try {
      // 企画データを整形
      const plans = data.items.map((item) => ({
        day: item.day,
        platform: item.platform,
        content: item.content,
        time: item.time,
        scheduledAt: null, // 実際のスケジュール日時は後で設定
      }));

      const response = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plans }),
      });

      if (!response.ok) {
        throw new Error("Failed to approve plans");
      }

      const result = await response.json();
      console.log("Plans approved:", result);

      setApproved(true);

      // 3秒後にメッセージを非表示
      setTimeout(() => {
        setApproved(false);
      }, 3000);
    } catch (error) {
      console.error("Approval error:", error);
      alert("企画の承認に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-background border border-border rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4">{data.title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-2 font-semibold">曜日</th>
              <th className="text-left p-2 font-semibold">プラットフォーム</th>
              <th className="text-left p-2 font-semibold">内容</th>
              <th className="text-left p-2 font-semibold">時間</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, index) => (
              <tr
                key={index}
                className="border-b border-border hover:bg-muted/50 cursor-pointer"
              >
                <td className="p-2">{item.day}</td>
                <td className="p-2">{item.platform}</td>
                <td className="p-2">{item.content}</td>
                <td className="p-2">{item.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Success Message */}
      {approved && (
        <div className="mt-4 p-3 bg-green-500/10 border border-green-500 rounded-md flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <span className="text-sm text-green-600 dark:text-green-400">
            {data.items.length}件の企画を承認しました！postsテーブルに保存されました。
          </span>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button
          onClick={handleApprove}
          disabled={loading || approved}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              承認中...
            </>
          ) : approved ? (
            <>
              <CheckCircle className="w-4 h-4" />
              承認済み
            </>
          ) : (
            "承認"
          )}
        </button>
        <button
          className="px-4 py-2 bg-muted text-foreground rounded-md hover:bg-muted/80"
          disabled={loading}
        >
          修正
        </button>
      </div>
    </div>
  );
}
