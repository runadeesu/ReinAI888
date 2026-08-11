# ReinAI Discord Bot

ReinAI公式コミュニティサーバー用のbotです。2つの機能を持ちます。

1. **`/verify`** — メンバーがReinAIアカウントと連携すると、指定したロールを自動付与します。
2. **お知らせの自動転送** — reinai-admin(管理ダッシュボード)の「お知らせ」ページに投稿した内容を、指定したチャンネルへ自動投稿します。

このbotはDiscord/ReinAI双方に対して**すべて外向きの通信のみ**行います(Webhookの受信やポート公開は不要)。そのため自分のPC、VPS、Railway/Render/Fly.ioなど、Node.jsが動く常時起動環境ならどこでも動かせます。

## セットアップ

### 1. Discord Botアプリを作成

1. https://discord.com/developers/applications を開き「New Application」
2. 「Bot」タブ → 「Reset Token」でトークンを発行(`DISCORD_BOT_TOKEN`)
3. 同じ「Bot」タブで **Privileged Gateway Intents** の **SERVER MEMBERS INTENT** をON(ロール付与に必要)
4. 「OAuth2」タブ → 「General」で **Application ID** を控える(`DISCORD_CLIENT_ID`)

### 2. サーバーに招待

「OAuth2」→「URL Generator」で以下を選択して生成されたURLを開き、自分のサーバーに招待してください。

- **SCOPES**: `bot`, `applications.commands`
- **BOT PERMISSIONS**: `Manage Roles`, `Send Messages`, `Embed Links`, `View Channels`

招待後、サーバー設定 → ロール で、botのロールを **「認証済み」ロールより上** に配置してください(Discordの権限階層上、botは自分より下位のロールしか付与できません)。

### 3. IDを控える

Discordの「ユーザー設定」→「詳細設定」→ **開発者モード** をON。その後:

- サーバーアイコンを右クリック → 「サーバーIDをコピー」→ `DISCORD_GUILD_ID`
- 認証済みユーザーに付与したいロールを右クリック → 「ロールIDをコピー」→ `DISCORD_VERIFIED_ROLE_ID`
- お知らせを流したいチャンネルを右クリック → 「チャンネルIDをコピー」→ `DISCORD_ANNOUNCEMENT_CHANNEL_ID`

### 4. .env を作成

```bash
cp .env.example .env
```

`.env.example` の全項目を埋めてください。`DISCORD_BOT_SECRET` は、reinai-appのVercel環境変数 `DISCORD_BOT_SECRET` と**同じ値**にする必要があります(このbotとreinai-appの間の認証に使う共有シークレットです)。

### 5. インストールしてコマンド登録・起動

```bash
npm install
npm run register-commands   # /verify コマンドをサーバーに登録(初回・コマンド変更時のみ)
npm start                    # bot起動
```

正常に起動すると `[bot] logged in as ...` とログに出ます。Discordサーバーで `/verify` を実行し、表示されたリンクをブラウザで開いてReinAIにログイン済みの状態で連携を確認すると、数秒〜`POLL_INTERVAL_MS`以内に認証済みロールが付与されます。

## 常時稼働させるには

このbotはNode.jsプロセスとしてずっと起動し続ける必要があります。無料〜低コストで常時起動できる選択肢の例:

- Railway / Render / Fly.io の無料枠(Node.jsアプリとしてデプロイ、Start Command は `npm start`)
- 自宅サーバーやVPS + `pm2` (`pm2 start src/index.js --name reinai-bot`)
- Docker: `node:20-alpine` イメージで `npm ci && npm start`

## 動作の仕組み

- `/verify` を実行すると、botがreinai-appの `/api/discord/verify/start` を呼び、ワンタイムの確認用URLを発行してもらいます。
- メンバーがそのURLをブラウザで開き(ReinAIにログイン済みの状態で)連携を確定すると、reinai-app側のDBに連携情報が保存されます。
- botは `POLL_INTERVAL_MS` 間隔で `/api/discord/verify/status` をポーリングし、新しく連携されたユーザーを見つけ次第ロールを付与します。
- 同様に `/api/discord/announcements/pending` をポーリングし、reinai-adminで作成された未転送のお知らせを見つけ次第、指定チャンネルへEmbed形式で投稿します。

どちらもbot側からの発信(ポーリング)のみで完結するため、bot側にWebhook受信用のURLやポート開放は一切不要です。
