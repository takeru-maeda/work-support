---
title: MCP サーバーの追加
status: in_progress    # draft → approved → in_progress → done（approved は人間が承認したときだけ）
created: 2026-10-15
updated: 2026-10-16
approved_at: 2026-10-16
branch: feat/mcp-server
scope:                 # この計画で編集してよいパス（glob）。spec-gate はここに含まれるパスだけを許す
  - "packages/api/src/**"
  - "packages/api/test/**"
  - "packages/api/supabase/**"
  - "packages/api/package.json"
  - "packages/api/wrangler.jsonc"
  - "packages/shared/src/**"
  - "packages/web/src/app/**"
  - "packages/web/src/pages/**"
  - "packages/web/src/config/**"
  - "packages/web/src/features/auth/**"
  - "packages/web/src/features/goals/**"
  - "packages/web/src/features/effort-entry/**"
  - "packages/e2e/**"
  - "package.json"
  - "pnpm-workspace.yaml"
  - "pnpm-lock.yaml"
---

# MCP サーバーの追加

## 現在地

- **フェーズ**: P1〜P3 完了（effort-entry v1.1.3 はコミット済み、goals v1.2.0 は人間のレビュー待ち）。次は P4
- **次にやること**: mcp v1.2.0 の実装（P4〜P6）。`packages/api/scripts/**` と `packages/shared/supabase-gen-types.sh` を `scope:` に足すかは人間の判断待ち
- **ブロッカー**: なし

## 1. 目的

- Claude Code、Claude Desktop、Cursor、Notion AI から、自分の工数・目標・週報・ミッションを読み書きできるようにする（例:「今週の週報の下書きを作って」「今日の工数を登録して」「新しい半期の目標を作って」）
- ハーネス移行計画（`harness-migration.md`）の P8「実際の改修を新しいフローで最後まで通す」の試運転を兼ねる。この計画の振り返りで、移行計画を完了にする

## 2. 決定事項

| # | 論点 | 決定 |
| --- | --- | --- |
| D1 | 置き場所 | `packages/api` に新しい機能 `features/mcp/` を作り、`/mcp` に載せる。同じ Worker なのでデプロイとシークレットは今のまま。ツールは HTTP を経由せず、各機能の service を呼ぶ（P7 の層のルールに沿う） |
| D2 | ライブラリ | MCP の公式 SDK の v2（`@modelcontextprotocol/server`。2026-10 時点で 2.3.x）。通信は Streamable HTTP で、リクエストごとにサーバーを作る状態を持たない作り（セッション、Durable Objects は使わない）。Hono への載せ方（`@modelcontextprotocol/hono` を使うか、`WebStandardStreamableHTTPServerTransport` を直接使うか）は P1 で決める。`@hono/mcp` と Cloudflare の `agents` は使わない |
| D3 | Zod | SDK v2 は、引数の説明（`.describe()`）を JSON Schema に載せるのに Zod 4.2 以上が要る。catalog の zod を 4.1.12 から 4.2 以上（公開から 2 週間以上たった版）に上げる。⚠️ 依存の更新なので P1 で人間に確認する |
| D4 | 認証 | Supabase Auth の OAuth 2.1 サーバー（認可コード + PKCE、動的なクライアント登録）を認可サーバーにし、`/mcp` はリソースサーバーになる。保護されたリソースのメタデータ（`/.well-known/oauth-protected-resource`）を出し、トークンが無ければ `WWW-Authenticate` 付きの 401 を返す。トークンは今と同じ JWKS で検証する（`lib/jwt.ts`） |
| D5 | OAuth のトークンの範囲 | OAuth のクライアントに出したトークン（`client_id` の claim があるもの）は `/mcp` だけで受け付け、`/api/*` では 401 にする。破ると、MCP 用に渡したトークンでアカウントの削除まで呼べてしまう |
| D6 | 同意の画面 | web に `/oauth/consent` を作る（Supabase の `authorization_url_path`）。未ログインならログインに回し、ログインのあとに戻す。クライアントの名前と戻り先を見せ、「許可」「拒否」を選ばせる |
| D7 | つなぐアプリ | Claude Code、Claude Desktop、Cursor、Notion AI。どれもリモートの MCP に OAuth でつなぐ。Notion AI は動的なクライアント登録が要る |
| D8 | 読むツール | `get_weekly_report`（週報の本文）、`search_work_records`（期間・案件・タスクで工数を探し、行と合計を返す。ページ送りはサーバーの中で済ませる）、`list_projects`（案件とタスク）、`get_goals`（今の目標と前週からの差。期間を指定すれば過去の目標）、`get_mission` |
| D9 | 書くツール | `log_effort`（日付と「案件名・タスク名・見積・実績」の配列で工数を登録。無い案件とタスクは作る）、`update_goal_progress`（進捗率だけを変える）、`update_mission`、`create_goal_period`（D10） |
| D10 | 目標の期間の追加 | `create_goal_period` は、期間と目標の一覧を受け取り、サーバーで重みの合計 100%・期間の前後・ほかの期間との重なりを確かめて、全部作るか何も作らないかにする。**プレビューと確定の 2 回に分ける**: 1 回目は何も保存せず、作る内容と「編集できなくなる今の目標」の一覧、確認トークンを返す。確認トークンを付けた 2 回目だけ保存する。確認トークンは、作る内容と今の期間に結び付けたハッシュで、内容や状況が変わっていれば保存しない（2026-10-16 に署名つきから変更。決定ログ）。ツールの説明文にも、利用者に確認してから確定するよう書く |
| D11 | 出さない操作 | アカウントの削除、目標の削除（取り消せない）、下書き（画面どうしの同期のための仕組み）、ユーザー設定、エラーの記録 |
| D12 | 先に直すもの（バックログから） | 工数の保存を「全部保存するか何も保存しないか」にする（画面の登録と GAS の取り込みの両方）。目標の期間をまとめて作る API にする（画面の目標の追加も乗り換える）。どちらも DB の関数で 1 つのトランザクションにし、service から `rpc` で呼ぶ（既存の `refresh_projects_with_tasks_mv` と同じ形） |
| D13 | ツールの注釈 | 読むツールは `readOnlyHint: true`。書くツールは `readOnlyHint: false`（アプリが実行の前に許可を求める）。`create_goal_period` は `destructiveHint: true` |
| D14 | テスト | ツールは、SDK のクライアントから `/mcp` を呼ぶ結合テスト（ローカルの Supabase）で確かめる。OAuth の流れは、ローカルの Supabase の OAuth サーバーと web の同意の画面を通す E2E で確かめる。4 つのアプリからの接続は人が確かめる（`manual-checklist.md`） |
| D15 | バージョンと記録 | 機能の追加なので v1.2.0。前提の直し（P2、P3）はそれぞれ改修の記録を作る。MCP の仕様書は `docs/specs/mcp/spec.md` を新しく作る |

## 3. 完成形

```
packages/api/src/
├── features/mcp/
│   ├── index.ts        # /mcp のルート（認証、リクエストごとに McpServer を作る）
│   ├── server.ts       # ツールの登録
│   ├── tools/          # ツールごとの入出力の変換（業務の処理は各機能の service）
│   └── confirmToken.ts # create_goal_period の確認トークン（状態に結び付けたハッシュ）
├── features/effort/    # 保存を DB の関数 1 回にする
└── features/goals/     # 期間をまとめて作る service と API
packages/api/supabase/
├── config.toml         # [auth.oauth_server] を有効にする（ローカル）
└── migrations/         # 工数の保存と、目標の期間の作成の DB 関数
packages/web/src/pages/oauth/ConsentPage.tsx   # 同意の画面
```

- `GET /.well-known/oauth-protected-resource`: 認可サーバー（`<Supabase の URL>/auth/v1`）を示す
- `POST /mcp`: OAuth のトークンでだけ呼べる。Web の画面の JWT（`client_id` なし）も受け付けるかは P1 で決める
- `POST /api/goals/periods`（仮の名前）: 期間の目標をまとめて作る。画面の目標の追加もこれを使う

## 4. フェーズと進捗

> 各フェーズの終わりに人間がレビューしてコミットする。P2 以降の各フェーズは、`autonomous-impl` の工程（改修の記録、TDD、バグ点検、検証、リファクタ、レビュー、ドキュメント）で進める。

### P1. 技術の確かめ（コードは試しに書いて捨てる）
- [x] ⚠️ Zod を 4.2 以上に上げてよいか、人間に確認する。上げて `pnpm check` が通ることを確かめる（2026-10-16。人間の了承を得て zod 4.6.5、`@modelcontextprotocol/server` 2.3.0 を入れた）
- [x] ローカルの Supabase で OAuth サーバーと動的なクライアント登録を有効にし、トークンを 1 つ発行して claim（`iss`、`aud`、`client_id`、署名方式）を確かめる。今の `verifySupabaseAccessToken` で検証できるかも確かめる（ローカルは HS256。非対称の鍵が要るかを含めて）
- [x] トークンの対象（`aud`）を `/mcp` に絞れるか（MCP の仕様が求める RFC 8707 の `resource`）を確かめる。絞れなければ、D5 の `client_id` での判定を守りの中心にし、リスクに書く
- [x] SDK v2 を Workers の上の Hono に載せ、`app.request()` からツールを 1 つ呼べることを確かめる。Hono への載せ方（D2）を決める
- [x] Cursor の自動登録の戻り先（独自のスキームの URL）を、Supabase が受け付けるかを確かめる
- [x] 確かめた結果を決定ログに書き、D2〜D5 を確定する。必要なら計画を直して人間に確かめる

### P2. 工数の保存を「全部か何もないか」にする（effort-entry、effort-ingest-gas の改修の記録）
- [x] 改修の記録を作り、承認を得る（バックログの effort-entry の「送信をまとめて保存する」と、effort-ingest-gas の「1 回の送信を、全部保存するか全部保存しないかにする」。100 時間以上で 500 になる件も、スキーマで 400 にする）
- [x] DB の関数（案件・タスクの検索と作成、工数の行の挿入を 1 つのトランザクションで）とマイグレーション。ローカルの Supabase で結合テスト
- [x] 画面の登録と GAS の取り込みを、その関数に乗り換える。「既知の落とし穴」のテストを先に Red に書き換える
- [x] バックログから、直した項目を消す

### P3. 目標の期間をまとめて作る（goals の改修の記録）
- [x] 改修の記録を作り、承認を得る（バックログの goals の「期間の追加を、1 つの期間の目標をまとめて作る API にし…全部作るか何も作らないかにする。`PUT` は期間を受け付けない」）
- [x] DB の関数（重みの合計、期間の前後、重なりの確認と、目標の作成を 1 つのトランザクションで）とマイグレーション、API、shared のスキーマ（2026-10-16。重なりだけを DB の関数のロックの中で比べ直し、ほかは service で確かめる。改修の記録の「設計の方針」）
- [x] 画面の目標の追加を新しい API に乗り換える（1 件ずつの `POST` をやめる）。「目標名が空の行を黙って捨てる」件もここで直すかを、改修の記録で決める
- [x] バックログから、直した項目を消す

### P4. MCP の土台と読むツール（mcp の改修の記録）
- [ ] 改修の記録を作り、承認を得る（仕様書 `docs/specs/mcp/spec.md` も新しく作る）
- [ ] `/mcp`、保護されたリソースのメタデータ、401 の `WWW-Authenticate`、D5 のトークンの範囲の判定（`/api/*` で OAuth のトークンを 401 にするテストを先に書く）
- [ ] 読むツール 5 つ。SDK のクライアントからの結合テスト（ユーザーごとに自分のデータしか見えないことを含める）

### P5. 書くツール（mcp の改修の記録）
- [ ] 改修の記録を作り、承認を得る
- [ ] `log_effort`、`update_goal_progress`、`update_mission`
- [ ] `create_goal_period` のプレビューと確定。確認トークンの不一致（入力の変更）、プレビューのあとに状況が変わった場合に保存しないことをテストする

### P6. OAuth の同意の画面と、ローカルでの通しの確認
- [ ] ローカルの `config.toml` で OAuth サーバーと動的なクライアント登録を有効にする
- [ ] web の `/oauth/consent`（未ログインならログインに回して戻す。許可・拒否）。3 幅の確認
- [ ] E2E: ローカルで、クライアントの登録 → 同意 → トークン → `/mcp` のツールの呼び出しまで通す
- [ ] Claude Code から `pnpm dev:local` の MCP につないで確かめる（エージェントが確かめられる範囲）

### P7. ⚠️ クラウドの設定、デプロイ、4 つのアプリからの接続（人間と一緒に行う）
- [ ] ⚠️ 開発用の Supabase で、OAuth サーバー、動的なクライアント登録、同意の画面の URL を有効にする（ダッシュボードの操作。必要なら非対称の署名の鍵への切り替え）。人間が行い、エージェントは手順を用意する
- [ ] ⚠️ 開発用へのデプロイ（API、web、マイグレーション）。人間の確認を得てから
- [ ] Claude Code、Claude Desktop、Cursor、Notion AI から開発用につなぎ、読むツールと書くツールを一度ずつ試す（`manual-checklist.md` に手順を書く）
- [ ] ⚠️ 本番への反映は、`release` スキルの手順と人間の判断で行う（この計画の外でもよい）

### P8. ドキュメントと振り返り
- [ ] `docs/specs/mcp/spec.md`、`docs/reference/api.md`（`pnpm api:docs`）、`docs/steering/tech.md`（MCP の SDK）、`authentication.md`（OAuth のトークンの範囲）、`CHANGELOG.md`
- [ ] 振り返り: この計画で使ったフロー（autonomous-impl、plan、工程スキル）の穴を `docs/harness/improvements.md` に書き、移行計画の P8 の残り（スキルの仕上げ、振り返り）を済ませて、両方の計画を `completed/` に移す

## 5. リスクと注意点

- **Supabase の OAuth 2.1 サーバーは beta**: 振る舞いが変わりうる。トークンの claim や動的な登録の挙動は、P1 で実物を確かめてから決める
- **トークンが今の API にも効いてしまう**: D5 で防ぐ。`/api/*` のすべてのルートで OAuth のトークンが 401 になることを、ルートの一覧から作るテストで確かめる（ルートを足しても漏れないように）
- **トークンの対象（`aud`）を絞れないかもしれない**: そのときは D5 の判定が唯一の守りになる。決定ログに残す
- **Cursor の戻り先の URL を受け付けないかもしれない**: P1 で確かめ、だめなら Cursor だけ後回しにするかを人間に確かめる
- **AI からの再送**: `log_effort` は同じ内容を 2 回送ると 2 回登録される（同じ送信を見分ける仕組みが無い）。P2 で全部か何もないかにしたうえで、ツールの説明文に「失敗したら一覧で確かめてから送り直す」と書く。重複の判定まで入れるかは P5 の改修の記録で決める
- **完了のメール**: `log_effort` でも、画面の登録と同じく完了のメールが届く（設定で止められる）。仕様書に書く
- **⚠️ 取り消せない・外に影響する操作**: クラウドの Supabase の設定、シークレットの追加、デプロイは、どれも実行の前に人間に確認する
- **ローカルの OAuth の確認には、外から届く URL が要らない範囲だけを使う**: Claude Desktop、Notion AI のようなクラウドのアプリは、ローカルにはつなげない。開発用のクラウドで確かめる（P7）

## 6. 決定ログ

| 日付 | 決定 | 理由 |
| --- | --- | --- |
| 2026-10-15 | 計画を作成。D1〜D15 | ユーザーとの相談。つなぐアプリが 4 つで、どれもリモートの MCP と OAuth に対応しているため、Supabase の OAuth 2.1 サーバーを使う。書くツールは最初から入れ、目標の追加は期間ごとにまとめ、プレビューと確定の 2 回にする（ユーザーの要望: 今の目標が編集できなくなることを AI から警告させたい） |
| 2026-10-16 | 計画を承認（人間）。ブランチは作らず、今の作業ブランチで進める | ブランチの操作は人間が行う |
| 2026-10-16 | P1: ローカルの Supabase の OAuth 2.1 サーバーで、自動登録 → 認可 → 同意 → トークンまで通した。トークンは ES256 で、今の `verifySupabaseAccessToken` で検証できる。`client_id` と `amr` の `oauth_provider/authorization_code` が入る。`resource` を送っても `aud` は `authenticated` のままで、トークンの対象は絞れない → D5（`client_id` で `/mcp` だけに限る）を守りの中心にする。Cursor 風の戻り先（`cursor://…`）も登録できた。既定のスコープは `email` | 実物で確かめた。リスクの「対象を絞れない」は現実になったので、D5 のテストを厚くする |
| 2026-10-16 | P1: 認可サーバーの情報は `/auth/v1/.well-known/oauth-authorization-server` と `/auth/v1/.well-known/openid-configuration` にある。RFC 8414 の「パスの前に入れる」形（`/.well-known/oauth-authorization-server/auth/v1`）は 404。MCP の仕様はクライアントに OpenID の設定（後ろに足す形）も探させるので、仕様どおりのクライアントは見つけられる。クラウドでの振る舞いは P7 で確かめる | 見つけられないクライアントがあれば、API の側で認可サーバーの情報を中継するかを決める |
| 2026-10-16 | P1: SDK は `@modelcontextprotocol/server` の `createMcpHandler`（リクエストごとに `McpServer` を作る）を Hono のルートから `handler.fetch(c.req.raw, { authInfo })` で呼ぶ。トークンの検証は SDK の `requireBearerAuth` に、今の JWT の検証を包んだ verifier を渡す（401 と `WWW-Authenticate` は SDK が作る）。`@modelcontextprotocol/hono` は使わない。`initialize` なしでも `tools/list` に答え、`.describe()` の説明も JSON Schema に載ることを確かめた | D2 を確定 |
| 2026-10-16 | 改修の記録は 3 つにする: effort-entry v1.1.3（工数の保存を全部か何もないかに。不具合の直し）、goals v1.2.0（期間をまとめて作る API）、mcp v1.2.0（P4〜P6 をまとめる） | ユーザーの指示（フェーズに捉われず進める）。承認のやり取りを減らす |
| 2026-10-16 | D10 を変更（人間の承認待ち）: `confirmToken` は、ユーザー ID・入力・今の期間の状態から作る SHA-256 のハッシュにし、秘密の値も期限も持たない | 目的は「プレビューを見た」ことと「状況が変わっていない」ことの確認で、状態に結び付けたハッシュで足りる。シークレットの追加（人の操作）が要らない。飛ばされても goals の API の確認は必ず通る |
| 2026-10-16 | D14 を変更: ツールの結合テストは `callApi` から JSON-RPC を直接送る（MCP のクライアントの SDK は足さない）。`/mcp` は web のトークンも受け付ける（完成形で「P1 で決める」とした点） | 依存を増やさない。同じユーザーで権限も同じなので、受け付けても守りは変わらない |
