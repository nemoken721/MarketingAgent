import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * ユーザーの既存Webサイト一覧を取得
 * GET /api/websites/list
 *
 * 接続済みサイトをワンクリックで選択できるようにする
 */

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // ユーザーのWebサイト一覧を取得（接続情報の有無も含む）
    const { data: websites, error: websitesError } = await supabase
      .from("websites")
      .select(`
        id,
        domain,
        status,
        server_host,
        server_user,
        server_port,
        wp_detection_result,
        metadata,
        created_at,
        updated_at
      `)
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (websitesError) {
      console.error("[Websites List API] Error:", websitesError);
      return NextResponse.json(
        { error: "サイト一覧の取得に失敗しました" },
        { status: 500 }
      );
    }

    // 接続情報の有無を判定して返す
    interface WebsiteRow {
      id: string;
      domain: string;
      status: string;
      server_host: string | null;
      server_user: string | null;
      server_port: number | null;
      wp_detection_result: unknown;
      metadata: unknown;
      updated_at: string;
    }

    const sitesWithConnectionStatus = (websites || []).map((site: WebsiteRow) => {
      const hasCredentials = !!(site.server_host && site.server_user);
      const wpDetection = site.wp_detection_result as any;
      const serverProvider = (site.metadata as any)?.server_provider || "other";

      return {
        id: site.id,
        domain: site.domain,
        status: site.status,
        serverProvider,
        hasCredentials,
        serverHost: site.server_host ? `${site.server_host}:${site.server_port || 22}` : null,
        serverUser: site.server_user,
        wpInstalled: wpDetection?.installed || false,
        wpVersion: wpDetection?.wpVersion || null,
        lastUsed: site.updated_at,
      };
    });

    return NextResponse.json({
      success: true,
      sites: sitesWithConnectionStatus,
      total: sitesWithConnectionStatus.length,
    });
  } catch (error: any) {
    console.error("[Websites List API] Error:", error);
    return NextResponse.json(
      { error: "エラーが発生しました", details: error.message },
      { status: 500 }
    );
  }
}
