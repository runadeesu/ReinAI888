// Hand-written OpenAPI description of ReinAI's actual REST surface.
// Kept intentionally scoped to the stable, documented-worthy endpoints
// (chat, conversations, messages, prompts, personas, projects, account) —
// internal auth/2FA plumbing routes are omitted since they aren't meant
// to be called by third parties.
export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "ReinAI API",
    version: "1.5.5",
    description: "ReinAIチャットプラットフォームの内部REST API。すべてのエンドポイントはセッションCookieによる認証が必要です。",
  },
  servers: [{ url: "/api" }],
  paths: {
    "/conversations": {
      get: {
        summary: "会話一覧を取得",
        parameters: [
          { name: "q", in: "query", schema: { type: "string" }, description: "タイトル検索" },
          { name: "projectId", in: "query", schema: { type: "string" } },
          { name: "folderId", in: "query", schema: { type: "string" } },
          { name: "pinned", in: "query", schema: { type: "string", enum: ["true"] } },
          { name: "favorite", in: "query", schema: { type: "string", enum: ["true"] } },
          { name: "archived", in: "query", schema: { type: "string", enum: ["true", "false"] } },
        ],
        responses: { "200": { description: "会話の配列" } },
      },
      post: {
        summary: "新規会話を作成",
        requestBody: { content: { "application/json": { schema: { type: "object", properties: { provider: { type: "string" }, model: { type: "string" }, projectId: { type: "string" }, folderId: { type: "string" } } } } } },
        responses: { "200": { description: "作成された会話" } },
      },
    },
    "/conversations/{id}": {
      get: { summary: "会話を取得", responses: { "200": { description: "会話" } } },
      patch: {
        summary: "会話を更新(ピン留め・お気に入り・アーカイブ・タグなど)",
        requestBody: { content: { "application/json": { schema: { type: "object", properties: { isPinned: { type: "boolean" }, isFavorite: { type: "boolean" }, isArchived: { type: "boolean" }, tags: { type: "array", items: { type: "string" } } } } } } },
        responses: { "200": { description: "更新後の会話" } },
      },
      delete: { summary: "会話を削除", responses: { "200": { description: "削除結果" } } },
    },
    "/conversations/{id}/messages": {
      get: { summary: "会話内のメッセージ一覧を取得", responses: { "200": { description: "メッセージの配列" } } },
    },
    "/conversations/{id}/share": {
      post: { summary: "会話を公開共有リンクとして発行", responses: { "200": { description: "共有ID" } } },
      delete: { summary: "共有を停止", responses: { "200": { description: "結果" } } },
    },
    "/chat": {
      post: {
        summary: "メッセージを送信しAI応答をストリーミング取得",
        description: "Server-Sent Events形式でストリーミングされたレスポンスを返します。",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["conversationId", "content"],
                properties: {
                  conversationId: { type: "string" },
                  content: { type: "string" },
                  useSearch: { type: "boolean", description: "Wikipedia検索ツールを有効化" },
                  regenerateMessageId: { type: "string", description: "指定メッセージ以降を再生成" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "text/event-streamのストリーム" } },
      },
    },
    "/messages/{id}": {
      patch: {
        summary: "メッセージのピン留め・リアクションを更新",
        requestBody: { content: { "application/json": { schema: { type: "object", properties: { isPinned: { type: "boolean" }, toggleReaction: { type: "string" } } } } } },
        responses: { "200": { description: "更新結果" } },
      },
    },
    "/images/generate": {
      post: {
        summary: "画像を生成(OpenAI/Google/OpenRouterのいずれか設定済みのキーを使用)",
        requestBody: { content: { "application/json": { schema: { type: "object", required: ["conversationId", "prompt"], properties: { conversationId: { type: "string" }, prompt: { type: "string" } } } } } },
        responses: { "200": { description: "生成結果と添付ファイル情報" } },
      },
    },
    "/videos/generate": {
      post: {
        summary: "動画生成を開始(Google Veo、要課金設定)",
        requestBody: { content: { "application/json": { schema: { type: "object", required: ["conversationId", "prompt"], properties: { conversationId: { type: "string" }, prompt: { type: "string" } } } } } },
        responses: { "200": { description: "operationName を含む開始結果" } },
      },
    },
    "/videos/status": {
      get: {
        summary: "動画生成の進捗を確認",
        parameters: [{ name: "operationName", in: "query", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "進捗・完了時は動画URL" } },
      },
    },
    "/prompts": {
      get: { summary: "プロンプトテンプレート一覧", responses: { "200": { description: "プロンプトの配列" } } },
      post: { summary: "プロンプトテンプレートを作成", responses: { "200": { description: "作成結果" } } },
    },
    "/prompts/{id}": {
      patch: { summary: "プロンプトを更新", responses: { "200": { description: "更新結果" } } },
      delete: { summary: "プロンプトを削除", responses: { "200": { description: "削除結果" } } },
    },
    "/personas": {
      get: { summary: "ペルソナ一覧を取得", responses: { "200": { description: "ペルソナの配列" } } },
      post: {
        summary: "ペルソナを作成",
        requestBody: { content: { "application/json": { schema: { type: "object", required: ["name", "instructions"], properties: { name: { type: "string" }, instructions: { type: "string" } } } } } },
        responses: { "200": { description: "作成結果" } },
      },
    },
    "/personas/{id}": {
      post: { summary: "ペルソナをカスタム指示として適用", responses: { "200": { description: "適用結果" } } },
      delete: { summary: "ペルソナを削除", responses: { "200": { description: "削除結果" } } },
    },
    "/instruction-versions": {
      get: { summary: "カスタム指示の変更履歴を取得(最新20件)", responses: { "200": { description: "履歴の配列" } } },
    },
    "/instruction-versions/{id}/restore": {
      post: { summary: "過去のカスタム指示を復元", responses: { "200": { description: "復元結果" } } },
    },
    "/projects": {
      get: { summary: "プロジェクト一覧を取得", responses: { "200": { description: "プロジェクトの配列" } } },
      post: { summary: "プロジェクトを作成", responses: { "200": { description: "作成結果" } } },
    },
    "/projects/{id}": {
      get: { summary: "プロジェクトを取得", responses: { "200": { description: "プロジェクト" } } },
      patch: { summary: "プロジェクトを更新(名前・説明・カスタム指示)", responses: { "200": { description: "更新結果" } } },
      delete: { summary: "プロジェクトを削除", responses: { "200": { description: "削除結果" } } },
    },
    "/account/profile": {
      get: { summary: "自分のプロフィールを取得", responses: { "200": { description: "ユーザー情報" } } },
      patch: { summary: "プロフィール・カスタム指示を更新", responses: { "200": { description: "更新結果" } } },
    },
    "/account/favorite-models": {
      get: { summary: "お気に入りモデル一覧を取得", responses: { "200": { description: "モデルキーの配列" } } },
      patch: { summary: "モデルのお気に入りを切り替え", responses: { "200": { description: "更新結果" } } },
    },
    "/account/sessions": {
      get: { summary: "ログイン中のセッション一覧", responses: { "200": { description: "セッションの配列" } } },
    },
    "/account/sessions/{id}": {
      delete: { summary: "指定セッションを終了", responses: { "200": { description: "結果" } } },
    },
    "/account/sessions/revoke-all": {
      post: { summary: "現在のセッション以外をすべて終了", responses: { "200": { description: "結果" } } },
    },
    "/account/stats": {
      get: { summary: "個人の利用統計(会話数・メッセージ数・モデル別内訳・週別推移)を取得", responses: { "200": { description: "統計データ" } } },
    },
    "/account/rate-limit-status": {
      get: { summary: "現在のレート制限バケット状況を取得", responses: { "200": { description: "レート制限状況" } } },
    },
    "/account/delete": {
      post: { summary: "自分のアカウントを完全に削除(取り消し不可)", responses: { "200": { description: "結果" } } },
    },
    "/ai/providers": {
      get: { summary: "利用可能なAIプロバイダー・モデル一覧を取得", responses: { "200": { description: "プロバイダー一覧" } } },
    },
  },
} as const;
