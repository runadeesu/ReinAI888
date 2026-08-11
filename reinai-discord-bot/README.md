# ReinAI Discord Bot

ReinAI公式コミュニティサーバー用のbotです。3つの機能を持ちます。

1. **`/verify`** — メンバーがReinAIアカウントと連携すると、指定したロールを自動付与します。
2. **お知らせの自動転送** — reinai-admin(管理ダッシュボード)の「お知らせ」ページに投稿した内容を、指定したチャンネルへ自動投稿します。
3. **管理者コマンド(50個)** — 「Rein管理者」ロールを持つ人だけが実行できる、ユーザー管理・モデレーション・コンテンツ運営・セキュリティ・ユーティリティ系のコマンド群。下記「管理者コマンド一覧」参照。

このbotはDiscord/ReinAI双方に対して**すべて外向きの通信のみ**行います(Webhookの受信やポート公開は不要)。そのため自分のPC、VPS、Railway/Render/Fly.ioなど、Node.jsが動く常時起動環境ならどこでも動かせます。

## セットアップ

### 1. Discord Botアプリを作成

1. https://discord.com/developers/applications を開き「New Application」
2. 「Bot」タブ → 「Reset Token」でトークンを発行(`DISCORD_BOT_TOKEN`)
3. 同じ「Bot」タブで **Privileged Gateway Intents** の **SERVER MEMBERS INTENT** と **MESSAGE CONTENT INTENT** の両方をON
   - SERVER MEMBERS INTENT: ロール付与・メンバー一覧取得に必要
   - MESSAGE CONTENT INTENT: `/secret-check`(誤爆したAPIキー等の自動検知・削除)に必要
4. 「OAuth2」タブ → 「General」で **Application ID** を控える(`DISCORD_CLIENT_ID`)

### 2. サーバーに招待

「OAuth2」→「URL Generator」で以下を選択して生成されたURLを開き、自分のサーバーに招待してください。

- **SCOPES**: `bot`, `applications.commands`
- **BOT PERMISSIONS**: `Manage Roles`, `Send Messages`, `Embed Links`, `View Channels`, `Manage Messages`, `Kick Members`, `Ban Members`, `Moderate Members`, `Manage Channels`, `Manage Events`, `Manage Server`

招待後、サーバー設定 → ロール で、botのロールを **付与/操作したいロールより上** に配置してください(Discordの権限階層上、botは自分より下位のロールしか操作できません)。

### 3. IDを控える

Discordの「ユーザー設定」→「詳細設定」→ **開発者モード** をON。その後:

- サーバーアイコンを右クリック → 「サーバーIDをコピー」→ `DISCORD_GUILD_ID`
- 認証済みユーザーに付与したいロールを右クリック → 「ロールIDをコピー」→ `DISCORD_VERIFIED_ROLE_ID`
- お知らせを流したいチャンネルを右クリック → 「チャンネルIDをコピー」→ `DISCORD_ANNOUNCEMENT_CHANNEL_ID`
- 管理者コマンドを実行できるロール(例: 「Rein管理者」)を右クリック → 「ロールIDをコピー」→ `DISCORD_ADMIN_ROLE_ID`

### 4. .env を作成

```bash
cp .env.example .env
```

`.env.example` の全項目を埋めてください。`DISCORD_BOT_SECRET` は、reinai-appのVercel環境変数 `DISCORD_BOT_SECRET` と**同じ値**にする必要があります(このbotとreinai-appの間の認証に使う共有シークレットです)。

### 5. インストールしてコマンド登録・起動

```bash
npm install
npm run register-commands   # 全コマンドをサーバーに登録(初回・コマンド変更時のみ)
npm start                    # bot起動
```

正常に起動すると `[bot] logged in as ...` とログに出ます。

## 常時稼働させるには

このbotはNode.jsプロセスとしてずっと起動し続ける必要があります。無料〜低コストで常時起動できる選択肢の例:

- Railway / Render / Fly.io の無料枠(Node.jsアプリとしてデプロイ、Start Command は `npm start`)
- 自宅サーバーやVPS + `pm2` (`pm2 start src/index.js --name reinai-bot`)
- Docker: `node:20-alpine` イメージで `npm ci && npm start`

`/bot-restart` はプロセスを終了させるだけなので、上記のようなプロセスマネージャで自動再起動する構成でないと、実行後そのまま停止したままになります。

## 動作の仕組み

- `/verify` を実行すると、botがreinai-appの `/api/discord/verify/start` を呼び、ワンタイムの確認用URLを発行してもらいます。メンバーがそのURLをブラウザで開き(ReinAIにログイン済みの状態で)連携を確定すると、reinai-app側のDBに連携情報が保存されます。botは`POLL_INTERVAL_MS`間隔でポーリングし、新しく連携されたユーザーを見つけ次第ロールを付与します。
- お知らせも同様に、`/api/discord/announcements/pending` をポーリングして未転送のお知らせを検出・投稿します。
- 管理者コマンドは、`/api/discord/admin/*` の各エンドポイント(すべて`X-Bot-Secret`で認証)を呼び出して実データを操作します。Discordのモデレーション系コマンド(BAN/ミュート/チャンネルロック等)はDiscord API自体を直接操作するので、ReinAI側の呼び出しは発生しません。
- 削除・大量キック・一斉DMなど取り消せない操作は、実行前にボタンでの確認を挟みます(5分で失効)。
- FAQ・警告履歴・カスタムコマンド・予約投稿・コンテスト状態など、ReinAI本体に存在しない「このDiscordサーバー固有のデータ」は `data/` フォルダ内のJSONファイルにbotが自前で保存します(gitには含まれません)。

すべてbot側からの発信(ポーリング/APIコール)のみで完結するため、bot側にWebhook受信用のURLやポート開放は一切不要です。

## 管理者コマンド一覧(「Rein管理者」ロール限定)

### ユーザー管理
`/user-info` `/user-ban-app` `/user-unban-app` `/user-sessions` `/user-kill-sessions` `/user-audit-log` `/user-search-email` `/user-search-ip` `/check-alt` `/user-delete-account` `/user-export-data` `/user-reset-rate`

### モデレーション
`/lockdown-channel` `/unlock-channel` `/purge-bot-messages` `/purge-user` `/slowmode-set` `/automod-add-rule` `/anti-raid-enable` `/anti-raid-disable` `/warn` `/warnings-check` `/temp-ban` `/mute` `/unmute` `/mod-log-search` `/clean-spammers`

### コンテンツ・イベント
`/announce-embed` `/announce-schedule` `/roadmap-sync` `/faq-add` `/faq-list` `/faq-delete` `/event-create` `/contest-start` `/contest-tally` `/patchnotes-post` `/pin-manage`

### セキュリティ・監査
`/audit-export` `/backup-discord`(+ 全メッセージを自動監視する`/secret-check`相当の常時リスナー)

### システム・ユーティリティ
`/bot-stats` `/bot-restart` `/custom-command-add`(+ 誰でも使える`/custom`) `/broadcast-dm` `/db-health` `/dns-check` `/maintenance-on` `/maintenance-off`

### 今回あえて実装しなかったもの

課金/クレジット付与、Redis連携、CI/CD(GitHub Actions/Linear)連携、Sentry連携、AIレスポンスキャッシュ、モデルの動的パラメータ変更、公式プロンプト一斉配信、NGワードフィルタ(チャットAI側)、ベータ招待制、VIP枠、フィーチャーフラグ、複数リージョンping、サーバーCPU/メモリのリアルタイムグラフ、本番デプロイ操作(`/deploy-trigger`等)、`/emergency-shutdown`、`/api-key-rotate` — いずれもReinAI側に対応する裏側システムが存在しないか、botに強い権限を持たせるリスクが大きいため、動くふりだけのコマンドにせず見送っています。必要になったら個別に設計・実装します。
