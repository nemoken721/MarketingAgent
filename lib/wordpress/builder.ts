import { Client, ClientChannel, ConnectConfig } from "ssh2";
import { decrypt } from "@/lib/encryption";
import { createClient } from "@/lib/supabase/server";

/**
 * WordPress構築エンジン
 * SSH経由でサーバーに接続し、WordPressを自動構築する
 */

export interface WordPressConfig {
  domain: string;
  siteTitle: string;
  adminUser: string;
  adminPassword: string;
  adminEmail: string;
}

export interface BuildProgress {
  step: number;
  message: string;
  percent: number;
  completed: boolean;
}

/**
 * WordPress検出結果の型定義
 */
export interface WPDetectionResult {
  installed: boolean;
  hasWpConfig: boolean;
  hasWpCli: boolean;
  wpVersion: string | null;
  siteUrl: string | null;
  adminEmail: string | null;
  themes: string[];
  plugins: string[];
  error?: string;
}

export class WordPressBuilder {
  private conn: Client;
  private host: string;
  private port: number;
  private username: string;
  private password: string | null;
  private privateKey: string | null;
  private websiteId: string;
  private serverProvider: string;
  private homeDir: string | null = null; // キャッシュ用
  private detectedWpPaths: Map<string, string> = new Map(); // 検出済みWordPressパスのキャッシュ

  constructor(
    websiteId: string,
    host: string,
    port: number,
    username: string,
    encryptedPassword: string | null,
    encryptedKey: string | null,
    serverProvider: string = "other"
  ) {
    this.conn = new Client();
    this.websiteId = websiteId;
    this.host = host;
    this.port = port;
    this.username = username;
    this.password = encryptedPassword ? decrypt(encryptedPassword) : null;
    this.privateKey = encryptedKey ? decrypt(encryptedKey) : null;
    this.serverProvider = serverProvider;
  }

  /**
   * ホームディレクトリを取得（キャッシュ付き）
   */
  private async getHomeDir(): Promise<string> {
    if (this.homeDir) {
      return this.homeDir;
    }

    try {
      const result = await this.execCommand("echo $HOME");
      this.homeDir = result.trim();
      console.log(`[WordPressBuilder] ホームディレクトリ: ${this.homeDir}`);
      return this.homeDir;
    } catch (error) {
      console.error("[WordPressBuilder] ホームディレクトリ取得エラー:", error);
      // フォールバック: ユーザー名からホームディレクトリを推測
      this.homeDir = `/home/${this.username}`;
      return this.homeDir;
    }
  }

  /**
   * サーバープロバイダーに応じたWordPressパスを取得（相対パス）
   */
  private getWordPressPathRelative(domain: string): string {
    switch (this.serverProvider) {
      case "xserver":
        // Xserver: ~/{domain}/public_html/
        return `~/${domain}/public_html`;
      case "conoha":
        // ConoHa WING: ~/public_html/{domain}/
        return `~/public_html/${domain}`;
      default:
        // 一般的なサーバー: ~/public_html/{domain}/
        return `~/public_html/${domain}`;
    }
  }

  /**
   * サーバープロバイダーに応じたWordPressパスを取得（絶対パス）
   */
  private async getWordPressPath(domain: string): Promise<string> {
    const homeDir = await this.getHomeDir();

    switch (this.serverProvider) {
      case "xserver":
        // Xserver: /home/{user}/{domain}/public_html/
        return `${homeDir}/${domain}/public_html`;
      case "conoha":
        // ConoHa WING: /home/{user}/public_html/{domain}/
        return `${homeDir}/public_html/${domain}`;
      default:
        // 一般的なサーバー: /home/{user}/public_html/{domain}/
        return `${homeDir}/public_html/${domain}`;
    }
  }

  /**
   * 構築進捗を更新
   */
  private async updateProgress(
    step: number,
    message: string,
    percent: number,
    completed: boolean = false
  ): Promise<void> {
    try {
      const supabase = await createClient();
      const progress: BuildProgress = { step, message, percent, completed };

      await supabase
        .from("websites")
        .update({
          build_progress: progress,
          updated_at: new Date().toISOString(),
        })
        .eq("id", this.websiteId);

      console.log(`[Progress] ${percent}% - ${message}`);
    } catch (error) {
      console.error("[Progress Update Error]", error);
      // 進捗更新エラーは構築を止めない
    }
  }

  /**
   * SSH接続を確立
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("SSH接続がタイムアウトしました"));
      }, 30000);

      // 接続設定を構築（パスワード or キー認証）
      const connectConfig: ConnectConfig = {
        host: this.host,
        port: this.port,
        username: this.username,
        readyTimeout: 30000,
      };

      // キー認証が優先、なければパスワード認証
      if (this.privateKey) {
        connectConfig.privateKey = this.privateKey;
        console.log("[WordPressBuilder] SSHキー認証を使用");
      } else if (this.password) {
        connectConfig.password = this.password;
        console.log("[WordPressBuilder] パスワード認証を使用");
      } else {
        reject(new Error("認証情報がありません（パスワードまたはSSHキーが必要）"));
        return;
      }

      this.conn
        .on("ready", () => {
          clearTimeout(timeout);
          console.log("[WordPressBuilder] SSH接続成功");
          resolve();
        })
        .on("error", (err) => {
          clearTimeout(timeout);
          reject(new Error(`SSH接続エラー: ${err.message}`));
        })
        .connect(connectConfig);
    });
  }

  /**
   * SSH接続を切断
   */
  disconnect(): void {
    this.conn.end();
    console.log("[WordPressBuilder] SSH接続を切断");
  }

  /**
   * SSHコマンドを実行
   */
  private async execCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.conn.exec(command, (err, stream) => {
        if (err) {
          reject(new Error(`コマンド実行エラー: ${err.message}`));
          return;
        }

        let stdout = "";
        let stderr = "";

        stream
          .on("close", (code: number) => {
            // エラー出力を統合（2>&1使用時はstdoutにエラーが含まれる）
            const errorOutput = stderr || stdout;
            if (code !== 0) {
              console.error(`[SSH Error] コマンド: ${command}`);
              console.error(`[SSH Error] 終了コード: ${code}`);
              console.error(`[SSH Error] stdout: ${stdout}`);
              console.error(`[SSH Error] stderr: ${stderr}`);
              reject(new Error(`コマンド終了コード: ${code}\nエラー: ${errorOutput}`));
            } else {
              resolve(stdout);
            }
          })
          .on("data", (data: Buffer) => {
            stdout += data.toString();
          })
          .stderr.on("data", (data: Buffer) => {
            stderr += data.toString();
          });
      });
    });
  }

  /**
   * WP-CLIをインストール
   */
  async installWPCLI(): Promise<void> {
    console.log("[WordPressBuilder] WP-CLIをインストール中...");

    // 環境情報を取得
    try {
      const envInfo = await this.execCommand("echo HOME=$HOME && which php && php -v | head -1");
      console.log("[WordPressBuilder] 環境情報:", envInfo);
    } catch (e) {
      console.log("[WordPressBuilder] 環境情報取得失敗");
    }

    // WP-CLIが既にインストールされているかチェック
    const existingPath = await this.getWpCliPath();
    if (existingPath) {
      console.log("[WordPressBuilder] WP-CLI は既にインストール済み:", existingPath);
      return;
    }

    console.log("[WordPressBuilder] WP-CLIをダウンロード中...");

    // ディレクトリ作成
    await this.execCommand("mkdir -p $HOME/bin");

    // WP-CLIをダウンロード（curl または wget を試す）
    try {
      // まずcurlを試す
      const curlResult = await this.execCommand(
        "cd $HOME/bin && curl -sL -o wp https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar && echo 'download_ok'"
      );
      console.log("[WordPressBuilder] curlダウンロード結果:", curlResult);
    } catch (curlError: any) {
      console.log("[WordPressBuilder] curlが失敗、wgetを試行...", curlError.message);
      // curlが失敗したらwgetを試す
      const wgetResult = await this.execCommand(
        "cd $HOME/bin && wget -q -O wp https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar && echo 'download_ok'"
      );
      console.log("[WordPressBuilder] wgetダウンロード結果:", wgetResult);
    }

    // 実行権限を付与
    await this.execCommand("chmod +x $HOME/bin/wp");

    // ファイルが存在するか確認
    const fileCheck = await this.execCommand("ls -la $HOME/bin/wp 2>&1 || echo 'not_exists'");
    console.log("[WordPressBuilder] WP-CLIファイル確認:", fileCheck);
    if (fileCheck.includes("not_exists") || fileCheck.includes("No such file")) {
      throw new Error("WP-CLIファイルのダウンロードに失敗しました");
    }

    // 複数の方法で実行を試みる（PHP 8.x を優先）
    const verifyCommands = [
      "/usr/bin/php8.1 $HOME/bin/wp --version",  // PHP 8.1
      "/usr/bin/php8.2 $HOME/bin/wp --version",  // PHP 8.2
      "/usr/bin/php8.0 $HOME/bin/wp --version",  // PHP 8.0
      "/usr/bin/php7.4 $HOME/bin/wp --version",  // PHP 7.4
      "$HOME/bin/wp --version",
      "php $HOME/bin/wp --version",
      "/usr/bin/php $HOME/bin/wp --version"
    ];

    for (const cmd of verifyCommands) {
      try {
        const verifyResult = await this.execCommand(`${cmd} 2>&1`);
        // PHPエラーがないことも確認
        if ((verifyResult.includes("WP-CLI") || verifyResult.match(/^\d+\.\d+/)) && !verifyResult.includes("PHP Parse error")) {
          console.log(`[WordPressBuilder] WP-CLIインストール完了 (${cmd}):`, verifyResult.trim());
          return;
        }
      } catch (e: any) {
        console.log(`[WordPressBuilder] ${cmd}: 失敗 -`, e.message);
      }
    }

    throw new Error("WP-CLIのインストールは完了しましたが、実行に失敗しました。PHPの設定を確認してください。");
  }

  /**
   * 【新機能】ファイルの存在確認
   */
  async checkFileExists(filePath: string): Promise<boolean> {
    try {
      const result = await this.execCommand(`test -f ${filePath} && echo "exists" || echo "not_found"`);
      return result.trim() === "exists";
    } catch (error) {
      return false;
    }
  }

  /**
   * 【新機能】WP-CLIが利用可能か確認
   */
  async checkWpCliAvailable(): Promise<boolean> {
    try {
      // まず$HOME/bin/wpを確認（$HOMEを使用して確実に展開）
      const result = await this.execCommand("$HOME/bin/wp --version 2>/dev/null || wp --version 2>/dev/null || echo 'not_found'");
      return !result.includes("not_found");
    } catch (error) {
      return false;
    }
  }

  /**
   * 【新機能】利用可能なWP-CLIのパスを取得
   */
  async getWpCliPath(): Promise<string | null> {
    // エックスサーバーなど共有サーバーでは php を明示的に指定する必要がある
    // PHP 8.x のパスを優先して試行する（WordPress 6.x はPHP 7.4+が必要）
    const paths = [
      // エックスサーバー用: PHP 8.x を明示的に指定
      "/usr/bin/php8.1 $HOME/bin/wp",  // PHP 8.1
      "/usr/bin/php8.2 $HOME/bin/wp",  // PHP 8.2
      "/usr/bin/php8.0 $HOME/bin/wp",  // PHP 8.0
      "/usr/bin/php7.4 $HOME/bin/wp",  // PHP 7.4
      // システムのwpコマンド（PHP 8が設定されている場合）
      "/usr/bin/php8.1 $(which wp)",   // システムwp + PHP 8.1
      "/usr/bin/php8.2 $(which wp)",   // システムwp + PHP 8.2
      // フォールバック
      "php $HOME/bin/wp",              // デフォルトPHPで実行
      "$HOME/bin/wp",                  // ユーザーインストールのwp
      "wp",                            // システムのwp
    ];

    console.log("[WordPressBuilder] WP-CLIパスを検索中...");

    for (const path of paths) {
      try {
        console.log(`[WordPressBuilder] 試行中: ${path}`);
        const result = await this.execCommand(`${path} --version 2>&1`);
        // WP-CLIのバージョン出力を確認（PHPエラーがないことも確認）
        if ((result.includes("WP-CLI") || result.match(/^\d+\.\d+\.\d+/)) && !result.includes("PHP Parse error")) {
          console.log(`[WordPressBuilder] WP-CLI発見: ${path} -> ${result.trim()}`);
          return path;
        }
      } catch (error: any) {
        console.log(`[WordPressBuilder] ${path}: 失敗 - ${error.message}`);
        continue;
      }
    }

    console.log("[WordPressBuilder] WP-CLIが見つかりませんでした");
    return null;
  }

  /**
   * 【新機能】WP-CLIのみインストール（WordPress本体は既存）
   */
  async installWpCliOnly(): Promise<void> {
    console.log("[WordPressBuilder] WP-CLIのみをインストール中...");

    // installWPCLIを呼び出す（同じロジックを使用）
    await this.installWPCLI();

    console.log("[WordPressBuilder] WP-CLIインストール完了");
  }

  /**
   * 【新機能】既存WordPressの情報を取得
   */
  async getWordPressInfo(wpPath: string): Promise<{
    version: string | null;
    siteUrl: string | null;
    adminEmail: string | null;
    themes: string[];
    plugins: string[];
  }> {
    const wpCliPath = "$HOME/bin/wp";
    const result = {
      version: null as string | null,
      siteUrl: null as string | null,
      adminEmail: null as string | null,
      themes: [] as string[],
      plugins: [] as string[],
    };

    try {
      // WordPressバージョン取得
      const versionResult = await this.execCommand(
        `${wpCliPath} core version --path=${wpPath} 2>/dev/null || echo ""`
      );
      result.version = versionResult.trim() || null;

      // サイトURL取得
      const urlResult = await this.execCommand(
        `${wpCliPath} option get siteurl --path=${wpPath} 2>/dev/null || echo ""`
      );
      result.siteUrl = urlResult.trim() || null;

      // 管理者メール取得
      const emailResult = await this.execCommand(
        `${wpCliPath} option get admin_email --path=${wpPath} 2>/dev/null || echo ""`
      );
      result.adminEmail = emailResult.trim() || null;

      // インストール済みテーマ一覧
      const themesResult = await this.execCommand(
        `${wpCliPath} theme list --path=${wpPath} --format=csv --fields=name 2>/dev/null || echo ""`
      );
      result.themes = themesResult
        .split("\n")
        .filter((t) => t.trim() && t !== "name")
        .map((t) => t.trim());

      // インストール済みプラグイン一覧
      const pluginsResult = await this.execCommand(
        `${wpCliPath} plugin list --path=${wpPath} --format=csv --fields=name 2>/dev/null || echo ""`
      );
      result.plugins = pluginsResult
        .split("\n")
        .filter((p) => p.trim() && p !== "name")
        .map((p) => p.trim());
    } catch (error) {
      console.error("[WordPressBuilder] WordPress情報取得エラー:", error);
    }

    return result;
  }

  /**
   * 【改善】複数の候補パスでwp-config.phpを検索
   */
  private async findWordPressPath(domain: string): Promise<string | null> {
    // キャッシュをチェック
    if (this.detectedWpPaths.has(domain)) {
      return this.detectedWpPaths.get(domain)!;
    }

    const homeDir = await this.getHomeDir();

    // ドメインのバリエーション（www付き、サブドメインなし等）
    const domainVariants = [
      domain,
      domain.replace(/^www\./, ''),        // www.example.com → example.com
      domain.replace(/\./g, '-'),          // example.com → example-com
      domain.split('.')[0],                // example.com → example
    ];

    // 試すべきパスのパターン（優先度順）
    const pathPatterns: string[] = [];

    for (const d of domainVariants) {
      // Xserver パターン
      pathPatterns.push(`${homeDir}/${d}/public_html`);
      // ConoHa / 一般的パターン
      pathPatterns.push(`${homeDir}/public_html/${d}`);
      // サブディレクトリなしパターン
      pathPatterns.push(`${homeDir}/public_html`);
      // www直下パターン
      pathPatterns.push(`${homeDir}/www/${d}`);
      pathPatterns.push(`${homeDir}/www`);
      // htdocsパターン（一部サーバー）
      pathPatterns.push(`${homeDir}/htdocs/${d}`);
      pathPatterns.push(`${homeDir}/htdocs`);
    }

    // 重複を除去
    const uniquePaths = [...new Set(pathPatterns)];

    console.log(`[WordPressBuilder] wp-config.php を検索中... (候補: ${uniquePaths.length}箇所)`);

    for (const path of uniquePaths) {
      const wpConfigPath = `${path}/wp-config.php`;
      try {
        const exists = await this.checkFileExists(wpConfigPath);
        if (exists) {
          console.log(`[WordPressBuilder] wp-config.php 発見: ${wpConfigPath}`);
          // キャッシュに保存
          this.detectedWpPaths.set(domain, path);
          return path;
        }
      } catch {
        // エラーは無視して次のパスを試す
      }
    }

    // findコマンドでも検索（最終手段）
    try {
      console.log(`[WordPressBuilder] findコマンドで広範囲検索中...`);
      const findResult = await this.execCommand(
        `find ${homeDir} -name "wp-config.php" -type f 2>/dev/null | head -5`
      );
      const foundPaths = findResult.trim().split('\n').filter(p => p);
      if (foundPaths.length > 0) {
        // 最初に見つかったwp-config.phpのディレクトリを返す
        const foundPath = foundPaths[0].replace('/wp-config.php', '');
        console.log(`[WordPressBuilder] findで発見: ${foundPath}`);
        // キャッシュに保存
        this.detectedWpPaths.set(domain, foundPath);
        return foundPath;
      }
    } catch (findError) {
      console.log(`[WordPressBuilder] findコマンド失敗:`, findError);
    }

    console.log(`[WordPressBuilder] wp-config.php が見つかりませんでした`);
    return null;
  }

  /**
   * 【新機能】WordPressの実際のパスを取得（検出済みならそれを使用、なければデフォルト）
   */
  async getActualWordPressPath(domain: string): Promise<string> {
    // まず検出を試みる
    const detectedPath = await this.findWordPressPath(domain);
    if (detectedPath) {
      return detectedPath;
    }
    // フォールバック: デフォルトパス
    return this.getWordPressPath(domain);
  }

  /**
   * 【新機能】既存WordPressを検出
   * SSH接続後に呼び出して、WordPressがインストール済みか確認する
   */
  async detectExistingWordPress(domain: string): Promise<WPDetectionResult> {
    console.log(`[WordPressBuilder] WordPress検出中... (domain: ${domain})`);

    const result: WPDetectionResult = {
      installed: false,
      hasWpConfig: false,
      hasWpCli: false,
      wpVersion: null,
      siteUrl: null,
      adminEmail: null,
      themes: [],
      plugins: [],
    };

    try {
      // 1. 複数のパスを試してwp-config.phpを検索
      const detectedWpPath = await this.findWordPressPath(domain);

      if (detectedWpPath) {
        result.hasWpConfig = true;
        result.installed = true;
        console.log(`[WordPressBuilder] wp-config.php: 存在 (${detectedWpPath})`);
      } else {
        // フォールバック: デフォルトパスも確認
        const defaultPath = await this.getWordPressPath(domain);
        const wpConfigPath = `${defaultPath}/wp-config.php`;
        result.hasWpConfig = await this.checkFileExists(wpConfigPath);
        console.log(`[WordPressBuilder] wp-config.php (デフォルトパス): ${result.hasWpConfig ? "存在" : "なし"}`);
      }

      // 2. WP-CLI の存在確認
      result.hasWpCli = await this.checkWpCliAvailable();
      console.log(`[WordPressBuilder] WP-CLI: ${result.hasWpCli ? "利用可能" : "なし"}`);

      // 3. wp-config.phpが存在すれば、WordPressはインストール済みと判断
      if (result.hasWpConfig) {
        result.installed = true;

        // WP-CLIがあれば詳細情報を取得
        const wpPath = detectedWpPath || await this.getWordPressPath(domain);
        if (result.hasWpCli) {
          const wpInfo = await this.getWordPressInfo(wpPath);
          result.wpVersion = wpInfo.version;
          result.siteUrl = wpInfo.siteUrl;
          result.adminEmail = wpInfo.adminEmail;
          result.themes = wpInfo.themes;
          result.plugins = wpInfo.plugins;
        }
      }

      console.log(`[WordPressBuilder] 検出結果: ${result.installed ? "インストール済み" : "未インストール"}`);
      return result;
    } catch (error: any) {
      console.error("[WordPressBuilder] 検出エラー:", error);
      result.error = error.message;
      return result;
    }
  }

  /**
   * 【新機能】プラグインをインストール
   */
  async installPlugin(domain: string, pluginSlug: string): Promise<{ success: boolean; message: string }> {
    console.log(`[WordPressBuilder] プラグインインストール: ${pluginSlug}`);

    try {
      const wpPath = await this.getActualWordPressPath(domain);
      // 利用可能なWP-CLIパスを取得
      let wpCliPath = await this.getWpCliPath();

      if (!wpCliPath) {
        console.log("[WordPressBuilder] WP-CLIが見つかりません。インストールします...");
        await this.installWPCLI();
        wpCliPath = await this.getWpCliPath();
      }

      if (!wpCliPath) {
        throw new Error("WP-CLIのインストールに失敗しました。サーバー管理者にお問い合わせください。");
      }

      console.log(`[WordPressBuilder] 使用するWP-CLI: ${wpCliPath}`);
      console.log(`[WordPressBuilder] WordPressパス: ${wpPath}`);

      // まずWP-CLIがWordPressを認識できるか確認
      try {
        const checkResult = await this.execCommand(
          `${wpCliPath} core version --path=${wpPath}`
        );
        console.log(`[WordPressBuilder] WordPress確認: ${checkResult.trim()}`);
      } catch (checkError: any) {
        console.error(`[WordPressBuilder] WordPress認識エラー:`, checkError.message);
        throw new Error(`WordPressが認識できません: ${checkError.message}`);
      }

      // プラグインをインストール（--pathオプションを使用）
      const installResult = await this.execCommand(
        `${wpCliPath} plugin install ${pluginSlug} --activate --path=${wpPath}`
      );
      console.log(`[WordPressBuilder] プラグインインストール結果:`, installResult);

      return {
        success: true,
        message: `プラグイン「${pluginSlug}」をインストールしました`,
      };
    } catch (error: any) {
      console.error(`[WordPressBuilder] プラグインインストールエラー:`, error);
      return {
        success: false,
        message: `プラグインのインストールに失敗しました: ${error.message}`,
      };
    }
  }

  /**
   * 【新機能】プラグインを有効化
   */
  async activatePlugin(domain: string, pluginSlug: string): Promise<{ success: boolean; message: string }> {
    console.log(`[WordPressBuilder] プラグイン有効化: ${pluginSlug}`);

    try {
      const wpPath = await this.getActualWordPressPath(domain);
      // 利用可能なWP-CLIパスを取得
      let wpCliPath = await this.getWpCliPath();
      if (!wpCliPath) {
        await this.installWPCLI();
        wpCliPath = await this.getWpCliPath();
      }
      if (!wpCliPath) {
        throw new Error("WP-CLIが利用できません");
      }

      const result = await this.execCommand(
        `${wpCliPath} plugin activate ${pluginSlug} --path=${wpPath}`
      );
      console.log(`[WordPressBuilder] プラグイン有効化結果:`, result);

      return {
        success: true,
        message: `プラグイン「${pluginSlug}」を有効化しました`,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `プラグインの有効化に失敗しました: ${error.message}`,
      };
    }
  }

  /**
   * 【新機能】固定ページを作成
   */
  async createPage(
    domain: string,
    title: string,
    content: string,
    status: "publish" | "draft" = "publish"
  ): Promise<{ success: boolean; message: string; pageId?: number; pageUrl?: string }> {
    console.log(`[WordPressBuilder] 固定ページ作成: ${title}`);

    try {
      const wpPath = await this.getActualWordPressPath(domain);
      // 利用可能なWP-CLIパスを取得
      let wpCliPath = await this.getWpCliPath();
      if (!wpCliPath) {
        console.log("[WordPressBuilder] WP-CLIが見つかりません。インストールします...");
        await this.installWPCLI();
        wpCliPath = await this.getWpCliPath();
      }
      if (!wpCliPath) {
        throw new Error("WP-CLIが利用できません");
      }

      console.log(`[WordPressBuilder] 使用するWP-CLI: ${wpCliPath}`);
      console.log(`[WordPressBuilder] WordPressパス: ${wpPath}`);

      // コンテンツをエスケープ（シングルクォートをエスケープ）
      const escapedContent = content.replace(/'/g, "'\\''");
      const escapedTitle = title.replace(/'/g, "'\\''");

      // 固定ページを作成（--pathオプションを使用）
      const result = await this.execCommand(
        `${wpCliPath} post create --post_type=page --post_title='${escapedTitle}' --post_content='${escapedContent}' --post_status=${status} --porcelain --path=${wpPath}`
      );

      const pageId = parseInt(result.trim(), 10);

      if (isNaN(pageId)) {
        throw new Error(`ページIDの取得に失敗: ${result}`);
      }

      // ページURLを取得（WP-CLI 2.4.0は--field=urlをサポートしないため、--field=linkまたはguidを使用）
      let pageUrl = "";
      try {
        // まず--field=linkを試す（新しいWP-CLI向け）
        const urlResult = await this.execCommand(
          `${wpCliPath} post get ${pageId} --field=link --path=${wpPath}`
        );
        pageUrl = urlResult.trim();
      } catch {
        try {
          // --field=guidを試す（古いWP-CLI向け）
          const guidResult = await this.execCommand(
            `${wpCliPath} post get ${pageId} --field=guid --path=${wpPath}`
          );
          pageUrl = guidResult.trim();
        } catch {
          // URLを手動で構築
          try {
            const siteUrlResult = await this.execCommand(
              `${wpCliPath} option get siteurl --path=${wpPath}`
            );
            const slugResult = await this.execCommand(
              `${wpCliPath} post get ${pageId} --field=post_name --path=${wpPath}`
            );
            pageUrl = `${siteUrlResult.trim()}/${slugResult.trim()}/`;
          } catch {
            // URLの取得に失敗してもページは作成されているので続行
            console.log(`[WordPressBuilder] ページURL取得をスキップ（ページIDは取得済み: ${pageId}）`);
            pageUrl = "";
          }
        }
      }

      console.log(`[WordPressBuilder] ページ作成成功: ID=${pageId}${pageUrl ? `, URL=${pageUrl}` : ""}`);

      return {
        success: true,
        message: `固定ページ「${title}」を作成しました`,
        pageId,
        pageUrl,
      };
    } catch (error: any) {
      console.error(`[WordPressBuilder] ページ作成エラー:`, error);
      return {
        success: false,
        message: `固定ページの作成に失敗しました: ${error.message}`,
      };
    }
  }

  /**
   * 【新機能】既存ページを更新
   */
  async updatePage(
    domain: string,
    pageId: number,
    updates: {
      title?: string;
      content?: string;
      status?: "publish" | "draft" | "private";
    }
  ): Promise<{ success: boolean; message: string; pageUrl?: string }> {
    console.log(`[WordPressBuilder] ページ更新: ID=${pageId}`);

    try {
      const wpPath = await this.getActualWordPressPath(domain);
      let wpCliPath = await this.getWpCliPath();
      if (!wpCliPath) {
        await this.installWPCLI();
        wpCliPath = await this.getWpCliPath();
      }
      if (!wpCliPath) {
        throw new Error("WP-CLIが利用できません");
      }

      // 更新コマンドを構築
      const updateArgs: string[] = [];

      if (updates.title) {
        const escapedTitle = updates.title.replace(/'/g, "'\\''");
        updateArgs.push(`--post_title='${escapedTitle}'`);
      }

      if (updates.content) {
        const escapedContent = updates.content.replace(/'/g, "'\\''");
        updateArgs.push(`--post_content='${escapedContent}'`);
      }

      if (updates.status) {
        updateArgs.push(`--post_status=${updates.status}`);
      }

      if (updateArgs.length === 0) {
        return {
          success: false,
          message: "更新内容が指定されていません",
        };
      }

      // ページを更新
      await this.execCommand(
        `${wpCliPath} post update ${pageId} ${updateArgs.join(" ")} --path=${wpPath}`
      );

      // ページURLを取得
      let pageUrl = "";
      try {
        const urlResult = await this.execCommand(
          `${wpCliPath} post get ${pageId} --field=link --path=${wpPath}`
        );
        pageUrl = urlResult.trim();
      } catch {
        // URL取得失敗は無視
      }

      console.log(`[WordPressBuilder] ページ更新成功: ID=${pageId}`);

      return {
        success: true,
        message: `ページ (ID: ${pageId}) を更新しました`,
        pageUrl,
      };
    } catch (error: any) {
      console.error(`[WordPressBuilder] ページ更新エラー:`, error);
      return {
        success: false,
        message: `ページの更新に失敗しました: ${error.message}`,
      };
    }
  }

  /**
   * 【新機能】カスタムCSSを追加
   * WordPressのカスタマイザーにCSSを追加する
   */
  async addCustomCSS(
    domain: string,
    css: string,
    append: boolean = true
  ): Promise<{ success: boolean; message: string }> {
    console.log(`[WordPressBuilder] カスタムCSS追加 (append=${append})`);

    try {
      const wpPath = await this.getActualWordPressPath(domain);
      let wpCliPath = await this.getWpCliPath();
      if (!wpCliPath) {
        await this.installWPCLI();
        wpCliPath = await this.getWpCliPath();
      }
      if (!wpCliPath) {
        throw new Error("WP-CLIが利用できません");
      }

      // 現在のカスタムCSSを取得
      let currentCSS = "";
      if (append) {
        try {
          const result = await this.execCommand(
            `${wpCliPath} option get custom_css_post_id --path=${wpPath}`
          );
          const postId = parseInt(result.trim(), 10);
          if (!isNaN(postId) && postId > 0) {
            const cssResult = await this.execCommand(
              `${wpCliPath} post get ${postId} --field=post_content --path=${wpPath}`
            );
            currentCSS = cssResult.trim();
          }
        } catch {
          // カスタムCSSが未設定の場合は無視
        }
      }

      // 新しいCSSを結合
      const newCSS = append && currentCSS ? `${currentCSS}\n\n/* Added by Marty */\n${css}` : css;
      const escapedCSS = newCSS.replace(/'/g, "'\\''");

      // カスタムCSSを設定（wp_add_custom_css_post関数相当の処理）
      // 方法1: 既存のcustom_css投稿を更新または新規作成
      try {
        const checkResult = await this.execCommand(
          `${wpCliPath} option get custom_css_post_id --path=${wpPath} 2>/dev/null || echo "0"`
        );
        const existingPostId = parseInt(checkResult.trim(), 10);

        if (existingPostId > 0) {
          // 既存の投稿を更新
          await this.execCommand(
            `${wpCliPath} post update ${existingPostId} --post_content='${escapedCSS}' --path=${wpPath}`
          );
        } else {
          // 新規作成
          const stylesheet = await this.execCommand(
            `${wpCliPath} option get stylesheet --path=${wpPath}`
          );
          const themeName = stylesheet.trim();

          const createResult = await this.execCommand(
            `${wpCliPath} post create --post_type=custom_css --post_title='${themeName}' --post_name='${themeName}' --post_content='${escapedCSS}' --post_status=publish --porcelain --path=${wpPath}`
          );
          const newPostId = parseInt(createResult.trim(), 10);

          if (!isNaN(newPostId)) {
            await this.execCommand(
              `${wpCliPath} option update custom_css_post_id ${newPostId} --path=${wpPath}`
            );
          }
        }
      } catch (innerError) {
        // 代替方法: テーマのstyle.cssに直接追記（非推奨だが確実）
        console.log(`[WordPressBuilder] カスタマイザーCSS更新失敗、代替方法を試行`);
        const themePath = await this.execCommand(
          `${wpCliPath} theme path --path=${wpPath}`
        );
        const activeTheme = await this.execCommand(
          `${wpCliPath} option get stylesheet --path=${wpPath}`
        );
        const customCssPath = `${wpPath}/wp-content/themes/${activeTheme.trim()}/custom-marty.css`;

        // カスタムCSSファイルを作成
        await this.execCommand(`echo '${escapedCSS}' > ${customCssPath}`);

        // functions.phpにエンキューを追加（存在しない場合のみ）
        const functionsPath = `${wpPath}/wp-content/themes/${activeTheme.trim()}/functions.php`;
        const checkEnqueue = await this.execCommand(
          `grep -c "custom-marty.css" ${functionsPath} 2>/dev/null || echo "0"`
        );

        if (parseInt(checkEnqueue.trim(), 10) === 0) {
          const enqueueCode = `
// Added by Marty - Custom CSS
add_action('wp_enqueue_scripts', function() {
    wp_enqueue_style('marty-custom', get_template_directory_uri() . '/custom-marty.css', array(), '1.0.0');
}, 100);
`;
          await this.execCommand(`echo '${enqueueCode.replace(/'/g, "'\\''")}' >> ${functionsPath}`);
        }
      }

      console.log(`[WordPressBuilder] カスタムCSS追加成功`);

      return {
        success: true,
        message: "カスタムCSSを追加しました",
      };
    } catch (error: any) {
      console.error(`[WordPressBuilder] カスタムCSS追加エラー:`, error);
      return {
        success: false,
        message: `カスタムCSSの追加に失敗しました: ${error.message}`,
      };
    }
  }

  /**
   * 【新機能】ページ一覧を取得
   */
  async getPages(
    domain: string
  ): Promise<{ success: boolean; pages: Array<{ id: number; title: string; url: string; status: string }> }> {
    console.log(`[WordPressBuilder] ページ一覧取得`);

    try {
      const wpPath = await this.getActualWordPressPath(domain);
      let wpCliPath = await this.getWpCliPath();
      if (!wpCliPath) {
        await this.installWPCLI();
        wpCliPath = await this.getWpCliPath();
      }
      if (!wpCliPath) {
        throw new Error("WP-CLIが利用できません");
      }

      const result = await this.execCommand(
        `${wpCliPath} post list --post_type=page --format=json --fields=ID,post_title,post_status,guid --path=${wpPath}`
      );

      const pages = JSON.parse(result).map((p: any) => ({
        id: p.ID,
        title: p.post_title,
        url: p.guid,
        status: p.post_status,
      }));

      return {
        success: true,
        pages,
      };
    } catch (error: any) {
      console.error(`[WordPressBuilder] ページ一覧取得エラー:`, error);
      return {
        success: false,
        pages: [],
      };
    }
  }

  /**
   * 【新機能】ページを削除
   */
  async deletePage(
    domain: string,
    pageId: number,
    force: boolean = false
  ): Promise<{ success: boolean; message: string }> {
    console.log(`[WordPressBuilder] ページ削除: ID=${pageId}`);

    try {
      const wpPath = await this.getActualWordPressPath(domain);
      let wpCliPath = await this.getWpCliPath();
      if (!wpCliPath) {
        await this.installWPCLI();
        wpCliPath = await this.getWpCliPath();
      }
      if (!wpCliPath) {
        throw new Error("WP-CLIが利用できません");
      }

      const forceFlag = force ? " --force" : "";
      await this.execCommand(
        `${wpCliPath} post delete ${pageId}${forceFlag} --path=${wpPath}`
      );

      return {
        success: true,
        message: `ページ (ID: ${pageId}) を削除しました`,
      };
    } catch (error: any) {
      console.error(`[WordPressBuilder] ページ削除エラー:`, error);
      return {
        success: false,
        message: `ページの削除に失敗しました: ${error.message}`,
      };
    }
  }

  /**
   * 【新機能】ページ内容を取得
   */
  async getPageContent(
    domain: string,
    pageId: number
  ): Promise<{ success: boolean; title?: string; content?: string; status?: string; url?: string }> {
    console.log(`[WordPressBuilder] ページ内容取得: ID=${pageId}`);

    try {
      const wpPath = await this.getActualWordPressPath(domain);
      let wpCliPath = await this.getWpCliPath();
      if (!wpCliPath) {
        await this.installWPCLI();
        wpCliPath = await this.getWpCliPath();
      }
      if (!wpCliPath) {
        throw new Error("WP-CLIが利用できません");
      }

      const result = await this.execCommand(
        `${wpCliPath} post get ${pageId} --format=json --path=${wpPath}`
      );
      const post = JSON.parse(result);

      return {
        success: true,
        title: post.post_title,
        content: post.post_content,
        status: post.post_status,
        url: post.guid,
      };
    } catch (error: any) {
      console.error(`[WordPressBuilder] ページ内容取得エラー:`, error);
      return {
        success: false,
      };
    }
  }

  /**
   * 【新機能】プラグイン一覧を取得
   */
  async getPlugins(
    domain: string
  ): Promise<{ success: boolean; plugins: Array<{ name: string; status: string; version: string }> }> {
    console.log(`[WordPressBuilder] プラグイン一覧取得`);

    try {
      const wpPath = await this.getActualWordPressPath(domain);
      let wpCliPath = await this.getWpCliPath();
      if (!wpCliPath) {
        await this.installWPCLI();
        wpCliPath = await this.getWpCliPath();
      }
      if (!wpCliPath) {
        throw new Error("WP-CLIが利用できません");
      }

      const result = await this.execCommand(
        `${wpCliPath} plugin list --format=json --path=${wpPath}`
      );
      const plugins = JSON.parse(result).map((p: any) => ({
        name: p.name,
        status: p.status,
        version: p.version,
      }));

      return {
        success: true,
        plugins,
      };
    } catch (error: any) {
      console.error(`[WordPressBuilder] プラグイン一覧取得エラー:`, error);
      return {
        success: false,
        plugins: [],
      };
    }
  }

  /**
   * 【新機能】プラグインを無効化
   */
  async deactivatePlugin(
    domain: string,
    pluginSlug: string
  ): Promise<{ success: boolean; message: string }> {
    console.log(`[WordPressBuilder] プラグイン無効化: ${pluginSlug}`);

    try {
      const wpPath = await this.getActualWordPressPath(domain);
      let wpCliPath = await this.getWpCliPath();
      if (!wpCliPath) {
        await this.installWPCLI();
        wpCliPath = await this.getWpCliPath();
      }
      if (!wpCliPath) {
        throw new Error("WP-CLIが利用できません");
      }

      await this.execCommand(
        `${wpCliPath} plugin deactivate ${pluginSlug} --path=${wpPath}`
      );

      return {
        success: true,
        message: `プラグイン「${pluginSlug}」を無効化しました`,
      };
    } catch (error: any) {
      console.error(`[WordPressBuilder] プラグイン無効化エラー:`, error);
      return {
        success: false,
        message: `プラグインの無効化に失敗しました: ${error.message}`,
      };
    }
  }

  /**
   * 【新機能】プラグインを削除
   */
  async deletePlugin(
    domain: string,
    pluginSlug: string
  ): Promise<{ success: boolean; message: string }> {
    console.log(`[WordPressBuilder] プラグイン削除: ${pluginSlug}`);

    try {
      const wpPath = await this.getActualWordPressPath(domain);
      let wpCliPath = await this.getWpCliPath();
      if (!wpCliPath) {
        await this.installWPCLI();
        wpCliPath = await this.getWpCliPath();
      }
      if (!wpCliPath) {
        throw new Error("WP-CLIが利用できません");
      }

      // まず無効化
      try {
        await this.execCommand(
          `${wpCliPath} plugin deactivate ${pluginSlug} --path=${wpPath}`
        );
      } catch {
        // すでに無効化されている場合は無視
      }

      // 削除
      await this.execCommand(
        `${wpCliPath} plugin delete ${pluginSlug} --path=${wpPath}`
      );

      return {
        success: true,
        message: `プラグイン「${pluginSlug}」を削除しました`,
      };
    } catch (error: any) {
      console.error(`[WordPressBuilder] プラグイン削除エラー:`, error);
      return {
        success: false,
        message: `プラグインの削除に失敗しました: ${error.message}`,
      };
    }
  }

  /**
   * 【新機能】テーマ一覧を取得
   */
  async getThemes(
    domain: string
  ): Promise<{ success: boolean; themes: Array<{ name: string; status: string; version: string }> }> {
    console.log(`[WordPressBuilder] テーマ一覧取得`);

    try {
      const wpPath = await this.getActualWordPressPath(domain);
      let wpCliPath = await this.getWpCliPath();
      if (!wpCliPath) {
        await this.installWPCLI();
        wpCliPath = await this.getWpCliPath();
      }
      if (!wpCliPath) {
        throw new Error("WP-CLIが利用できません");
      }

      const result = await this.execCommand(
        `${wpCliPath} theme list --format=json --path=${wpPath}`
      );
      const themes = JSON.parse(result).map((t: any) => ({
        name: t.name,
        status: t.status,
        version: t.version,
      }));

      return {
        success: true,
        themes,
      };
    } catch (error: any) {
      console.error(`[WordPressBuilder] テーマ一覧取得エラー:`, error);
      return {
        success: false,
        themes: [],
      };
    }
  }

  /**
   * 【新機能】テーマをインストール
   */
  async installTheme(
    domain: string,
    themeSlug: string,
    activate: boolean = false
  ): Promise<{ success: boolean; message: string }> {
    console.log(`[WordPressBuilder] テーマインストール: ${themeSlug}`);

    try {
      const wpPath = await this.getActualWordPressPath(domain);
      let wpCliPath = await this.getWpCliPath();
      if (!wpCliPath) {
        await this.installWPCLI();
        wpCliPath = await this.getWpCliPath();
      }
      if (!wpCliPath) {
        throw new Error("WP-CLIが利用できません");
      }

      const activateFlag = activate ? " --activate" : "";
      await this.execCommand(
        `${wpCliPath} theme install ${themeSlug}${activateFlag} --path=${wpPath}`
      );

      return {
        success: true,
        message: `テーマ「${themeSlug}」をインストールしました${activate ? "（有効化済み）" : ""}`,
      };
    } catch (error: any) {
      console.error(`[WordPressBuilder] テーマインストールエラー:`, error);
      return {
        success: false,
        message: `テーマのインストールに失敗しました: ${error.message}`,
      };
    }
  }

  /**
   * 【新機能】テーマを有効化
   */
  async activateTheme(
    domain: string,
    themeSlug: string
  ): Promise<{ success: boolean; message: string }> {
    console.log(`[WordPressBuilder] テーマ有効化: ${themeSlug}`);

    try {
      const wpPath = await this.getActualWordPressPath(domain);
      let wpCliPath = await this.getWpCliPath();
      if (!wpCliPath) {
        await this.installWPCLI();
        wpCliPath = await this.getWpCliPath();
      }
      if (!wpCliPath) {
        throw new Error("WP-CLIが利用できません");
      }

      await this.execCommand(
        `${wpCliPath} theme activate ${themeSlug} --path=${wpPath}`
      );

      return {
        success: true,
        message: `テーマ「${themeSlug}」を有効化しました`,
      };
    } catch (error: any) {
      console.error(`[WordPressBuilder] テーマ有効化エラー:`, error);
      return {
        success: false,
        message: `テーマの有効化に失敗しました: ${error.message}`,
      };
    }
  }

  /**
   * 【新機能】サイト設定を取得
   */
  async getSiteOptions(
    domain: string
  ): Promise<{ success: boolean; options?: { siteTitle: string; tagline: string; siteUrl: string; adminEmail: string } }> {
    console.log(`[WordPressBuilder] サイト設定取得`);

    try {
      const wpPath = await this.getActualWordPressPath(domain);
      let wpCliPath = await this.getWpCliPath();
      if (!wpCliPath) {
        await this.installWPCLI();
        wpCliPath = await this.getWpCliPath();
      }
      if (!wpCliPath) {
        throw new Error("WP-CLIが利用できません");
      }

      const [siteTitle, tagline, siteUrl, adminEmail] = await Promise.all([
        this.execCommand(`${wpCliPath} option get blogname --path=${wpPath}`),
        this.execCommand(`${wpCliPath} option get blogdescription --path=${wpPath}`),
        this.execCommand(`${wpCliPath} option get siteurl --path=${wpPath}`),
        this.execCommand(`${wpCliPath} option get admin_email --path=${wpPath}`),
      ]);

      return {
        success: true,
        options: {
          siteTitle: siteTitle.trim(),
          tagline: tagline.trim(),
          siteUrl: siteUrl.trim(),
          adminEmail: adminEmail.trim(),
        },
      };
    } catch (error: any) {
      console.error(`[WordPressBuilder] サイト設定取得エラー:`, error);
      return {
        success: false,
      };
    }
  }

  /**
   * 【新機能】サイト設定を更新
   */
  async updateSiteOption(
    domain: string,
    option: string,
    value: string
  ): Promise<{ success: boolean; message: string }> {
    console.log(`[WordPressBuilder] サイト設定更新: ${option}=${value}`);

    // 許可されたオプションのみ更新可能
    const allowedOptions = ["blogname", "blogdescription", "admin_email", "date_format", "time_format", "timezone_string"];
    if (!allowedOptions.includes(option)) {
      return {
        success: false,
        message: `オプション「${option}」の更新は許可されていません`,
      };
    }

    try {
      const wpPath = await this.getActualWordPressPath(domain);
      let wpCliPath = await this.getWpCliPath();
      if (!wpCliPath) {
        await this.installWPCLI();
        wpCliPath = await this.getWpCliPath();
      }
      if (!wpCliPath) {
        throw new Error("WP-CLIが利用できません");
      }

      const escapedValue = value.replace(/'/g, "'\\''");
      await this.execCommand(
        `${wpCliPath} option update ${option} '${escapedValue}' --path=${wpPath}`
      );

      return {
        success: true,
        message: `サイト設定「${option}」を更新しました`,
      };
    } catch (error: any) {
      console.error(`[WordPressBuilder] サイト設定更新エラー:`, error);
      return {
        success: false,
        message: `サイト設定の更新に失敗しました: ${error.message}`,
      };
    }
  }

  /**
   * 【新機能】キャッシュをフラッシュ
   */
  async flushCache(domain: string): Promise<{ success: boolean; message: string }> {
    console.log(`[WordPressBuilder] キャッシュフラッシュ`);

    try {
      const wpPath = await this.getActualWordPressPath(domain);
      let wpCliPath = await this.getWpCliPath();
      if (!wpCliPath) {
        await this.installWPCLI();
        wpCliPath = await this.getWpCliPath();
      }
      if (!wpCliPath) {
        throw new Error("WP-CLIが利用できません");
      }

      // WPキャッシュとリライトルールをフラッシュ
      await this.execCommand(`${wpCliPath} cache flush --path=${wpPath}`);
      await this.execCommand(`${wpCliPath} rewrite flush --path=${wpPath}`);

      return {
        success: true,
        message: "キャッシュをフラッシュしました",
      };
    } catch (error: any) {
      console.error(`[WordPressBuilder] キャッシュフラッシュエラー:`, error);
      return {
        success: false,
        message: `キャッシュのフラッシュに失敗しました: ${error.message}`,
      };
    }
  }

  /**
   * 【新機能】ブログ投稿を作成
   */
  async createPost(
    domain: string,
    title: string,
    content: string,
    status: "publish" | "draft" = "draft",
    categories?: string[],
    tags?: string[]
  ): Promise<{ success: boolean; message: string; postId?: number; postUrl?: string }> {
    console.log(`[WordPressBuilder] ブログ投稿作成: ${title}`);

    try {
      const wpPath = await this.getActualWordPressPath(domain);
      let wpCliPath = await this.getWpCliPath();
      if (!wpCliPath) {
        await this.installWPCLI();
        wpCliPath = await this.getWpCliPath();
      }
      if (!wpCliPath) {
        throw new Error("WP-CLIが利用できません");
      }

      const escapedContent = content.replace(/'/g, "'\\''");
      const escapedTitle = title.replace(/'/g, "'\\''");

      let command = `${wpCliPath} post create --post_type=post --post_title='${escapedTitle}' --post_content='${escapedContent}' --post_status=${status} --porcelain --path=${wpPath}`;

      const result = await this.execCommand(command);
      const postId = parseInt(result.trim(), 10);

      if (isNaN(postId)) {
        throw new Error(`投稿IDの取得に失敗: ${result}`);
      }

      // カテゴリとタグを設定
      if (categories && categories.length > 0) {
        try {
          await this.execCommand(
            `${wpCliPath} post term set ${postId} category ${categories.join(" ")} --path=${wpPath}`
          );
        } catch {
          // カテゴリ設定失敗は無視
        }
      }

      if (tags && tags.length > 0) {
        try {
          await this.execCommand(
            `${wpCliPath} post term set ${postId} post_tag ${tags.join(" ")} --path=${wpPath}`
          );
        } catch {
          // タグ設定失敗は無視
        }
      }

      // URL取得
      let postUrl = "";
      try {
        const urlResult = await this.execCommand(
          `${wpCliPath} post get ${postId} --field=link --path=${wpPath}`
        );
        postUrl = urlResult.trim();
      } catch {
        // URL取得失敗は無視
      }

      return {
        success: true,
        message: `ブログ投稿「${title}」を作成しました`,
        postId,
        postUrl,
      };
    } catch (error: any) {
      console.error(`[WordPressBuilder] ブログ投稿作成エラー:`, error);
      return {
        success: false,
        message: `ブログ投稿の作成に失敗しました: ${error.message}`,
      };
    }
  }

  /**
   * 【新機能】投稿一覧を取得
   */
  async getPosts(
    domain: string,
    postType: "post" | "page" = "post",
    limit: number = 20
  ): Promise<{ success: boolean; posts: Array<{ id: number; title: string; status: string; date: string; url: string }> }> {
    console.log(`[WordPressBuilder] 投稿一覧取得: type=${postType}`);

    try {
      const wpPath = await this.getActualWordPressPath(domain);
      let wpCliPath = await this.getWpCliPath();
      if (!wpCliPath) {
        await this.installWPCLI();
        wpCliPath = await this.getWpCliPath();
      }
      if (!wpCliPath) {
        throw new Error("WP-CLIが利用できません");
      }

      const result = await this.execCommand(
        `${wpCliPath} post list --post_type=${postType} --posts_per_page=${limit} --format=json --fields=ID,post_title,post_status,post_date,guid --path=${wpPath}`
      );
      const posts = JSON.parse(result).map((p: any) => ({
        id: p.ID,
        title: p.post_title,
        status: p.post_status,
        date: p.post_date,
        url: p.guid,
      }));

      return {
        success: true,
        posts,
      };
    } catch (error: any) {
      console.error(`[WordPressBuilder] 投稿一覧取得エラー:`, error);
      return {
        success: false,
        posts: [],
      };
    }
  }

  /**
   * 【新機能】WP-CLIコマンドを実行
   */
  async executeWpCliCommand(domain: string, command: string): Promise<{ success: boolean; output: string }> {
    console.log(`[WordPressBuilder] WP-CLIコマンド実行: ${command}`);

    try {
      const wpPath = await this.getActualWordPressPath(domain);
      // 利用可能なWP-CLIパスを取得
      let wpCliPath = await this.getWpCliPath();
      if (!wpCliPath) {
        console.log("[WordPressBuilder] WP-CLIが見つかりません。インストールします...");
        await this.installWPCLI();
        wpCliPath = await this.getWpCliPath();
      }
      if (!wpCliPath) {
        throw new Error("WP-CLIが利用できません");
      }

      // --pathオプションをサポートするコマンドかチェックし、必要に応じて追加
      // ほとんどのWP-CLIコマンドは--pathをサポート
      const fullCommand = command.includes('--path=')
        ? `${wpCliPath} ${command}`
        : `${wpCliPath} ${command} --path=${wpPath}`;

      const result = await this.execCommand(fullCommand);
      console.log(`[WordPressBuilder] WP-CLI結果:`, result);

      return {
        success: true,
        output: result.trim(),
      };
    } catch (error: any) {
      console.error(`[WordPressBuilder] WP-CLIエラー:`, error);
      return {
        success: false,
        output: error.message,
      };
    }
  }

  /**
   * WordPressをインストール
   */
  async installWordPress(config: WordPressConfig): Promise<void> {
    console.log("[WordPressBuilder] WordPressをインストール中...");

    const wpPath = await this.getWordPressPath(config.domain);
    console.log(`[WordPressBuilder] WordPressパス: ${wpPath} (provider: ${this.serverProvider})`);

    // WP-CLIパスを取得
    let wpCliPath = await this.getWpCliPath();
    if (!wpCliPath) {
      await this.installWPCLI();
      wpCliPath = await this.getWpCliPath();
    }
    if (!wpCliPath) {
      throw new Error("WP-CLIが利用できません");
    }

    // ディレクトリ作成
    await this.execCommand(`mkdir -p ${wpPath}`);

    // WordPress本体をダウンロード
    await this.execCommand(
      `${wpCliPath} core download --path=${wpPath} --locale=ja`
    );

    // wp-config.php を生成（データベース情報は後で設定）
    // 注: XserverなどではMySQLデータベースを事前に作成しておく必要がある
    // ここではダミーの設定を入れ、後で手動設定を促す
    await this.execCommand(
      `${wpCliPath} config create --path=${wpPath} --dbname=dummy --dbuser=dummy --dbpass=dummy --skip-check`
    );

    // WordPressをインストール
    await this.execCommand(
      `${wpCliPath} core install --path=${wpPath} --url=${config.domain} --title="${config.siteTitle}" --admin_user=${config.adminUser} --admin_password="${config.adminPassword}" --admin_email=${config.adminEmail}`
    );

    console.log("[WordPressBuilder] WordPressインストール完了");
  }

  /**
   * Lightningテーマをインストール
   */
  async installLightningTheme(wpPath: string, wpCliPath: string): Promise<void> {
    console.log("[WordPressBuilder] Lightningテーマをインストール中...");

    // Lightningテーマをインストール
    await this.execCommand(
      `${wpCliPath} theme install lightning --path=${wpPath} --activate`
    );

    console.log("[WordPressBuilder] Lightningテーマインストール完了");
  }

  /**
   * 必須プラグインをインストール
   */
  async installPlugins(wpPath: string, wpCliPath: string): Promise<void> {
    console.log("[WordPressBuilder] プラグインをインストール中...");

    const plugins = [
      "vk-all-in-one-expansion-unit",
      "vk-blocks",
      "contact-form-7", // お問い合わせフォーム用
    ];

    for (const plugin of plugins) {
      await this.execCommand(
        `${wpCliPath} plugin install ${plugin} --path=${wpPath} --activate`
      );
      console.log(`[WordPressBuilder] ${plugin} インストール完了`);
    }

    console.log("[WordPressBuilder] 全プラグインインストール完了");
  }

  /**
   * ブログ機能を設定（固定ページ作成 + 投稿ページ設定）
   */
  async setupBlogFunctionality(wpPath: string, wpCliPath: string): Promise<void> {
    console.log("[WordPressBuilder] ブログ機能を設定中...");

    // 固定ページ「ホーム」を作成
    const homePageResult = await this.execCommand(
      `${wpCliPath} post create --path=${wpPath} --post_type=page --post_title="ホーム" --post_status=publish --porcelain`
    );
    const homePageId = homePageResult.trim();

    // 固定ページ「ブログ」を作成
    const blogPageResult = await this.execCommand(
      `${wpCliPath} post create --path=${wpPath} --post_type=page --post_title="ブログ" --post_status=publish --porcelain`
    );
    const blogPageId = blogPageResult.trim();

    // フロントページを「ホーム」に設定
    await this.execCommand(
      `${wpCliPath} option update show_on_front page --path=${wpPath}`
    );
    await this.execCommand(
      `${wpCliPath} option update page_on_front ${homePageId} --path=${wpPath}`
    );

    // 投稿ページを「ブログ」に設定
    await this.execCommand(
      `${wpCliPath} option update page_for_posts ${blogPageId} --path=${wpPath}`
    );

    console.log("[WordPressBuilder] ブログ機能設定完了");
  }

  /**
   * シェルコマンド用にコンテンツを安全にエスケープ
   */
  private escapeForShell(content: string): string {
    // シングルクォートでラップし、内部のシングルクォートをエスケープ
    return content
      .replace(/'/g, "'\\''")  // シングルクォートをエスケープ
      .replace(/\n/g, ' ');    // 改行をスペースに
  }

  /**
   * WP-CLIでページを作成するヘルパー関数（内部用）
   */
  private async _createPageInternal(wpPath: string, wpCliPath: string, title: string, content: string): Promise<void> {
    const escapedContent = this.escapeForShell(content);
    const escapedTitle = this.escapeForShell(title);

    // シングルクォートでラップしてコマンドを実行
    const command = `${wpCliPath} post create --path=${wpPath} --post_type=page --post_title='${escapedTitle}' --post_content='${escapedContent}' --post_status=publish --porcelain`;

    await this.execCommand(command);
    console.log(`[WordPressBuilder] 「${title}」ページ作成完了`);
  }

  /**
   * ビジネスに必要な固定ページを作成
   * お問い合わせ、会社概要、プライバシーポリシー、利用規約など
   */
  async createEssentialPages(wpPath: string, wpCliPath: string): Promise<void> {
    console.log("[WordPressBuilder] ビジネスページを作成中...");

    // 作成するページの定義
    const pages = [
      {
        title: "お問い合わせ",
        content: `<!-- wp:heading -->
<h2>お問い合わせ</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>以下のフォームからお気軽にお問い合わせください。</p>
<!-- /wp:paragraph -->

<!-- wp:shortcode -->
[contact-form-7 id="1" title="お問い合わせフォーム"]
<!-- /wp:shortcode -->`,
      },
      {
        title: "会社概要",
        content: `<!-- wp:heading -->
<h2>会社概要</h2>
<!-- /wp:heading -->

<!-- wp:table -->
<figure class="wp-block-table"><table><tbody>
<tr><th>会社名</th><td>株式会社サンプル</td></tr>
<tr><th>所在地</th><td>〒000-0000 東京都〇〇区〇〇</td></tr>
<tr><th>設立</th><td>20XX年X月</td></tr>
<tr><th>代表者</th><td>代表取締役 〇〇 〇〇</td></tr>
<tr><th>事業内容</th><td>Webサービスの企画・開発・運営</td></tr>
<tr><th>電話番号</th><td>03-XXXX-XXXX</td></tr>
<tr><th>メール</th><td>info@example.com</td></tr>
</tbody></table></figure>
<!-- /wp:table -->

<!-- wp:paragraph {"className":"edit-notice"} -->
<p class="edit-notice">※ こちらの内容は、WordPressの管理画面から編集してご利用ください。</p>
<!-- /wp:paragraph -->`,
      },
      {
        title: "プライバシーポリシー",
        content: `<!-- wp:heading -->
<h2>プライバシーポリシー</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>当サイト（以下「当サイト」）は、お客様の個人情報保護の重要性について認識し、個人情報の保護に関する法律（個人情報保護法）を遵守すると共に、以下のプライバシーポリシーに従い、適切な取扱い及び保護に努めます。</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"level":3} -->
<h3>1. 個人情報の定義</h3>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>個人情報とは、個人に関する情報であり、氏名、生年月日、住所、電話番号、メールアドレスなど、特定の個人を識別することができる情報をいいます。</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"level":3} -->
<h3>2. 個人情報の収集方法</h3>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>当サイトでは、お問い合わせフォーム等を通じて個人情報を収集する場合があります。</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"level":3} -->
<h3>3. 個人情報の利用目的</h3>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>収集した個人情報は、以下の目的で利用いたします。</p>
<!-- /wp:paragraph -->

<!-- wp:list -->
<ul><li>お問い合わせへの回答</li><li>サービスの提供</li><li>サービス改善のための統計分析</li></ul>
<!-- /wp:list -->

<!-- wp:heading {"level":3} -->
<h3>4. 個人情報の第三者提供</h3>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>当サイトは、法令に基づく場合を除き、お客様の同意なく個人情報を第三者に提供することはありません。</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"level":3} -->
<h3>5. お問い合わせ</h3>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>個人情報の取扱いに関するお問い合わせは、お問い合わせフォームよりご連絡ください。</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph {"className":"edit-notice"} -->
<p class="edit-notice">※ こちらの内容は、WordPressの管理画面から編集してご利用ください。</p>
<!-- /wp:paragraph -->`,
      },
      {
        title: "利用規約",
        content: `<!-- wp:heading -->
<h2>利用規約</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>本ウェブサイト（以下「当サイト」）をご利用いただくにあたり、以下の利用規約をご確認ください。当サイトを利用された場合、本規約に同意したものとみなします。</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"level":3} -->
<h3>第1条（適用範囲）</h3>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>本規約は、当サイトが提供するすべてのサービス（以下「本サービス」）に適用されます。</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"level":3} -->
<h3>第2条（禁止事項）</h3>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。</p>
<!-- /wp:paragraph -->

<!-- wp:list -->
<ul><li>法令または公序良俗に違反する行為</li><li>犯罪行為に関連する行為</li><li>当サイトの運営を妨害する行為</li><li>他のユーザーに迷惑をかける行為</li><li>不正アクセス行為</li></ul>
<!-- /wp:list -->

<!-- wp:heading {"level":3} -->
<h3>第3条（免責事項）</h3>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>当サイトは、本サービスの内容について、正確性、完全性、有用性等について保証するものではありません。</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"level":3} -->
<h3>第4条（規約の変更）</h3>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>当サイトは、必要に応じて本規約を変更することができるものとします。</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph {"className":"edit-notice"} -->
<p class="edit-notice">※ こちらの内容は、WordPressの管理画面から編集してご利用ください。</p>
<!-- /wp:paragraph -->`,
      },
      {
        title: "サービス紹介",
        content: `<!-- wp:heading -->
<h2>サービス紹介</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>私たちが提供するサービスをご紹介します。</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"level":3} -->
<h3>サービス1</h3>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>サービスの説明がここに入ります。お客様にどのような価値を提供できるかを具体的に記載してください。</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"level":3} -->
<h3>サービス2</h3>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>サービスの説明がここに入ります。料金プランや特徴を分かりやすく説明してください。</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"level":3} -->
<h3>サービス3</h3>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>サービスの説明がここに入ります。導入事例や実績があれば追記してください。</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph {"className":"edit-notice"} -->
<p class="edit-notice">※ こちらの内容は、WordPressの管理画面から編集してご利用ください。</p>
<!-- /wp:paragraph -->`,
      },
      {
        title: "アクセス",
        content: `<!-- wp:heading -->
<h2>アクセス</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>当店・オフィスへのアクセス方法をご案内します。</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"level":3} -->
<h3>所在地</h3>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>〒000-0000<br>東京都〇〇区〇〇 1-2-3 〇〇ビル 5F</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"level":3} -->
<h3>電車でお越しの場合</h3>
<!-- /wp:heading -->

<!-- wp:list -->
<ul><li>〇〇線「〇〇駅」徒歩5分</li><li>〇〇線「〇〇駅」徒歩8分</li></ul>
<!-- /wp:list -->

<!-- wp:heading {"level":3} -->
<h3>営業時間</h3>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>平日 9:00 〜 18:00<br>土日祝 休業</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph {"className":"edit-notice"} -->
<p class="edit-notice">※ こちらの内容は、WordPressの管理画面から編集してご利用ください。Google Mapsの埋め込みコードを追加することもできます。</p>
<!-- /wp:paragraph -->`,
      },
    ];

    // 各ページを順番に作成
    for (const page of pages) {
      try {
        await this._createPageInternal(wpPath, wpCliPath, page.title, page.content);
      } catch (error) {
        console.error(`[WordPressBuilder] 「${page.title}」ページ作成エラー:`, error);
        // エラーが発生しても他のページの作成を続行
      }
    }

    console.log("[WordPressBuilder] 全ビジネスページ作成完了");
  }

  /**
   * WordPress構築の全工程を実行
   */
  async build(config: WordPressConfig): Promise<void> {
    try {
      // 1. SSH接続
      await this.updateProgress(1, "サーバーに接続中...", 5);
      await this.connect();

      // 2. WP-CLIインストール
      await this.updateProgress(2, "WP-CLIをインストール中...", 15);
      await this.installWPCLI();

      // WP-CLIパスを取得
      const wpCliPath = await this.getWpCliPath();
      if (!wpCliPath) {
        throw new Error("WP-CLIのインストールに失敗しました");
      }

      // 3. WordPressインストール
      await this.updateProgress(3, "WordPressをダウンロード中...", 30);
      await this.installWordPress(config);

      const wpPath = await this.getWordPressPath(config.domain);

      // 4. Lightningテーマインストール
      await this.updateProgress(4, "Lightningテーマをインストール中...", 60);
      await this.installLightningTheme(wpPath, wpCliPath);

      // 5. プラグインインストール
      await this.updateProgress(5, "プラグインをインストール中...", 75);
      await this.installPlugins(wpPath, wpCliPath);

      // 6. ブログ機能設定
      await this.updateProgress(6, "ブログ機能を設定中...", 80);
      await this.setupBlogFunctionality(wpPath, wpCliPath);

      // 7. ビジネスページ作成
      await this.updateProgress(7, "ビジネスページを作成中...", 90);
      await this.createEssentialPages(wpPath, wpCliPath);

      // 完了
      await this.updateProgress(8, "構築完了！", 100, true);
      console.log("[WordPressBuilder] 構築完了！");
    } catch (error) {
      console.error("[WordPressBuilder] 構築エラー:", error);
      await this.updateProgress(0, `エラー: ${error}`, 0, false);
      throw error;
    } finally {
      this.disconnect();
    }
  }

  // ============================================
  // メニュー管理機能
  // ============================================

  /**
   * 【新機能】メニュー一覧を取得
   */
  async getMenus(
    domain: string
  ): Promise<{ success: boolean; menus: Array<{ id: number; name: string; slug: string; count: number }> }> {
    console.log(`[WordPressBuilder] メニュー一覧取得`);

    try {
      const wpPath = await this.getActualWordPressPath(domain);
      let wpCliPath = await this.getWpCliPath();
      if (!wpCliPath) {
        await this.installWPCLI();
        wpCliPath = await this.getWpCliPath();
      }
      if (!wpCliPath) {
        throw new Error("WP-CLIが利用できません");
      }

      const result = await this.execCommand(
        `${wpCliPath} menu list --format=json --path=${wpPath}`
      );
      const menus = JSON.parse(result).map((m: any) => ({
        id: m.term_id,
        name: m.name,
        slug: m.slug,
        count: m.count,
      }));

      return {
        success: true,
        menus,
      };
    } catch (error: any) {
      console.error(`[WordPressBuilder] メニュー一覧取得エラー:`, error);
      return {
        success: false,
        menus: [],
      };
    }
  }

  /**
   * 【新機能】メニューを作成
   */
  async createMenu(
    domain: string,
    menuName: string
  ): Promise<{ success: boolean; message: string; menuId?: number }> {
    console.log(`[WordPressBuilder] メニュー作成: ${menuName}`);

    try {
      const wpPath = await this.getActualWordPressPath(domain);
      let wpCliPath = await this.getWpCliPath();
      if (!wpCliPath) {
        await this.installWPCLI();
        wpCliPath = await this.getWpCliPath();
      }
      if (!wpCliPath) {
        throw new Error("WP-CLIが利用できません");
      }

      const escapedName = menuName.replace(/'/g, "'\\''");
      const result = await this.execCommand(
        `${wpCliPath} menu create '${escapedName}' --porcelain --path=${wpPath}`
      );
      const menuId = parseInt(result.trim(), 10);

      return {
        success: true,
        message: `メニュー「${menuName}」を作成しました`,
        menuId: isNaN(menuId) ? undefined : menuId,
      };
    } catch (error: any) {
      console.error(`[WordPressBuilder] メニュー作成エラー:`, error);
      return {
        success: false,
        message: `メニューの作成に失敗しました: ${error.message}`,
      };
    }
  }

  /**
   * 【新機能】メニューを削除
   */
  async deleteMenu(
    domain: string,
    menuIdOrSlug: string | number
  ): Promise<{ success: boolean; message: string }> {
    console.log(`[WordPressBuilder] メニュー削除: ${menuIdOrSlug}`);

    try {
      const wpPath = await this.getActualWordPressPath(domain);
      let wpCliPath = await this.getWpCliPath();
      if (!wpCliPath) {
        await this.installWPCLI();
        wpCliPath = await this.getWpCliPath();
      }
      if (!wpCliPath) {
        throw new Error("WP-CLIが利用できません");
      }

      await this.execCommand(
        `${wpCliPath} menu delete ${menuIdOrSlug} --path=${wpPath}`
      );

      return {
        success: true,
        message: `メニューを削除しました`,
      };
    } catch (error: any) {
      console.error(`[WordPressBuilder] メニュー削除エラー:`, error);
      return {
        success: false,
        message: `メニューの削除に失敗しました: ${error.message}`,
      };
    }
  }

  /**
   * 【新機能】メニュー項目を追加
   */
  async addMenuItem(
    domain: string,
    menuIdOrSlug: string | number,
    itemType: "post" | "page" | "custom" | "category" | "tag",
    options: {
      title: string;
      url?: string;        // customタイプの場合必須
      objectId?: number;   // post/page/category/tagの場合必須
      parent?: number;     // 親メニュー項目ID
      position?: number;
    }
  ): Promise<{ success: boolean; message: string; itemId?: number }> {
    console.log(`[WordPressBuilder] メニュー項目追加: ${options.title}`);

    try {
      const wpPath = await this.getActualWordPressPath(domain);
      let wpCliPath = await this.getWpCliPath();
      if (!wpCliPath) {
        await this.installWPCLI();
        wpCliPath = await this.getWpCliPath();
      }
      if (!wpCliPath) {
        throw new Error("WP-CLIが利用できません");
      }

      let command = `${wpCliPath} menu item add-${itemType} ${menuIdOrSlug}`;

      if (itemType === "custom") {
        if (!options.url) {
          throw new Error("カスタムリンクにはURLが必要です");
        }
        const escapedUrl = options.url.replace(/'/g, "'\\''");
        const escapedTitle = options.title.replace(/'/g, "'\\''");
        command += ` '${escapedUrl}' --title='${escapedTitle}'`;
      } else {
        if (!options.objectId) {
          throw new Error(`${itemType}タイプにはobjectIdが必要です`);
        }
        command += ` ${options.objectId}`;
        if (options.title) {
          const escapedTitle = options.title.replace(/'/g, "'\\''");
          command += ` --title='${escapedTitle}'`;
        }
      }

      if (options.parent) {
        command += ` --parent-id=${options.parent}`;
      }
      if (options.position !== undefined) {
        command += ` --position=${options.position}`;
      }

      command += ` --porcelain --path=${wpPath}`;

      const result = await this.execCommand(command);
      const itemId = parseInt(result.trim(), 10);

      return {
        success: true,
        message: `メニュー項目「${options.title}」を追加しました`,
        itemId: isNaN(itemId) ? undefined : itemId,
      };
    } catch (error: any) {
      console.error(`[WordPressBuilder] メニュー項目追加エラー:`, error);
      return {
        success: false,
        message: `メニュー項目の追加に失敗しました: ${error.message}`,
      };
    }
  }

  /**
   * 【新機能】メニュー項目一覧を取得
   */
  async getMenuItems(
    domain: string,
    menuIdOrSlug: string | number
  ): Promise<{ success: boolean; items: Array<{ id: number; title: string; type: string; url: string; parent: number }> }> {
    console.log(`[WordPressBuilder] メニュー項目一覧取得: ${menuIdOrSlug}`);

    try {
      const wpPath = await this.getActualWordPressPath(domain);
      let wpCliPath = await this.getWpCliPath();
      if (!wpCliPath) {
        await this.installWPCLI();
        wpCliPath = await this.getWpCliPath();
      }
      if (!wpCliPath) {
        throw new Error("WP-CLIが利用できません");
      }

      const result = await this.execCommand(
        `${wpCliPath} menu item list ${menuIdOrSlug} --format=json --path=${wpPath}`
      );
      const items = JSON.parse(result).map((item: any) => ({
        id: item.db_id,
        title: item.title,
        type: item.type,
        url: item.link,
        parent: item.menu_item_parent,
      }));

      return {
        success: true,
        items,
      };
    } catch (error: any) {
      console.error(`[WordPressBuilder] メニュー項目一覧取得エラー:`, error);
      return {
        success: false,
        items: [],
      };
    }
  }

  /**
   * 【新機能】メニュー項目を削除
   */
  async deleteMenuItem(
    domain: string,
    itemId: number
  ): Promise<{ success: boolean; message: string }> {
    console.log(`[WordPressBuilder] メニュー項目削除: ${itemId}`);

    try {
      const wpPath = await this.getActualWordPressPath(domain);
      let wpCliPath = await this.getWpCliPath();
      if (!wpCliPath) {
        await this.installWPCLI();
        wpCliPath = await this.getWpCliPath();
      }
      if (!wpCliPath) {
        throw new Error("WP-CLIが利用できません");
      }

      await this.execCommand(
        `${wpCliPath} menu item delete ${itemId} --path=${wpPath}`
      );

      return {
        success: true,
        message: `メニュー項目を削除しました`,
      };
    } catch (error: any) {
      console.error(`[WordPressBuilder] メニュー項目削除エラー:`, error);
      return {
        success: false,
        message: `メニュー項目の削除に失敗しました: ${error.message}`,
      };
    }
  }

  /**
   * 【新機能】メニューをロケーションに割り当て
   */
  async assignMenuToLocation(
    domain: string,
    menuIdOrSlug: string | number,
    location: string
  ): Promise<{ success: boolean; message: string }> {
    console.log(`[WordPressBuilder] メニュー割り当て: ${menuIdOrSlug} → ${location}`);

    try {
      const wpPath = await this.getActualWordPressPath(domain);
      let wpCliPath = await this.getWpCliPath();
      if (!wpCliPath) {
        await this.installWPCLI();
        wpCliPath = await this.getWpCliPath();
      }
      if (!wpCliPath) {
        throw new Error("WP-CLIが利用できません");
      }

      await this.execCommand(
        `${wpCliPath} menu location assign ${menuIdOrSlug} ${location} --path=${wpPath}`
      );

      return {
        success: true,
        message: `メニューをロケーション「${location}」に割り当てました`,
      };
    } catch (error: any) {
      console.error(`[WordPressBuilder] メニュー割り当てエラー:`, error);
      return {
        success: false,
        message: `メニューの割り当てに失敗しました: ${error.message}`,
      };
    }
  }

  /**
   * 【新機能】メニューロケーション一覧を取得
   */
  async getMenuLocations(
    domain: string
  ): Promise<{ success: boolean; locations: Array<{ location: string; menu: string }> }> {
    console.log(`[WordPressBuilder] メニューロケーション一覧取得`);

    try {
      const wpPath = await this.getActualWordPressPath(domain);
      let wpCliPath = await this.getWpCliPath();
      if (!wpCliPath) {
        await this.installWPCLI();
        wpCliPath = await this.getWpCliPath();
      }
      if (!wpCliPath) {
        throw new Error("WP-CLIが利用できません");
      }

      const result = await this.execCommand(
        `${wpCliPath} menu location list --format=json --path=${wpPath}`
      );
      const locations = JSON.parse(result).map((loc: any) => ({
        location: loc.location,
        menu: loc.menu || "",
      }));

      return {
        success: true,
        locations,
      };
    } catch (error: any) {
      console.error(`[WordPressBuilder] メニューロケーション一覧取得エラー:`, error);
      return {
        success: false,
        locations: [],
      };
    }
  }

  // ============================================
  // ウィジェット管理機能
  // ============================================

  /**
   * 【新機能】サイドバー（ウィジェットエリア）一覧を取得
   */
  async getSidebars(
    domain: string
  ): Promise<{ success: boolean; sidebars: Array<{ id: string; name: string; description: string }> }> {
    console.log(`[WordPressBuilder] サイドバー一覧取得`);

    try {
      const wpPath = await this.getActualWordPressPath(domain);
      let wpCliPath = await this.getWpCliPath();
      if (!wpCliPath) {
        await this.installWPCLI();
        wpCliPath = await this.getWpCliPath();
      }
      if (!wpCliPath) {
        throw new Error("WP-CLIが利用できません");
      }

      const result = await this.execCommand(
        `${wpCliPath} sidebar list --format=json --path=${wpPath}`
      );
      const sidebars = JSON.parse(result).map((s: any) => ({
        id: s.id,
        name: s.name,
        description: s.description || "",
      }));

      return {
        success: true,
        sidebars,
      };
    } catch (error: any) {
      console.error(`[WordPressBuilder] サイドバー一覧取得エラー:`, error);
      return {
        success: false,
        sidebars: [],
      };
    }
  }

  /**
   * 【新機能】ウィジェット一覧を取得
   */
  async getWidgets(
    domain: string,
    sidebarId?: string
  ): Promise<{ success: boolean; widgets: Array<{ id: string; name: string; sidebar: string; position: number }> }> {
    console.log(`[WordPressBuilder] ウィジェット一覧取得`);

    try {
      const wpPath = await this.getActualWordPressPath(domain);
      let wpCliPath = await this.getWpCliPath();
      if (!wpCliPath) {
        await this.installWPCLI();
        wpCliPath = await this.getWpCliPath();
      }
      if (!wpCliPath) {
        throw new Error("WP-CLIが利用できません");
      }

      let command = `${wpCliPath} widget list`;
      if (sidebarId) {
        command += ` ${sidebarId}`;
      } else {
        // 全サイドバーを取得して各ウィジェットを取得
        const sidebarsResult = await this.getSidebars(domain);
        if (!sidebarsResult.success || sidebarsResult.sidebars.length === 0) {
          return { success: true, widgets: [] };
        }
        // 最初のサイドバーだけ取得（全体取得は複雑なため）
        command += ` ${sidebarsResult.sidebars[0].id}`;
      }
      command += ` --format=json --path=${wpPath}`;

      const result = await this.execCommand(command);
      const widgets = JSON.parse(result).map((w: any) => ({
        id: w.id,
        name: w.name,
        sidebar: sidebarId || "",
        position: w.position,
      }));

      return {
        success: true,
        widgets,
      };
    } catch (error: any) {
      console.error(`[WordPressBuilder] ウィジェット一覧取得エラー:`, error);
      return {
        success: false,
        widgets: [],
      };
    }
  }

  /**
   * 【新機能】ウィジェットを追加
   */
  async addWidget(
    domain: string,
    sidebarId: string,
    widgetType: string,
    options?: Record<string, string | number>
  ): Promise<{ success: boolean; message: string; widgetId?: string }> {
    console.log(`[WordPressBuilder] ウィジェット追加: ${widgetType} → ${sidebarId}`);

    try {
      const wpPath = await this.getActualWordPressPath(domain);
      let wpCliPath = await this.getWpCliPath();
      if (!wpCliPath) {
        await this.installWPCLI();
        wpCliPath = await this.getWpCliPath();
      }
      if (!wpCliPath) {
        throw new Error("WP-CLIが利用できません");
      }

      let command = `${wpCliPath} widget add ${widgetType} ${sidebarId}`;

      if (options) {
        for (const [key, value] of Object.entries(options)) {
          const escapedValue = String(value).replace(/'/g, "'\\''");
          command += ` --${key}='${escapedValue}'`;
        }
      }

      command += ` --path=${wpPath}`;

      const result = await this.execCommand(command);

      return {
        success: true,
        message: `ウィジェット「${widgetType}」を追加しました`,
        widgetId: result.trim() || undefined,
      };
    } catch (error: any) {
      console.error(`[WordPressBuilder] ウィジェット追加エラー:`, error);
      return {
        success: false,
        message: `ウィジェットの追加に失敗しました: ${error.message}`,
      };
    }
  }

  /**
   * 【新機能】ウィジェットを削除
   */
  async deleteWidget(
    domain: string,
    widgetId: string
  ): Promise<{ success: boolean; message: string }> {
    console.log(`[WordPressBuilder] ウィジェット削除: ${widgetId}`);

    try {
      const wpPath = await this.getActualWordPressPath(domain);
      let wpCliPath = await this.getWpCliPath();
      if (!wpCliPath) {
        await this.installWPCLI();
        wpCliPath = await this.getWpCliPath();
      }
      if (!wpCliPath) {
        throw new Error("WP-CLIが利用できません");
      }

      await this.execCommand(
        `${wpCliPath} widget delete ${widgetId} --path=${wpPath}`
      );

      return {
        success: true,
        message: `ウィジェットを削除しました`,
      };
    } catch (error: any) {
      console.error(`[WordPressBuilder] ウィジェット削除エラー:`, error);
      return {
        success: false,
        message: `ウィジェットの削除に失敗しました: ${error.message}`,
      };
    }
  }

  // ============================================
  // メディア管理機能
  // ============================================

  /**
   * 【新機能】URLから画像をインポート
   */
  async importMediaFromUrl(
    domain: string,
    imageUrl: string,
    options?: {
      title?: string;
      alt?: string;
      caption?: string;
    }
  ): Promise<{ success: boolean; message: string; attachmentId?: number; url?: string }> {
    console.log(`[WordPressBuilder] メディアインポート: ${imageUrl}`);

    try {
      const wpPath = await this.getActualWordPressPath(domain);
      let wpCliPath = await this.getWpCliPath();
      if (!wpCliPath) {
        await this.installWPCLI();
        wpCliPath = await this.getWpCliPath();
      }
      if (!wpCliPath) {
        throw new Error("WP-CLIが利用できません");
      }

      const escapedUrl = imageUrl.replace(/'/g, "'\\''");
      let command = `${wpCliPath} media import '${escapedUrl}' --porcelain`;

      if (options?.title) {
        const escapedTitle = options.title.replace(/'/g, "'\\''");
        command += ` --title='${escapedTitle}'`;
      }
      if (options?.alt) {
        const escapedAlt = options.alt.replace(/'/g, "'\\''");
        command += ` --alt='${escapedAlt}'`;
      }
      if (options?.caption) {
        const escapedCaption = options.caption.replace(/'/g, "'\\''");
        command += ` --caption='${escapedCaption}'`;
      }

      command += ` --path=${wpPath}`;

      const result = await this.execCommand(command);
      const attachmentId = parseInt(result.trim(), 10);

      // アップロードされた画像のURLを取得
      let uploadedUrl = "";
      if (!isNaN(attachmentId)) {
        try {
          const urlResult = await this.execCommand(
            `${wpCliPath} post get ${attachmentId} --field=guid --path=${wpPath}`
          );
          uploadedUrl = urlResult.trim();
        } catch {
          // URL取得失敗は無視
        }
      }

      return {
        success: true,
        message: `画像をインポートしました`,
        attachmentId: isNaN(attachmentId) ? undefined : attachmentId,
        url: uploadedUrl || undefined,
      };
    } catch (error: any) {
      console.error(`[WordPressBuilder] メディアインポートエラー:`, error);
      return {
        success: false,
        message: `メディアのインポートに失敗しました: ${error.message}`,
      };
    }
  }

  /**
   * 【新機能】メディア一覧を取得
   */
  async getMedia(
    domain: string,
    limit: number = 20
  ): Promise<{ success: boolean; media: Array<{ id: number; title: string; url: string; mimeType: string; date: string }> }> {
    console.log(`[WordPressBuilder] メディア一覧取得`);

    try {
      const wpPath = await this.getActualWordPressPath(domain);
      let wpCliPath = await this.getWpCliPath();
      if (!wpCliPath) {
        await this.installWPCLI();
        wpCliPath = await this.getWpCliPath();
      }
      if (!wpCliPath) {
        throw new Error("WP-CLIが利用できません");
      }

      const result = await this.execCommand(
        `${wpCliPath} post list --post_type=attachment --posts_per_page=${limit} --format=json --fields=ID,post_title,guid,post_mime_type,post_date --path=${wpPath}`
      );
      const media = JSON.parse(result).map((m: any) => ({
        id: m.ID,
        title: m.post_title,
        url: m.guid,
        mimeType: m.post_mime_type,
        date: m.post_date,
      }));

      return {
        success: true,
        media,
      };
    } catch (error: any) {
      console.error(`[WordPressBuilder] メディア一覧取得エラー:`, error);
      return {
        success: false,
        media: [],
      };
    }
  }

  // ============================================
  // バックアップ機能
  // ============================================

  /**
   * 【新機能】データベースをエクスポート
   */
  async exportDatabase(
    domain: string
  ): Promise<{ success: boolean; message: string; filePath?: string }> {
    console.log(`[WordPressBuilder] データベースエクスポート`);

    try {
      const wpPath = await this.getActualWordPressPath(domain);
      let wpCliPath = await this.getWpCliPath();
      if (!wpCliPath) {
        await this.installWPCLI();
        wpCliPath = await this.getWpCliPath();
      }
      if (!wpCliPath) {
        throw new Error("WP-CLIが利用できません");
      }

      // タイムスタンプ付きファイル名
      const timestamp = new Date().toISOString().replace(/[:-]/g, "").split(".")[0];
      const fileName = `backup_${domain.replace(/\./g, "_")}_${timestamp}.sql`;
      const filePath = `${wpPath}/${fileName}`;

      await this.execCommand(
        `${wpCliPath} db export ${filePath} --path=${wpPath}`
      );

      return {
        success: true,
        message: `データベースをエクスポートしました: ${fileName}`,
        filePath,
      };
    } catch (error: any) {
      console.error(`[WordPressBuilder] データベースエクスポートエラー:`, error);
      return {
        success: false,
        message: `データベースのエクスポートに失敗しました: ${error.message}`,
      };
    }
  }

  // ============================================
  // Cron管理機能
  // ============================================

  /**
   * 【新機能】Cronイベント一覧を取得
   */
  async getCronEvents(
    domain: string
  ): Promise<{ success: boolean; events: Array<{ hook: string; nextRun: string; recurrence: string }> }> {
    console.log(`[WordPressBuilder] Cronイベント一覧取得`);

    try {
      const wpPath = await this.getActualWordPressPath(domain);
      let wpCliPath = await this.getWpCliPath();
      if (!wpCliPath) {
        await this.installWPCLI();
        wpCliPath = await this.getWpCliPath();
      }
      if (!wpCliPath) {
        throw new Error("WP-CLIが利用できません");
      }

      const result = await this.execCommand(
        `${wpCliPath} cron event list --format=json --path=${wpPath}`
      );
      const events = JSON.parse(result).map((e: any) => ({
        hook: e.hook,
        nextRun: e.next_run_gmt || e.next_run,
        recurrence: e.recurrence || "once",
      }));

      return {
        success: true,
        events,
      };
    } catch (error: any) {
      console.error(`[WordPressBuilder] Cronイベント一覧取得エラー:`, error);
      return {
        success: false,
        events: [],
      };
    }
  }

  /**
   * 【新機能】Cronイベントを実行
   */
  async runCronEvent(
    domain: string,
    hook: string
  ): Promise<{ success: boolean; message: string }> {
    console.log(`[WordPressBuilder] Cronイベント実行: ${hook}`);

    try {
      const wpPath = await this.getActualWordPressPath(domain);
      let wpCliPath = await this.getWpCliPath();
      if (!wpCliPath) {
        await this.installWPCLI();
        wpCliPath = await this.getWpCliPath();
      }
      if (!wpCliPath) {
        throw new Error("WP-CLIが利用できません");
      }

      await this.execCommand(
        `${wpCliPath} cron event run ${hook} --path=${wpPath}`
      );

      return {
        success: true,
        message: `Cronイベント「${hook}」を実行しました`,
      };
    } catch (error: any) {
      console.error(`[WordPressBuilder] Cronイベント実行エラー:`, error);
      return {
        success: false,
        message: `Cronイベントの実行に失敗しました: ${error.message}`,
      };
    }
  }

  // ============================================
  // カテゴリ・タグ管理機能
  // ============================================

  /**
   * 【新機能】カテゴリ一覧を取得
   */
  async getCategories(
    domain: string
  ): Promise<{ success: boolean; categories: Array<{ id: number; name: string; slug: string; count: number }> }> {
    console.log(`[WordPressBuilder] カテゴリ一覧取得`);

    try {
      const wpPath = await this.getActualWordPressPath(domain);
      let wpCliPath = await this.getWpCliPath();
      if (!wpCliPath) {
        await this.installWPCLI();
        wpCliPath = await this.getWpCliPath();
      }
      if (!wpCliPath) {
        throw new Error("WP-CLIが利用できません");
      }

      const result = await this.execCommand(
        `${wpCliPath} term list category --format=json --path=${wpPath}`
      );
      const categories = JSON.parse(result).map((c: any) => ({
        id: c.term_id,
        name: c.name,
        slug: c.slug,
        count: c.count,
      }));

      return {
        success: true,
        categories,
      };
    } catch (error: any) {
      console.error(`[WordPressBuilder] カテゴリ一覧取得エラー:`, error);
      return {
        success: false,
        categories: [],
      };
    }
  }

  /**
   * 【新機能】カテゴリを作成
   */
  async createCategory(
    domain: string,
    name: string,
    options?: { slug?: string; description?: string; parent?: number }
  ): Promise<{ success: boolean; message: string; categoryId?: number }> {
    console.log(`[WordPressBuilder] カテゴリ作成: ${name}`);

    try {
      const wpPath = await this.getActualWordPressPath(domain);
      let wpCliPath = await this.getWpCliPath();
      if (!wpCliPath) {
        await this.installWPCLI();
        wpCliPath = await this.getWpCliPath();
      }
      if (!wpCliPath) {
        throw new Error("WP-CLIが利用できません");
      }

      const escapedName = name.replace(/'/g, "'\\''");
      let command = `${wpCliPath} term create category '${escapedName}' --porcelain`;

      if (options?.slug) {
        command += ` --slug='${options.slug}'`;
      }
      if (options?.description) {
        const escapedDesc = options.description.replace(/'/g, "'\\''");
        command += ` --description='${escapedDesc}'`;
      }
      if (options?.parent) {
        command += ` --parent=${options.parent}`;
      }

      command += ` --path=${wpPath}`;

      const result = await this.execCommand(command);
      const categoryId = parseInt(result.trim(), 10);

      return {
        success: true,
        message: `カテゴリ「${name}」を作成しました`,
        categoryId: isNaN(categoryId) ? undefined : categoryId,
      };
    } catch (error: any) {
      console.error(`[WordPressBuilder] カテゴリ作成エラー:`, error);
      return {
        success: false,
        message: `カテゴリの作成に失敗しました: ${error.message}`,
      };
    }
  }

  /**
   * 【新機能】タグ一覧を取得
   */
  async getTags(
    domain: string
  ): Promise<{ success: boolean; tags: Array<{ id: number; name: string; slug: string; count: number }> }> {
    console.log(`[WordPressBuilder] タグ一覧取得`);

    try {
      const wpPath = await this.getActualWordPressPath(domain);
      let wpCliPath = await this.getWpCliPath();
      if (!wpCliPath) {
        await this.installWPCLI();
        wpCliPath = await this.getWpCliPath();
      }
      if (!wpCliPath) {
        throw new Error("WP-CLIが利用できません");
      }

      const result = await this.execCommand(
        `${wpCliPath} term list post_tag --format=json --path=${wpPath}`
      );
      const tags = JSON.parse(result).map((t: any) => ({
        id: t.term_id,
        name: t.name,
        slug: t.slug,
        count: t.count,
      }));

      return {
        success: true,
        tags,
      };
    } catch (error: any) {
      console.error(`[WordPressBuilder] タグ一覧取得エラー:`, error);
      return {
        success: false,
        tags: [],
      };
    }
  }

  /**
   * 【新機能】タグを作成
   */
  async createTag(
    domain: string,
    name: string,
    options?: { slug?: string; description?: string }
  ): Promise<{ success: boolean; message: string; tagId?: number }> {
    console.log(`[WordPressBuilder] タグ作成: ${name}`);

    try {
      const wpPath = await this.getActualWordPressPath(domain);
      let wpCliPath = await this.getWpCliPath();
      if (!wpCliPath) {
        await this.installWPCLI();
        wpCliPath = await this.getWpCliPath();
      }
      if (!wpCliPath) {
        throw new Error("WP-CLIが利用できません");
      }

      const escapedName = name.replace(/'/g, "'\\''");
      let command = `${wpCliPath} term create post_tag '${escapedName}' --porcelain`;

      if (options?.slug) {
        command += ` --slug='${options.slug}'`;
      }
      if (options?.description) {
        const escapedDesc = options.description.replace(/'/g, "'\\''");
        command += ` --description='${escapedDesc}'`;
      }

      command += ` --path=${wpPath}`;

      const result = await this.execCommand(command);
      const tagId = parseInt(result.trim(), 10);

      return {
        success: true,
        message: `タグ「${name}」を作成しました`,
        tagId: isNaN(tagId) ? undefined : tagId,
      };
    } catch (error: any) {
      console.error(`[WordPressBuilder] タグ作成エラー:`, error);
      return {
        success: false,
        message: `タグの作成に失敗しました: ${error.message}`,
      };
    }
  }
}
