import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { subDays, format } from "date-fns";

export async function GET() {
  try {
    const supabase = await createClient();

    // ユーザー認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "認証されていません" }, { status: 401 });
    }

    // クレジット使用履歴を取得（過去7日間）
    const sevenDaysAgo = subDays(new Date(), 7);
    const { data: creditLedger } = await supabase
      .from("credit_ledger")
      .select("*")
      .eq("user_id", user.id)
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: true });

    // 日別のクレジット使用状況を集計
    const creditUsageByDate = new Map<string, { used: number; purchased: number }>();

    // 過去7日間の日付を初期化
    for (let i = 0; i < 7; i++) {
      const date = format(subDays(new Date(), 6 - i), "M/d");
      creditUsageByDate.set(date, { used: 0, purchased: 0 });
    }

    // クレジット履歴を日別に集計
    creditLedger?.forEach((entry: { created_at: string; amount: number }) => {
      const date = format(new Date(entry.created_at), "M/d");
      const current = creditUsageByDate.get(date) || { used: 0, purchased: 0 };

      if (entry.amount < 0) {
        current.used += Math.abs(entry.amount);
      } else {
        current.purchased += entry.amount;
      }

      creditUsageByDate.set(date, current);
    });

    const creditUsage = Array.from(creditUsageByDate.entries()).map(
      ([date, data]) => ({
        date,
        used: data.used,
        purchased: data.purchased,
      })
    );

    // 最近のアクティビティを取得（最新10件）
    const { data: recentActivities } = await supabase
      .from("credit_ledger")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    const activities = recentActivities?.map((activity: {
      id: string;
      amount: number;
      description: string | null;
      created_at: string;
    }) => ({
      id: activity.id,
      type: activity.amount > 0 ? "credit_purchase" : "credit_usage",
      description: activity.description || "クレジット操作",
      amount: activity.amount,
      createdAt: activity.created_at,
    })) || [];

    // 統計データ（サンプル値 - 実際のデータがある場合は置き換える）
    const stats = {
      totalPosts: 42,
      scheduledPosts: 8,
      publishedToday: 3,
      averageEngagement: 7.5,
      platforms: {
        instagram: 20,
        twitter: 15,
        wordpress: 7,
      },
      creditUsage,
      recentActivities: activities,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "統計データの取得に失敗しました" },
      { status: 500 }
    );
  }
}
