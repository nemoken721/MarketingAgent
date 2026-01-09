import crypto from "crypto";

/**
 * AES-256-GCM暗号化ユーティリティ
 * サーバー認証情報（SSH パスワード等）を安全に暗号化・復号化する
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 初期化ベクトルの長さ（bytes）
const AUTH_TAG_LENGTH = 16; // 認証タグの長さ（bytes）
const SALT_LENGTH = 64; // ソルトの長さ（bytes）

/**
 * 環境変数から暗号化キーを取得
 * ENCRYPTION_KEY が未設定の場合はエラーを投げる
 */
function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      "ENCRYPTION_KEY environment variable is not set. Please set a strong encryption key."
    );
  }
  if (key.length < 32) {
    throw new Error(
      "ENCRYPTION_KEY must be at least 32 characters long for AES-256 encryption."
    );
  }
  return key;
}

/**
 * 暗号化キーからハッシュを生成
 * @param key 暗号化キー
 * @param salt ソルト
 * @returns 32バイトのキー
 */
function deriveKey(key: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(key, salt, 100000, 32, "sha512");
}

/**
 * テキストを暗号化
 * @param text 暗号化する平文
 * @returns 暗号化されたテキスト（Base64エンコード）
 */
export function encrypt(text: string): string {
  try {
    const key = getEncryptionKey();

    // ランダムなソルトと初期化ベクトルを生成
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);

    // キーを派生
    const derivedKey = deriveKey(key, salt);

    // 暗号化
    const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    // 認証タグを取得
    const authTag = cipher.getAuthTag();

    // salt:iv:authTag:encryptedText の形式で保存
    const result = Buffer.concat([
      salt,
      iv,
      authTag,
      Buffer.from(encrypted, "hex"),
    ]);

    return result.toString("base64");
  } catch (error) {
    console.error("[Encryption Error]", error);
    throw new Error("Failed to encrypt data");
  }
}

/**
 * 暗号化されたテキストを復号化
 * @param encryptedText 暗号化されたテキスト（Base64エンコード）
 * @returns 復号化された平文
 */
export function decrypt(encryptedText: string): string {
  try {
    const key = getEncryptionKey();

    // Base64デコード
    const buffer = Buffer.from(encryptedText, "base64");

    // salt, iv, authTag, encrypted を分離
    const salt = buffer.subarray(0, SALT_LENGTH);
    const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = buffer.subarray(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
    );
    const encrypted = buffer.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

    // キーを派生
    const derivedKey = deriveKey(key, salt);

    // 復号化
    const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted.toString("hex"), "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("[Decryption Error]", error);
    throw new Error("Failed to decrypt data. The data may be corrupted or tampered with.");
  }
}

/**
 * 暗号化キーが設定されているかチェック
 * @returns キーが設定されていればtrue
 */
export function isEncryptionKeyConfigured(): boolean {
  return !!process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length >= 32;
}

/**
 * ランダムな暗号化キーを生成（開発用）
 * @returns 64文字のランダムキー
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString("hex");
}
