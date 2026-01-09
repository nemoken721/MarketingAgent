import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { postTweet } from "@/lib/integrations/x";
import * as Sentry from "@sentry/nextjs";

/**
 * Cron Job: 予約投稿の処理
 *
 * Vercel Cron で5分ごとに実行
 * scheduled_at が現在時刻以前の投稿を処理
 */
export async function GET(request: Request) {
  try {
    // Cron Secret による認証（本番環境のみ）
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (process.env.NODE_ENV === "production") {
      if (!cronSecret) {
        const error = new Error("CRON_SECRET is not configured");
        Sentry.captureException(error, { level: "fatal" });
        throw error;
      }

      if (authHeader !== `Bearer ${cronSecret}`) {
        console.error("Unauthorized cron request");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    console.log("🔄 Starting scheduled posts processing...");

    const supabase = await createClient();

    // scheduled_at が現在時刻以前の投稿を取得
    const now = new Date().toISOString();
    const { data: scheduledPosts, error: fetchError } = await supabase
      .from("posts")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_at", now)
      .order("scheduled_at", { ascending: true })
      .limit(50); // 一度に最大50件まで処理

    if (fetchError) {
      console.error("Failed to fetch scheduled posts:", fetchError);
      Sentry.captureException(fetchError, {
        tags: { cron: "process-scheduled-posts" },
      });
      throw fetchError;
    }

    if (!scheduledPosts || scheduledPosts.length === 0) {
      console.log("ℹ️  No scheduled posts to process");
      return NextResponse.json({
        success: true,
        processed: 0,
        message: "No posts to process",
      });
    }

    console.log(`📝 Processing ${scheduledPosts.length} scheduled post(s)...`);

    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      errors: [] as Array<{ postId: string; error: string }>,
    };

    // 各投稿を処理
    for (const post of scheduledPosts) {
      try {
        console.log(`📤 Publishing post ${post.id} to ${post.platform}...`);

        // プラットフォームごとに処理
        let publishResult: { success: boolean; error?: string } = {
          success: false,
        };

        switch (post.platform) {
          case "x":
            publishResult = await publishToX(post);
            break;

          case "instagram":
            publishResult = await publishToInstagram(post);
            break;

          case "wordpress":
            publishResult = await publishToWordPress(post);
            break;

          default:
            publishResult = {
              success: false,
              error: `Unsupported platform: ${post.platform}`,
            };
        }

        if (publishResult.success) {
          // 投稿成功
          await supabase
            .from("posts")
            .update({
              status: "published",
              published_at: new Date().toISOString(),
              error_message: null,
            })
            .eq("id", post.id);

          results.succeeded++;
          console.log(`✅ Published post ${post.id} successfully`);
        } else {
          // 投稿失敗
          await supabase
            .from("posts")
            .update({
              status: "failed",
              error_message: publishResult.error || "Unknown error",
            })
            .eq("id", post.id);

          results.failed++;
          results.errors.push({
            postId: post.id,
            error: publishResult.error || "Unknown error",
          });

          console.error(`❌ Failed to publish post ${post.id}:`, publishResult.error);

          Sentry.captureException(new Error(`Failed to publish post: ${publishResult.error}`), {
            tags: { cron: "process-scheduled-posts", platform: post.platform },
            extra: { post_id: post.id, user_id: post.user_id },
          });
        }

        results.processed++;
      } catch (error) {
        results.failed++;
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        results.errors.push({ postId: post.id, error: errorMsg });

        console.error(`❌ Error processing post ${post.id}:`, error);

        // エラーを記録
        const { error: updateError } = await supabase
          .from("posts")
          .update({
            status: "failed",
            error_message: errorMsg,
          })
          .eq("id", post.id);

        if (updateError) {
          console.error("Failed to update post status:", updateError);
        }

        Sentry.captureException(error, {
          tags: { cron: "process-scheduled-posts" },
          extra: { post_id: post.id, user_id: post.user_id },
        });
      }
    }

    console.log(
      `📊 Scheduled posts processing complete: ${results.succeeded} succeeded, ${results.failed} failed`
    );

    return NextResponse.json({
      success: true,
      ...results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Scheduled posts processing failed:", error);
    Sentry.captureException(error, {
      tags: { cron: "process-scheduled-posts" },
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * X (Twitter) に投稿
 */
async function publishToX(post: any): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await postTweet(post.user_id, post.content);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Instagram に投稿（ダミー実装）
 */
async function publishToInstagram(post: any): Promise<{ success: boolean; error?: string }> {
  try {
    // TODO: Instagram Graph API を使用して実際の投稿を実装
    console.log(`📸 [DUMMY] Publishing to Instagram: ${post.content}`);

    // ダミー実装（開発用）
    if (process.env.NODE_ENV === "development") {
      return { success: true };
    }

    // 本番環境では未実装エラーを返す
    return {
      success: false,
      error: "Instagram publishing not yet implemented",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * WordPress に投稿（ダミー実装）
 */
async function publishToWordPress(post: any): Promise<{ success: boolean; error?: string }> {
  try {
    // TODO: WordPress REST API を使用して実際の投稿を実装
    console.log(`📝 [DUMMY] Publishing to WordPress: ${post.content}`);

    // ダミー実装（開発用）
    if (process.env.NODE_ENV === "development") {
      return { success: true };
    }

    // 本番環境では未実装エラーを返す
    return {
      success: false,
      error: "WordPress publishing not yet implemented",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
