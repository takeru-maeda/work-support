---
title: MCP サーバー（AI のアプリから工数・目標・週報・ミッションを読み書きする）
feature: mcp
status: current
updated: 2026-10-16
code:
  - packages/api/src/features/mcp/index.ts :: mcp
  - packages/api/src/features/mcp/auth.ts :: createTokenVerifier
  - packages/api/src/features/mcp/server.ts :: createMcpServer
  - packages/api/src/features/mcp/tools/context.ts :: runTool
  - packages/api/src/features/mcp/tools/goals.ts :: registerGoalTools
  - packages/api/src/features/mcp/confirmToken.ts :: createConfirmToken
  - packages/api/src/middleware/auth.ts :: isOAuthClientToken
  - packages/api/supabase/migrations/20261016020000_block_oauth_clients_on_avatars.sql
  - packages/web/src/pages/oauth/ConsentPage.tsx :: ConsentPage
  - packages/web/src/features/auth/hooks/useOAuthConsent.ts :: useOAuthConsent
  - packages/web/src/features/auth/utils/oauthConsent.ts :: parseAuthorizationDetails
related: [auth, platform, effort-entry, goals, weekly-report, effort-list, missions, profile]
symptoms:
  - AI のアプリ（Claude、Cursor、Notion AI）から接続できない / 401 になる
  - 連携の画面で「連携の情報が見つからないか、期限が切れています」が出る
  - 連携の画面で許可したのに、アプリに戻らない
  - AI から登録した工数が 2 重になった
  - AI から目標の期間を作ったら、今の目標が編集できなくなった
---

# MCP サーバー（AI のアプリから工数・目標・週報・ミッションを読み書きする）

## TL;DR・改修前の必読

- Claude Code、Claude Desktop、Cursor、Notion AI などの MCP のアプリから、自分の工数・目標・週報・ミッションを読み書きできるようにする、API の `/mcp`（Streamable HTTP、状態を持たない）
- 認可は Supabase の OAuth 2.1 サーバー（アプリの自動登録、web の同意の画面 `/oauth/consent`）。アプリに出たトークンは `client_id` の claim を持ち、この API では `/mcp` だけで受け付ける（INV-mcp-2）
- ツールは各機能の service をそのまま呼ぶ（INV-mcp-1）。画面と同じ確認・同じトランザクションを通る
- ⚠️ 改修の前に [§設計不変条件](#設計不変条件) と [§既知の落とし穴](#既知の落とし穴) を読む。とくに、OAuth のトークンでも Supabase を直接呼べること（Storage はポリシーで止め、Auth は止められない）

## 目的と利用者

- 目的: AI との会話の中で、工数の登録、週報の下書き、目標の進捗の更新・新しい期間の作成をできるようにする（計画書 `docs/plans/active/mcp-server.md`）
- 利用者と使う場面: 「今日の工数を登録して」「今週の週報を作って」「新しい半期の目標を作って」など。接続はアプリの設定に `<API の origin>/mcp` を足し、初回にブラウザで同意する

## 振る舞いと受け入れ基準

### 入口と認証

- **AC-mcp-01**: `POST /mcp` は MCP の Streamable HTTP（状態を持たない。リクエストごとにサーバーを作る）で答える。`GET` / `DELETE /mcp` は 405。`Authorization: Bearer <Supabase のアクセストークン>` が無いか検証に失敗したら、SDK の形の 401（本文は OAuth の誤りの JSON。`error: "invalid_token"`）と `WWW-Authenticate: Bearer … resource_metadata="<API の origin>/.well-known/oauth-protected-resource/mcp"` を返す。この 401 は `error_logs` に残さない（アクセスログには残る）。API の origin はリクエストの URL から取る
- **AC-mcp-02**: `GET /.well-known/oauth-protected-resource/mcp` と `GET /.well-known/oauth-protected-resource` は、認証なしで `{ resource: "<API の origin>/mcp", authorization_servers: ["<SUPABASE_URL>/auth/v1"], bearer_methods_supported: ["header"] }` を返す
- **AC-mcp-03**: `/mcp` は、OAuth のクライアントのトークン（`client_id` あり）も、web の画面のトークンも受け付ける。ツールはトークンのユーザーのデータだけを読み書きする。アクセスログにはユーザー ID が残る

### 読むツール（`readOnlyHint: true`）

- **AC-mcp-04** `get_weekly_report { date? }`: `date`（YYYY-MM-DD）を含む週の週報を返す。省略すると**日本時間の今日**。本文は画面の週報（`GET /api/reports/weekly`）と同じ文字列。構造化した値は `{ weekStart, weekEnd, totalHours, projects: [{ name, totalHours, tasks: [{ name, hours }] }], goals: [{ title, weight, progress, progressDiff }], goalSummary }`。週の区切りは週報の仕様のまま（weekly-report。日本時間にする直しはバックログ）
- **AC-mcp-05** `search_work_records { startDate, endDate, projectName?, taskName? }`: 期間（両端を含み、366 日まで。超えるか終了日が開始日より前なら誤り）の工数の行 `{ date, projectName, taskName, estimatedHours, hours }` を日付の昇順で返す。案件名・タスク名は大文字小文字を区別した完全一致で、元の表（`projects`、`tasks`）を見る。`taskName` だけなら、すべての案件から探す。行は 500 行までで、超えたら `truncated: true`。`count`、`totalHours`、`totalEstimatedHours` は当たった**すべての行**で数える
- **AC-mcp-06** `list_projects {}`: 案件（作った順）と、その中のタスクの名前（作った順）を、元の表から返す。タスクの無い案件も返す
- **AC-mcp-07** `get_goals { includePast? }`: `{ period: { startDate, endDate } | null, goals: [{ id, title, content, weight, progress, progressDiff }], summary: { simpleAverageProgress, weightedAchievementRate } | null }`。期間は終了日がいちばん未来の目標の集まりで、開始日はその中のいちばん早い開始日。前週からの差は、目標の画面と同じ前週の進捗（goals の AC-09、AC-10。日本時間の今日を基準日にする）から出し、小数第 1 位に丸める。`includePast` なら `pastPeriods`（終了日の新しい順の期間と目標）も返す
- **AC-mcp-08** `get_mission {}`: `{ content }`（無ければ空の文字列）

### 書くツール（`readOnlyHint: false`）

- **AC-mcp-09** `log_effort { date, entries: [{ projectName, taskName, estimatedHours?, hours }], memo? }`: 1 要素を `{ project_id: null, project_name, task_id: null, task_name, estimated_hours, hours }` に直して、effort-entry の保存（全部保存するか何も保存しない）で保存する。成功したら `{ date, saved: [{ projectName, taskName, estimatedHours, hours }], createdProjects, createdTasks }`。完了メールは画面の登録と同じ条件（メールアドレスがあり、設定で止めていない）で、応答のあとに送る。誤りなら何も保存せず、メールも送らない
- **AC-mcp-10** `update_goal_progress { goalId, progress（0〜100） }`: 現在の期間の目標の進捗率だけを変え、履歴を残す（goals の INV-2）。現在の期間でない目標、他人の目標、無い目標は誤り「現在の期間の目標が見つかりません。」で、何も変えない
- **AC-mcp-11** `update_mission { content }`: ミッションを書き換える。前後の空白を除いて空なら誤り（API の `PUT /api/missions` は空白だけも受け付けるが、AI からの誤った空の上書きを防ぐ）
- **AC-mcp-12** `create_goal_period { startDate, endDate, goals: [{ title, content, weight }]（1〜20 件）, confirmToken? }`（`destructiveHint: true`）:
  - `confirmToken` が無ければ何も保存せず、goals の `validateGoalPeriod` の結果を返す: `{ errors, period, goals, lockedGoals, warning, confirmToken? }`。`confirmToken` は誤りが無いときだけ
  - `warning` は、今の目標があれば「この期間を作ると、今の期間（yyyy/MM/dd〜yyyy/MM/dd）の目標 N 件は過去の目標になり、編集できなくなります。期間はあとから変えられません。」、無ければ「期間はあとから変えられません。」
  - `confirmToken` があれば、誤りがあれば誤りを返して何も作らない。同じ入力と今の状態から作り直した値と一致しなければ、何も作らず「プレビューのあとに内容か状況が変わりました。もう一度プレビューしてください。」。一致すれば goals の `createGoalPeriodService` で作り、`{ created }` を返す
  - `confirmToken` は、ユーザー ID、入力、今の期間の終了日と目標の ID の一覧の SHA-256（Web Crypto）。秘密の値も期限も持たない（[§設計不変条件](#設計不変条件) の INV-mcp-4）
- **AC-mcp-13**: どのツールも、業務の誤り（AppError の 4xx）は MCP のツールの誤り（`isError: true` と文）で返し、HTTP は 200 のまま。決まった英語の文（「Goal not found…」）は日本語に直す。想定外の誤り（AppError の 5xx を含む）は「処理に失敗しました。時間を空けて再度お試しください。」で返し、`error_logs` に残す。ツールの入力の型の誤りも、SDK が `isError: true` のツールの結果で返す。無いツールの呼び出しは JSON-RPC の誤り

### 同意の画面（web）

- **AC-mcp-14**: `/oauth/consent?authorization_id=…` は `AuthGuard` の外に置き、画面の中でセッションを確かめる。ログインしていなければ `/login?redirect=<元のパスとクエリ>` に移し、ログインのあとで戻す（auth の AC-13）。ログインしているか（Supabase に `getUser` で確かめる）。していれば、Supabase から認可の内容を読み、見出し「アプリの連携を許可しますか？」、アプリの名前（登録していなければ「名前の無いアプリ」）、戻り先、「このアプリが、あなたの工数・目標・週報・ミッションを読み書きできるようになります」と、「許可」「拒否」を出す。許可・拒否のあとは、Supabase が返すアプリの戻り先へ移る。すでに同意したアプリなら、画面を出さずに戻り先へ移る。`authorization_id` が無いか無効・期限切れなら「連携の情報が見つからないか、期限が切れています。連携するアプリからもう一度やり直してください。」と「ホームへ」。許可・拒否に失敗したら「連携の処理に失敗しました。時間を空けて再度お試しください。」のトーストを出し、画面に残る。認可の内容の取得の 404 以外の失敗と、許可・拒否の失敗は `error_logs` に送る（`reportUiError`）

## 画面と API

### 画面
- ルート: `/oauth/consent`（`packages/web/src/config/routes.ts` の `oauthConsent`）。手本はログインの画面（`AuthPageContainer`、`AuthBrand`）。375px ではボタンを縦に並べる
- 主な操作: 許可、拒否

### API
| メソッドとパス | 認証 | 入力 | 出力 | 主なエラー |
| --- | --- | --- | --- | --- |
| `POST /mcp` | Bearer（OAuth のトークン、web のトークン） | JSON-RPC（MCP） | JSON-RPC（JSON か SSE） | 401（SDK の形） |
| `GET` / `DELETE /mcp` | Bearer | なし | 405 | 401 |
| `GET /.well-known/oauth-protected-resource(/mcp)` | なし | なし | 保護されたリソースの情報（RFC 9728） | — |

`/mcp` と `.well-known` は OpenAPI に載せない（`packages/api/scripts/apiReference.ts` の `NON_API_ROUTES`）。ツールの入力のスキーマは `packages/api/src/features/mcp/tools/*.ts`（shared の制約から組み立てる）。

## データ

- テーブルは持たない。各機能の service を通して、`work_records`、`projects`、`tasks`、`goals`、`goal_progress_histories`、`missions`、`user_settings` を読み書きする
- 認可の情報（アプリの登録、同意、トークン）は Supabase Auth が持つ（`auth` スキーマ。この API からは読まない）
- アバターの Storage のポリシーは、`client_id` のあるトークンを拒む（INV-mcp-2）

## 設計不変条件

- **INV-mcp-1**: ツールは HTTP を経由せず、各機能の service を呼ぶ。入力の検証、ユーザーの絞り込み、保存のトランザクションは service と DB の関数の決まりをそのまま使う。ツールの層（`features/mcp/tools/`）は入出力の変換だけを行い、業務の判断を書かない（例外は、AI からの誤った空の上書きを防ぐ `update_mission` の入力の確認）。破ると、画面と MCP で振る舞いがずれる
- **INV-mcp-2**: OAuth のクライアントのトークンは、この API では `/mcp` だけで受け付ける（`jwtAuthMiddleware` が `client_id` のあるトークンを 401 にする。platform の AC-20）。アバターの Storage もポリシーで拒む。破ると、アプリに渡したトークンでアカウントの削除やプロフィール画像の書き換えまでできる。Supabase Auth（`/auth/v1/user`）は止められない（[§既知の落とし穴](#既知の落とし穴)）
- **INV-mcp-3**: 取り消せない操作（アカウントの削除、目標の削除）はツールにしない。破ると、AI の誤った判断で戻せない損失が起きる
- **INV-mcp-4**: `create_goal_period` は、`confirmToken` が「今の入力と状況から作り直した値」と一致するときだけ作る。トークンは認可のためではなく「プレビューを見た」「状況が変わっていない」の確認で、飛ばされても goals の API の確認（goals の AC-23、24）は必ず通る。破ると（トークンを確かめずに作ると）、利用者に警告を見せないまま今の目標が編集できなくなる

## エラー時の挙動

- トークンが無い・無効・期限切れ: 401（SDK の形）。アプリは `WWW-Authenticate` から認可サーバーをたどり、もう一度同意を求める
- ツールの業務の誤り: `isError: true` と日本語の文（HTTP 200）。`error_logs` には残らない
- ツールの想定外の誤り: `isError: true` と「処理に失敗しました。…」。`error_logs` に `MCP tool failed: …` を残す
- 同意の画面: 認可が見つからない・期限切れは画面の文、許可・拒否の失敗はトースト。404 以外の失敗は `error_logs`（source: UI）

## 既知の落とし穴

- **OAuth のトークンで Supabase Auth を直接呼べる**: アプリに出たトークンも `authenticated` の Supabase のトークンなので、`/auth/v1/user`（自分のユーザーの情報。メールアドレスやパスワードの変更を含みうる）を呼べる（ローカルで確かめた）。Supabase の側の仕組みで、この API では止められない。トークンは 1 時間で切れ、渡すのは自分が使うアプリだけ（2026-10-16 の人間の判断）
- **トークンの対象（`aud`）を `/mcp` に絞れない**: Supabase は RFC 8707 の `resource` を無視し、`aud` は常に `authenticated`。そのため INV-mcp-2 を `client_id` の有無で守っている。`/mcp` は web のトークンも受け付ける（AC-03。同じユーザーで権限も同じ）
- **`confirmToken` は自分で計算できる**: 秘密の値を持たないので、入力と `get_goals` の ID を知る AI は、プレビューを飛ばして計算できる。目的は誤操作を防ぐ手順で、認可ではない（INV-mcp-4。計画書の D10 の判断）
- **supabase-js 2.80 の型と、実際の認可の内容の形が違う**: 型は `client.client_name` と「`redirect_uri` があれば同意済み」だが、実際は初回が `{ redirect_uri（アプリの戻り先）, client: { id, name } }`、同意済みが `{ redirect_url（コード付き） }` だけ（ローカルで確かめた）。`parseAuthorizationDetails` で両方を読む。Supabase を上げたら、E2E（`mcpOAuth.spec.ts`）で確かめる
- **認可サーバーの情報の置き場所**: `/auth/v1/.well-known/oauth-authorization-server` と `/auth/v1/.well-known/openid-configuration` にある。RFC 8414 の「パスの前に入れる」形は 404。仕様どおりのアプリは OpenID の形も探すので見つけられるが、見つけられないアプリがあれば API で中継するかを決める
- **応答が SSE のことがある**: 2025 年版のプロトコルの要求（ほとんどのアプリ）には、SDK が SSE で答え、本文を読み進めるあいだにツールが動く。完了メールの `waitUntil` はその途中で呼ばれる（Workers では問題ない）。テストの `callApi` は SSE の本文を読み切ってから待ち合わせる
- **トークンの検証のインフラの失敗も 401 になる**: `/mcp` の verifier は、JWKS の取得の失敗のような一時的な障害も `invalid_token`（401）にし、`error_logs` に残さない。アプリは再認可を求めることがある。続くときはアクセスログの 401 の増え方を見る
- **ほかの Supabase の入口**: OAuth のトークンでも、`authenticated` に実行を許している DB の関数（`refresh_projects_with_tasks_mv` など、baseline の既定の権限）を PostgREST から呼べる。データは読み書きできない関数だが、絞るなら関数ごとに `revoke` する（バックログ）
- **新規登録では戻り先を引き継がない**: アカウントの無い人が同意の画面から `/login` に来て「新規登録」に進むと、登録のあとはホームに移る（auth の AC-13）。アプリからもう一度つなぎ直せば同意の画面に来る
- **ツールの結果に `outputSchema` は付けない**: `structuredContent` は返すが、スキーマは宣言しない（`create_goal_period` のプレビューと作成で形が違い、SDK が結果をスキーマで検証して誤りにするのを避けるため。MCP の仕様では任意）
- **`log_effort` の送り直しで 2 重になる**: 失敗したと思って同じ内容を送ると 2 回登録される。ツールの説明文で、送り直す前に `search_work_records` で確かめるよう案内している
- **週報の週の区切りは UTC**: `get_weekly_report` の「今日」は日本時間で決めるが、週の区切りの計算は週報の仕様のまま（weekly-report の既知の落とし穴）
- **ローカルの `site_url`**: 同意の画面とパスワードの再設定の戻り先は `http://localhost:5183`（`pnpm dev:local` と E2E の web）。クラウドの設定は計画書の P7 で行う

## ポストモーテム

該当なし

## テストとの対応

| AC | テスト | 種類 |
| --- | --- | --- |
| AC-mcp-01〜13 | `packages/api/test/mcp.int.test.ts`（本物の OAuth のトークンは `test/oauthHelpers.ts`） | 結合 |
| AC-mcp-13（想定外の誤り）、日本時間の今日 | `packages/api/src/features/mcp/tools/context.test.ts` | 単体 |
| AC-mcp-12 の誤り（重みの丸めなど） | `packages/api/src/features/goals/service.test.ts` | 単体 |
| INV-mcp-2（`/api/*`、platform の AC-20） | `packages/api/test/oauthTokenScope.int.test.ts`（ルートの一覧から作る） | 結合 |
| INV-mcp-2（Storage） | `packages/api/test/avatar-storage.int.test.ts` | 結合 |
| AC-mcp-14 | `packages/web/src/pages/oauth/ConsentPage.test.tsx`、`packages/web/src/features/auth/utils/oauthConsent.test.ts` | 部品 / 単体 |
| 自動登録 → 同意 → トークン → `/mcp` | `packages/e2e/tests/mcpOAuth.spec.ts` | E2E |
| 4 つのアプリからの接続 | `docs/testing/manual-checklist.md` | 手動 |

## 変更履歴

| バージョン | 日付 | 内容 | 改修の記録 |
| --- | --- | --- | --- |
| v1.2.0 | 2026-10-16 | MCP サーバーを追加（9 つのツール、Supabase の OAuth 2.1、同意の画面） | [v1.2.0-mcp-server](changes/v1.2.0-mcp-server.md) |
