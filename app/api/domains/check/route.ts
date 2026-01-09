import { NextRequest, NextResponse } from "next/server";
import { whoisDomain as whoiser } from "whoiser";

/**
 * ドメイン利用可能性チェックAPI（簡易版WHOIS）
 * GET /api/domains/check?domain=example.com
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get("domain");

    // バリデーション
    if (!domain) {
      return NextResponse.json(
        { error: "ドメイン名を指定してください" },
        { status: 400 }
      );
    }

    // ドメイン形式チェック（簡易版）
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      return NextResponse.json(
        { error: "有効なドメイン形式ではありません（例: example.com）" },
        { status: 400 }
      );
    }

    // WHOIS クエリ実行
    console.log(`[Domain Check] Checking domain: ${domain}`);
    const whoisData = await whoiser(domain, {
      timeout: 10000, // 10秒タイムアウト
      follow: 1, // 最小限のリダイレクト
    });

    // WHOIS データ解析
    // whoiser は複数のサーバーから結果を取得する場合があるため、最初の結果を使用
    const firstResult = Object.values(whoisData)[0] as any;

    if (!firstResult) {
      return NextResponse.json({
        available: false,
        message: "ドメイン情報を取得できませんでした",
        domain,
      });
    }

    // ドメインの利用可能性を判定
    // WHOIS結果に登録者情報があれば「取得済み」、なければ「利用可能」
    const isAvailable = isNotExistsWhoisResult(firstResult);

    return NextResponse.json({
      available: isAvailable,
      message: isAvailable
        ? `${domain} は利用可能です！`
        : `${domain} は既に取得されています`,
      domain,
      whoisData: firstResult, // デバッグ用
    });
  } catch (error: any) {
    console.error("[Domain Check Error]", error);

    // タイムアウトエラー
    if (error.message?.includes("timeout")) {
      return NextResponse.json(
        {
          error:
            "ドメイン検索がタイムアウトしました。しばらくしてから再度お試しください。",
          available: null,
        },
        { status: 504 }
      );
    }

    // その他のエラー
    return NextResponse.json(
      {
        error: "ドメイン検索中にエラーが発生しました",
        available: null,
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * WHOIS結果からドメインが利用可能かどうかを判定
 * @param whoisResult WHOIS結果オブジェクト
 * @returns true: 利用可能, false: 取得済み
 */
function isNotExistsWhoisResult(whoisResult: any): boolean {
  // WHOIS結果が文字列の場合（エラーメッセージなど）
  if (typeof whoisResult === "string") {
    const lowerResult = whoisResult.toLowerCase();
    // "no match" や "not found" などのキーワードが含まれていれば利用可能
    return (
      lowerResult.includes("no match") ||
      lowerResult.includes("not found") ||
      lowerResult.includes("no entries found") ||
      lowerResult.includes("domain not found") ||
      lowerResult.includes("no data found")
    );
  }

  // WHOIS結果がオブジェクトの場合
  if (typeof whoisResult === "object") {
    // "Domain Status" や "Registrant" などのフィールドが存在すれば取得済み
    const hasRegistrant =
      whoisResult["Registrant Name"] ||
      whoisResult["Registrant Organization"] ||
      whoisResult["Registrant"] ||
      whoisResult["registrant"] ||
      whoisResult["Registrar"];

    const hasDomainStatus =
      whoisResult["Domain Status"] || whoisResult["status"];

    // 登録者情報またはドメインステータスが存在すれば取得済み
    if (hasRegistrant || hasDomainStatus) {
      return false; // 取得済み
    }

    // テキストフィールドにエラーメッセージがある場合
    const textField = whoisResult.text || whoisResult.raw || "";
    if (typeof textField === "string") {
      const lowerText = textField.toLowerCase();
      return (
        lowerText.includes("no match") ||
        lowerText.includes("not found") ||
        lowerText.includes("no entries found") ||
        lowerText.includes("domain not found") ||
        lowerText.includes("no data found")
      );
    }
  }

  // 判定できない場合はエラーとして「取得済み」扱い（安全側）
  return false;
}
