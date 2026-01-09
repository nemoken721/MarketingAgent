import * as Sentry from "@sentry/nextjs";

/**
 * WordPress REST API 統合（セキュリティ強化版）
 *
 * Application Passwords を使用した安全な API 呼び出し
 * SSRF 攻撃、XSS、インジェクション攻撃の防止
 *
 * @see https://developer.wordpress.org/rest-api/
 */

interface WordPressPost {
  title: string;
  content: string;
  status: "publish" | "draft" | "pending";
  excerpt?: string;
  featured_media?: number;
  categories?: number[];
  tags?: number[];
}

interface WordPressAPIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * WordPress サイト URL のバリデーション（SSRF 防止）
 */
function validateWordPressSiteUrl(url: string): { valid: boolean; error?: string } {
  try {
    const parsedUrl = new URL(url);

    // プロトコルチェック（HTTPS のみ許可）
    if (parsedUrl.protocol !== "https:") {
      return {
        valid: false,
        error: "Only HTTPS URLs are allowed for security reasons",
      };
    }

    // ローカルホスト/プライベートIPの禁止（SSRF 防止）
    const hostname = parsedUrl.hostname;

    // localhost, 127.0.0.1, 0.0.0.0
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("172.16.") ||
      hostname.startsWith("172.17.") ||
      hostname.startsWith("172.18.") ||
      hostname.startsWith("172.19.") ||
      hostname.startsWith("172.20.") ||
      hostname.startsWith("172.21.") ||
      hostname.startsWith("172.22.") ||
      hostname.startsWith("172.23.") ||
      hostname.startsWith("172.24.") ||
      hostname.startsWith("172.25.") ||
      hostname.startsWith("172.26.") ||
      hostname.startsWith("172.27.") ||
      hostname.startsWith("172.28.") ||
      hostname.startsWith("172.29.") ||
      hostname.startsWith("172.30.") ||
      hostname.startsWith("172.31.")
    ) {
      return {
        valid: false,
        error: "Local and private IP addresses are not allowed",
      };
    }

    // IPv6 localhost (::1)
    if (hostname === "::1" || hostname === "[::1]") {
      return {
        valid: false,
        error: "Local and private IP addresses are not allowed",
      };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: "Invalid URL format" };
  }
}

/**
 * HTML コンテンツのサニタイゼーション（XSS 防止）
 */
function sanitizeHtmlContent(content: string): string {
  // 危険なタグとスクリプトを除去
  const dangerousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // onclick, onerror, etc.
  ];

  let sanitized = content;
  for (const pattern of dangerousPatterns) {
    sanitized = sanitized.replace(pattern, "");
  }

  return sanitized;
}

/**
 * WordPress REST API リクエストを実行
 */
async function makeWordPressRequest<T = any>(
  siteUrl: string,
  username: string,
  applicationPassword: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<WordPressAPIResponse<T>> {
  try {
    // サイト URL のバリデーション（SSRF 防止）
    const urlValidation = validateWordPressSiteUrl(siteUrl);
    if (!urlValidation.valid) {
      const error = `Invalid site URL: ${urlValidation.error}`;
      console.error(error);
      Sentry.captureException(new Error(error), {
        tags: { integration: "wordpress", error_type: "validation" },
      });
      return { success: false, error };
    }

    // Basic 認証ヘッダーを生成（Application Password）
    const credentials = Buffer.from(`${username}:${applicationPassword}`).toString(
      "base64"
    );

    const url = `${siteUrl}/wp-json/wp/v2${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
      // タイムアウト設定（30秒）
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`WordPress API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    return { success: true, data };
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "Failed to call WordPress API";
    console.error("WordPress API request failed:", error);

    Sentry.captureException(error, {
      tags: { integration: "wordpress", error_type: "api_request" },
      extra: { site_url: siteUrl, endpoint },
    });

    return { success: false, error: errorMsg };
  }
}

/**
 * WordPress に投稿を作成
 */
export async function createWordPressPost(
  siteUrl: string,
  username: string,
  applicationPassword: string,
  post: WordPressPost
): Promise<WordPressAPIResponse<{ id: number; link: string }>> {
  // コンテンツのサニタイゼーション（XSS 防止）
  const sanitizedPost = {
    ...post,
    title: post.title.trim(),
    content: sanitizeHtmlContent(post.content),
    excerpt: post.excerpt ? sanitizeHtmlContent(post.excerpt) : undefined,
  };

  // タイトルと本文の長さチェック
  if (sanitizedPost.title.length === 0) {
    return { success: false, error: "Title cannot be empty" };
  }

  if (sanitizedPost.title.length > 1000) {
    return { success: false, error: "Title is too long (max 1000 characters)" };
  }

  if (sanitizedPost.content.length === 0) {
    return { success: false, error: "Content cannot be empty" };
  }

  return makeWordPressRequest(
    siteUrl,
    username,
    applicationPassword,
    "/posts",
    {
      method: "POST",
      body: JSON.stringify(sanitizedPost),
    }
  );
}

/**
 * WordPress の投稿を更新
 */
export async function updateWordPressPost(
  siteUrl: string,
  username: string,
  applicationPassword: string,
  postId: number,
  post: Partial<WordPressPost>
): Promise<WordPressAPIResponse<{ id: number; link: string }>> {
  // コンテンツのサニタイゼーション
  const sanitizedPost: Partial<WordPressPost> = {};

  if (post.title !== undefined) {
    sanitizedPost.title = post.title.trim();
    if (sanitizedPost.title.length > 1000) {
      return { success: false, error: "Title is too long (max 1000 characters)" };
    }
  }

  if (post.content !== undefined) {
    sanitizedPost.content = sanitizeHtmlContent(post.content);
  }

  if (post.excerpt !== undefined) {
    sanitizedPost.excerpt = sanitizeHtmlContent(post.excerpt);
  }

  if (post.status !== undefined) {
    sanitizedPost.status = post.status;
  }

  return makeWordPressRequest(
    siteUrl,
    username,
    applicationPassword,
    `/posts/${postId}`,
    {
      method: "POST",
      body: JSON.stringify(sanitizedPost),
    }
  );
}

/**
 * WordPress の投稿を削除
 */
export async function deleteWordPressPost(
  siteUrl: string,
  username: string,
  applicationPassword: string,
  postId: number
): Promise<WordPressAPIResponse<{ deleted: boolean }>> {
  return makeWordPressRequest(
    siteUrl,
    username,
    applicationPassword,
    `/posts/${postId}`,
    {
      method: "DELETE",
    }
  );
}

/**
 * WordPress サイトへの接続をテスト
 */
export async function testWordPressConnection(
  siteUrl: string,
  username: string,
  applicationPassword: string
): Promise<WordPressAPIResponse<{ authenticated: boolean; user: any }>> {
  try {
    const urlValidation = validateWordPressSiteUrl(siteUrl);
    if (!urlValidation.valid) {
      return {
        success: false,
        error: `Invalid site URL: ${urlValidation.error}`,
      };
    }

    // 現在のユーザー情報を取得して認証テスト
    const result = await makeWordPressRequest(
      siteUrl,
      username,
      applicationPassword,
      "/users/me",
      { method: "GET" }
    );

    if (!result.success) {
      return result;
    }

    return {
      success: true,
      data: {
        authenticated: true,
        user: result.data,
      },
    };
  } catch (error) {
    const errorMsg =
      error instanceof Error
        ? error.message
        : "Failed to test WordPress connection";

    Sentry.captureException(error, {
      tags: { integration: "wordpress", error_type: "connection_test" },
    });

    return { success: false, error: errorMsg };
  }
}
