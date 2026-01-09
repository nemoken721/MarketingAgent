import { Client } from "ssh2";
import { decrypt } from "@/lib/encryption";
import { createClient } from "@/lib/supabase/server";
import { lookup } from "dns/promises";

/**
 * SSL証明書自動インストールエンジン
 * Let's Encryptを使用してSSL証明書を自動取得・インストールする
 */

export interface SSLConfig {
  domain: string;
  email: string; // Let's Encrypt通知用メールアドレス
}

export interface SSLProgress {
  step: number;
  message: string;
  percent: number;
  completed: boolean;
}

export class CertbotInstaller {
  private conn: Client;
  private host: string;
  private port: number;
  private username: string;
  private password: string;
  private websiteId: string;

  constructor(
    websiteId: string,
    host: string,
    port: number,
    username: string,
    encryptedPassword: string
  ) {
    this.conn = new Client();
    this.websiteId = websiteId;
    this.host = host;
    this.port = port;
    this.username = username;
    this.password = decrypt(encryptedPassword);
  }

  /**
   * SSL設定進捗を更新
   */
  private async updateProgress(
    step: number,
    message: string,
    percent: number,
    completed: boolean = false
  ): Promise<void> {
    try {
      const supabase = await createClient();
      const progress: SSLProgress = { step, message, percent, completed };

      await supabase
        .from("websites")
        .update({
          ssl_progress: progress,
          updated_at: new Date().toISOString(),
        })
        .eq("id", this.websiteId);

      console.log(`[SSL Progress] ${percent}% - ${message}`);
    } catch (error) {
      console.error("[SSL Progress Update Error]", error);
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

      this.conn
        .on("ready", () => {
          clearTimeout(timeout);
          console.log("[CertbotInstaller] SSH接続成功");
          resolve();
        })
        .on("error", (err) => {
          clearTimeout(timeout);
          reject(new Error(`SSH接続エラー: ${err.message}`));
        })
        .connect({
          host: this.host,
          port: this.port,
          username: this.username,
          password: this.password,
          readyTimeout: 30000,
        });
    });
  }

  /**
   * SSH接続を切断
   */
  disconnect(): void {
    this.conn.end();
    console.log("[CertbotInstaller] SSH接続を切断");
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
            if (code !== 0) {
              console.error(`[SSH Error] ${command}\n${stderr}`);
              reject(new Error(`コマンド終了コード: ${code}\n${stderr}`));
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
   * DNS伝播をチェック（リトライ機構付き）
   * ドメインが正しいIPアドレスを指しているか確認
   */
  async checkDNSPropagation(
    domain: string,
    maxRetries: number = 10,
    retryInterval: number = 30000
  ): Promise<boolean> {
    console.log(
      `[CertbotInstaller] DNS伝播チェック開始: ${domain} (最大${maxRetries}回リトライ)`
    );

    for (let i = 0; i < maxRetries; i++) {
      try {
        // ドメインのIPアドレスを取得
        const addresses = await lookup(domain, { all: true });
        console.log(`[DNS Check] ${domain} → ${addresses.map((a) => a.address).join(", ")}`);

        // サーバーのIPアドレスを取得
        const serverAddresses = await lookup(this.host, { all: true });
        const serverIPs = serverAddresses.map((a) => a.address);
        console.log(`[DNS Check] Server ${this.host} → ${serverIPs.join(", ")}`);

        // ドメインのIPがサーバーのIPと一致するかチェック
        const isDNSPropagated = addresses.some((addr) =>
          serverIPs.includes(addr.address)
        );

        if (isDNSPropagated) {
          console.log(`[DNS Check] DNS伝播完了！ (試行${i + 1}/${maxRetries})`);
          return true;
        }

        console.log(
          `[DNS Check] DNS未伝播。${retryInterval / 1000}秒後に再試行... (${i + 1}/${maxRetries})`
        );

        // 進捗を更新
        const progress = Math.floor(10 + (i / maxRetries) * 20); // 10% → 30%
        await this.updateProgress(
          1,
          `DNS伝播を待機中... (${i + 1}/${maxRetries})`,
          progress
        );

        // 最後の試行でない場合は待機
        if (i < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, retryInterval));
        }
      } catch (error: any) {
        console.error(`[DNS Check Error] ${error.message}`);

        if (i === maxRetries - 1) {
          throw new Error(
            `DNS伝播の確認に失敗しました。ドメインのDNS設定を確認してください。`
          );
        }

        // リトライ前に待機
        await new Promise((resolve) => setTimeout(resolve, retryInterval));
      }
    }

    throw new Error(
      `DNS伝播がタイムアウトしました。ドメインが正しくサーバーIPを指しているか確認してください。`
    );
  }

  /**
   * Certbotをインストール
   */
  async installCertbot(): Promise<void> {
    console.log("[CertbotInstaller] Certbotをインストール中...");

    // Certbotが既にインストールされているかチェック
    try {
      await this.execCommand("certbot --version");
      console.log("[CertbotInstaller] Certbot は既にインストール済み");
      return;
    } catch (error) {
      console.log("[CertbotInstaller] Certbotをインストールします...");
    }

    // snapdをインストール（Ubuntu/Debian系）
    try {
      await this.execCommand("sudo apt update && sudo apt install -y snapd");
      await this.execCommand("sudo snap install core && sudo snap refresh core");
      await this.execCommand("sudo snap install --classic certbot");
      await this.execCommand("sudo ln -s /snap/bin/certbot /usr/bin/certbot");

      console.log("[CertbotInstaller] Certbotインストール完了");
    } catch (error: any) {
      throw new Error(`Certbotのインストールに失敗しました: ${error.message}`);
    }
  }

  /**
   * SSL証明書を取得
   */
  async obtainCertificate(config: SSLConfig): Promise<void> {
    console.log("[CertbotInstaller] SSL証明書を取得中...");

    const wpPath = `~/public_html/${config.domain}`;

    // Certbotを実行してSSL証明書を取得
    try {
      // webroot認証を使用（Apacheが既に起動している場合）
      await this.execCommand(
        `sudo certbot certonly --webroot -w ${wpPath} -d ${config.domain} -d www.${config.domain} --email ${config.email} --agree-tos --non-interactive`
      );

      console.log("[CertbotInstaller] SSL証明書取得完了");
    } catch (error: any) {
      console.error("[Certbot Error]", error);

      // webroot認証が失敗した場合はstandaloneモードを試す
      try {
        console.log(
          "[CertbotInstaller] standaloneモードで再試行中..."
        );

        // Apacheを一時停止
        await this.execCommand("sudo systemctl stop apache2 || true");
        await this.execCommand("sudo systemctl stop httpd || true");

        // standaloneモードで証明書取得
        await this.execCommand(
          `sudo certbot certonly --standalone -d ${config.domain} -d www.${config.domain} --email ${config.email} --agree-tos --non-interactive`
        );

        // Apacheを再起動
        await this.execCommand("sudo systemctl start apache2 || true");
        await this.execCommand("sudo systemctl start httpd || true");

        console.log("[CertbotInstaller] SSL証明書取得完了（standaloneモード）");
      } catch (standaloneError: any) {
        throw new Error(
          `SSL証明書の取得に失敗しました: ${standaloneError.message}`
        );
      }
    }
  }

  /**
   * ApacheにSSL設定を適用
   */
  async configureApacheSSL(domain: string): Promise<void> {
    console.log("[CertbotInstaller] ApacheにSSL設定を適用中...");

    try {
      // SSL証明書のパス
      const certPath = `/etc/letsencrypt/live/${domain}/fullchain.pem`;
      const keyPath = `/etc/letsencrypt/live/${domain}/privkey.pem`;

      // VirtualHost設定ファイルを作成
      const vhostConfig = `<VirtualHost *:443>
    ServerName ${domain}
    ServerAlias www.${domain}
    DocumentRoot ~/public_html/${domain}

    SSLEngine on
    SSLCertificateFile ${certPath}
    SSLCertificateKeyFile ${keyPath}

    <Directory ~/public_html/${domain}>
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>

# HTTP to HTTPS redirect
<VirtualHost *:80>
    ServerName ${domain}
    ServerAlias www.${domain}
    Redirect permanent / https://${domain}/
</VirtualHost>`;

      // 設定ファイルを作成
      await this.execCommand(
        `echo '${vhostConfig}' | sudo tee /etc/apache2/sites-available/${domain}-ssl.conf`
      );

      // SSL設定を有効化
      await this.execCommand(`sudo a2enmod ssl`);
      await this.execCommand(`sudo a2ensite ${domain}-ssl`);
      await this.execCommand(`sudo systemctl reload apache2 || sudo systemctl reload httpd`);

      console.log("[CertbotInstaller] Apache SSL設定完了");
    } catch (error: any) {
      throw new Error(`Apache SSL設定に失敗しました: ${error.message}`);
    }
  }

  /**
   * 自動更新を設定
   */
  async setupAutoRenewal(): Promise<void> {
    console.log("[CertbotInstaller] SSL証明書の自動更新を設定中...");

    try {
      // Certbot自動更新タイマーを有効化
      await this.execCommand("sudo systemctl enable certbot.timer || true");
      await this.execCommand("sudo systemctl start certbot.timer || true");

      console.log("[CertbotInstaller] 自動更新設定完了");
    } catch (error: any) {
      console.warn("[CertbotInstaller] 自動更新設定の警告:", error.message);
      // 自動更新設定は必須ではないので、エラーでもスキップ
    }
  }

  /**
   * SSL証明書インストールの全工程を実行
   */
  async install(config: SSLConfig): Promise<void> {
    try {
      // 1. SSH接続
      await this.updateProgress(1, "サーバーに接続中...", 5);
      await this.connect();

      // 2. DNS伝播チェック（リトライ機構付き）
      await this.updateProgress(2, "DNS伝播を確認中...", 10);
      await this.checkDNSPropagation(config.domain, 10, 30000); // 最大10回、30秒間隔

      // 3. Certbotインストール
      await this.updateProgress(3, "Certbotをインストール中...", 35);
      await this.installCertbot();

      // 4. SSL証明書取得
      await this.updateProgress(4, "SSL証明書を取得中...", 60);
      await this.obtainCertificate(config);

      // 5. Apache SSL設定
      await this.updateProgress(5, "Webサーバーに設定を適用中...", 80);
      await this.configureApacheSSL(config.domain);

      // 6. 自動更新設定
      await this.updateProgress(6, "自動更新を設定中...", 90);
      await this.setupAutoRenewal();

      // 完了
      await this.updateProgress(7, "SSL設定完了！", 100, true);
      console.log("[CertbotInstaller] SSL設定完了！");
    } catch (error) {
      console.error("[CertbotInstaller] SSL設定エラー:", error);
      await this.updateProgress(0, `エラー: ${error}`, 0, false);
      throw error;
    } finally {
      this.disconnect();
    }
  }
}
