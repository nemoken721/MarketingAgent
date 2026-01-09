import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

interface CookieToSet {
  name: string;
  value: string;
  options: CookieOptions;
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // セッションのリフレッシュ
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 認証が必要なルートの保護
  // API ルートはリダイレクトせず、各APIで401を返す（JSONレスポンスを維持するため）
  const isApiRoute = request.nextUrl.pathname.startsWith("/api/");

  if (!user && !request.nextUrl.pathname.startsWith("/auth") && !isApiRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // ログイン済みユーザーの処理
  if (user) {
    // メール確認が必要かチェック（本番環境のみ）
    const requireEmailConfirmation = process.env.NODE_ENV === "production";

    if (requireEmailConfirmation) {
      // ユーザー情報を取得
      const { data: userData } = await supabase
        .from("users")
        .select("email_confirmed")
        .eq("id", user.id)
        .single();

      // メール未確認で、確認ページ以外にアクセスしている場合
      if (
        userData &&
        !userData.email_confirmed &&
        !request.nextUrl.pathname.startsWith("/auth/confirm") &&
        !request.nextUrl.pathname.startsWith("/auth/verify-email")
      ) {
        const url = request.nextUrl.clone();
        url.pathname = "/auth/verify-email";
        return NextResponse.redirect(url);
      }
    }

    // ログイン済みユーザーが認証ページにアクセスした場合、ホームにリダイレクト
    // ただし、確認ページは除外
    if (
      request.nextUrl.pathname.startsWith("/auth") &&
      !request.nextUrl.pathname.startsWith("/auth/confirm") &&
      !request.nextUrl.pathname.startsWith("/auth/verify-email")
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
