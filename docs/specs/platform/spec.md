---
title: 基盤（認証、ログ、エラー処理、CORS、OpenAPI、メール送信）
feature: platform
status: current
updated: 2026-10-15
code:
  - packages/api/src/middleware/auth.ts :: jwtAuthMiddleware
  - packages/api/src/middleware/auth.ts :: apiKeyAuthMiddleware
  - packages/api/src/lib/jwt.ts :: verifySupabaseAccessToken
  - packages/api/src/index.ts :: app
  - packages/api/src/middleware/logger.ts :: accessLogMiddleware
  - packages/api/src/middleware/logger.ts :: updateAccessLog
  - packages/api/src/lib/logger.ts :: createLogger
  - packages/api/src/lib/errorHandler.ts :: globalErrorHandler
  - packages/api/src/lib/errors.ts :: AppError
  - packages/api/src/lib/mailer.ts :: sendEffortCompletionEmail
  - packages/api/src/features/logs/index.ts :: logs
  - packages/shared/src/schemas/logs.ts :: ErrorLogCreateRequestSchema
  - packages/web/src/services/logs.ts :: reportUiError
related: [auth, effort-ingest-gas, effort-entry]
symptoms:
  - ログインしているのに、どの画面でもデータが読み込めない（API が 401 を返す）
  - どの画面でも通信がエラーになり、ブラウザのコンソールに CORS のエラーが出る
  - エラーの画面に、DB のエラーの文がそのまま出る
  - 画面で起きたエラーが error_logs に残っていない
---

# 基盤（認証、ログ、エラー処理、CORS、OpenAPI、メール送信）

## TL;DR・改修前の必読

- API の全エンドポイントが通る横断的な仕組み。Web からのリクエストは、Supabase が発行したアクセストークン（JWT）で利用者を確かめる
- すべてのリクエストは、CORS → アクセスログ（DB に 1 行書く）→ 各機能の認証 → 処理、の順に通る。エラーは `globalErrorHandler` が `{ error, accessLogId }` の形で返し、`error_logs` に残す。画面で起きたエラーは `POST /api/logs/error` で同じ表に残す
- ⚠️ 認証を変えるときは [§設計不変条件](#設計不変条件) を読む。ここを壊すと、全員が API を使えなくなるか、なりすましを許す。アクセスログの書き込みは全リクエストの前提で、DB が止まると全部の API が止まる（[§既知の落とし穴](#既知の落とし穴)）

## 目的と利用者

- 目的: どのユーザーからのリクエストかを、改ざんできない形で確かめ、ルートの処理に渡す（`c.get("user")`）。全リクエストとエラーを記録し、あとから調べられるようにする。決まった画面からだけ API を呼べるようにする
- 利用者と使う場面: Web からの全リクエスト（JWT）。GAS / Google Form からの工数の取り込み（API キー。effort-ingest-gas の仕様）。不具合を調べる開発者（`access_logs`、`error_logs`）

## 振る舞いと受け入れ基準

### API の認証（JWT、`jwtAuthMiddleware`）

- **AC-platform-01**: `SUPABASE_JWT_SECRET` で HS256 署名された有効なアクセストークンは認証が通り、`sub` がユーザー ID、`email` がメールアドレスになる
- **AC-platform-02**: そのプロジェクトの JWKS（`<SUPABASE_URL>/auth/v1/.well-known/jwks.json`。`SUPABASE_URL` の末尾の `/` の有無は問わない）にある公開鍵で ES256 / RS256 署名された有効なアクセストークンは、認証が通り、`sub` がユーザー ID、`email` がメールアドレスになる
- **AC-platform-03**: 署名が合わない、期限切れ、JWKS に無い鍵（`kid`）で署名された、ES256 / RS256 なのに `kid` が無い、`sub` が無い（anon / service_role のキーなど）、のどれかのトークンは 401
- **AC-platform-04**: 許可していない署名方式（`none`、HS512 など、HS256 / ES256 / RS256 以外）のトークンは 401
- **AC-platform-05**: `Authorization: Bearer` が無い・形式が違うときは 401
- **AC-platform-06**: JWKS の取得に失敗したとき、公開鍵方式のトークンは 401 になり、500 にはならない。HS256 のトークンは JWKS を取りに行かない
- **AC-platform-07**（非機能）: 取得した JWKS は isolate の中で 10 分使い回し、リクエストのたびには取りに行かない。JWKS に無い `kid` が来たときは取り直すが、取り直しは 30 秒に 1 回まで。取得に失敗したあとも、30 秒は取りに行かずに失敗させる（Supabase の障害時や不正なトークンで、問い合わせが殺到したり、リクエストが待たされたりしないように）

OPTIONS（CORS のプリフライト）は認証をとばす。

### リクエストの流れとアクセスログ

- **AC-platform-08**: リクエストは、CORS、アクセスログ、コンソールのログ、各機能のルート（それぞれの認証）の順に通る。ルートは `/api/effort`、`/api/missions`、`/api/goals`、`/api/projects`、`/api/reports`、`/api/user-settings`、`/api/users`、`/api/logs` の下と、`GET /`（「Hello Work Support」）、`GET /openapi`、`GET /ui`。どれにも当たらないパスは 404（本文は「404 Not Found」の文字）。機能の下の存在しないパスは、トークンが無い・無効なら 401（認証が先にかかる）、有効なら 404。`/api/effort` の下は、GAS の API キーで呼んでも JWT が求められて 401
- **AC-platform-09**: OPTIONS 以外のすべてのリクエストで、処理の前に `access_logs` に 1 行（IP、パス（クエリは含まない）、メソッド）を書き、応答のあとで（`waitUntil`）同じ行にユーザー ID、ステータス、処理時間（ミリ秒）を入れる。アクセスログを書けなければ処理を続けない（`{ error, accessLogId }` の形にはならず、Workers の例外の 500 になる。[§既知の落とし穴](#既知の落とし穴)）。ルートで例外が出たときは、アクセスログの更新が `globalErrorHandler` とミドルウェアの両方から 2 回走る
- **AC-platform-10**: Workers のログ（observability）も有効で、全リクエストを残す（`wrangler.jsonc` の設定）

### エラーの応答と記録

- **AC-platform-11**: `AppError` は、その状態コードとメッセージで `{ error: <メッセージ>, accessLogId: <番号> }` を返す。それ以外の例外（ルートが応答を `Schema.parse` で確かめて失敗したときの ZodError、壊れた JSON の本文などの Hono の例外を含む）は `500 { error: "Internal Server Error", accessLogId }`（壊れた JSON は 400 ではなく 500。ローカルで確かめた）
- **AC-platform-12**: `globalErrorHandler` を通るエラーは、応答のあとで（`waitUntil`）`error_logs` に 1 行（レベル、メッセージ、スタックトレース、出どころ（`/api/logs/error` なら UI、それ以外は API）、User-Agent、ページの URL（API の URL）、アプリのバージョン（`x-app-version` のヘッダー）、アクセスログの ID）を書く。`AppError` に元のエラーがあれば、`AppError` のメッセージの代わりに元のエラーのメッセージを記録する。書けなくても応答は変わらない（コンソールに出すだけ）
- **AC-platform-13**: リクエストの入力の検証（`validator`）の失敗は、`globalErrorHandler` を通らず、`400 { data: <受け取った入力>, error: [<検証の問題>], success: false }` を返す（`error_logs` には残らない）

### CORS

- **AC-platform-14**: 許可する Origin は、環境変数 `PROD_FRONTEND_URL` と `DEV_FRONTEND_URL`（無ければ `http://localhost:5173`）に完全に一致するものだけ。許可した Origin には `Access-Control-Allow-Origin` を返す。許可するメソッドは GET / POST / PUT / DELETE / OPTIONS、ヘッダーは `Content-Type` と `Authorization`、資格情報を許可（`Access-Control-Allow-Credentials: true`）、プリフライトの結果は 1 日使い回す
- **AC-platform-15**: 許可していない Origin からのリクエストにも、サーバーは処理をして応答を返す（`Access-Control-Allow-Origin` を付けないので、ブラウザが読めないだけ。ローカルで確かめた）

### OpenAPI

- **AC-platform-16**: `GET /openapi` は全ルートの OpenAPI の定義を、`GET /ui` は Swagger UI を返す。どちらも認証なしで、本番でも開ける（ローカルで確かめた。本番では出さないように直す予定。[v1.0.7-baseline](changes/v1.0.7-baseline.md) の人間の判断 1）。全ルートに `describeRoute` があり、`docs/reference/api.md` が定義と一致することをテスト（`apiReference.test.ts`）で確かめる

### 画面からのエラーの記録（`POST /api/logs/error`、JWT）

- **AC-platform-17**: 本文は `{ message（1 文字以上）, stackTrace?, level: WARNING | ERROR | CRITICAL, source: API | UI, userAgent?, pageUrl?, appVersion?, clientContext? }`。`error_logs` に 1 行書き、`201 { id, recordedAt }` を返す。User-Agent が無ければリクエストのヘッダーの値を使う。大きさの上限と回数の制限は無い
- **AC-platform-18**: web の `reportUiError(error, options)` は、メッセージ（指定 → `Error` のメッセージ → オブジェクトなら JSON（`null` は `"null"`）→ `undefined` なら「Unknown error」→ それ以外は文字列にしたもの。空になると送る前の検証で例外になり、送られない）、スタック、レベル（既定 ERROR）、`source: "UI"`、ブラウザの User-Agent、今の URL、アプリのバージョン（`VITE_APP_VERSION`。web の `package.json` の版）、追加の情報を送る。ログインしていないと 401 で送れない

### メールの依頼

- **AC-platform-19**: メールは自前で送らず、GAS の宛先（`GAS_EMAIL_ENDPOINT`）に `{ to, subject, body, apikey: <API_KEY> }` を POST して頼む。応答は `{ success, status, message }`。通信の失敗、HTTP のエラー、`success: false` なら失敗（`AppError` 500）。2xx で本文の形が合わないときは成功として扱う。送り先などの形が合わないと ZodError になる。今は工数登録の完了メールだけが、応答のあとで（`waitUntil`）使うので、失敗は利用者への応答に出ない（effort-entry の AC-09、10）

## 画面と API

### 画面
該当なし（画面を持たない）

### API
| メソッドとパス | 認証 | 入力 | 出力 | 主なエラー |
| --- | --- | --- | --- | --- |
| `POST /api/logs/error` | JWT | `ErrorLogCreateRequestSchema` | `ErrorLogCreateResponseSchema`（201） | 400、401、500 |
| `GET /openapi` / `GET /ui` | なし | なし | OpenAPI の定義 / Swagger UI | — |

JWT の認証は、effort（GAS の取り込みを除く）、goals、logs、missions、projects、reports、user-settings、users の各ルートにかかる。失敗はすべて `401 { "error": "Unauthorized", "accessLogId": ... }`（形は `globalErrorHandler` が決める）。

## データ

- 認証そのものは DB を使わない（トークンの検証だけ）
- [access_logs](../../reference/database.md#access_logs): 全リクエストで 1 行（ユーザーを消すと `user_id` は NULL）。[error_logs](../../reference/database.md#error_logs): API と UI のエラー（`access_log_id` でリクエストとたどれる）。[info_logs](../../reference/database.md#info_logs): 情報のログ（今は書く処理が無い）。どれも RLS は有効でポリシーが無く、service role だけが読み書きする。消す仕組み（保持の期間）は無い
- 環境変数: `SUPABASE_URL`（JWKS の URL の元）、`SUPABASE_JWT_SECRET`（HS256 の検証用）、`SUPABASE_SERVICE_ROLE_KEY`、`API_KEY`（GAS の取り込みとメールの依頼の両方）、`GAS_EMAIL_ENDPOINT`、`PROD_FRONTEND_URL` / `DEV_FRONTEND_URL`（CORS）。`DEVELOPER_EMAIL`、`APP_EMAIL`、`GOOGLE_*` は宣言だけで使っていない

## 設計不変条件

- **INV-1**: 共有シークレット（`SUPABASE_JWT_SECRET`）は HS256 のトークンの検証にだけ使い、公開鍵方式のトークンは JWKS の鍵でだけ検証する。許可する署名方式は HS256 / ES256 / RS256 だけ。破ると、署名方式を偽ったトークン（`alg: none` や、公開されている情報で作った署名）で、任意のユーザーになりすませる
- **INV-2**: Cloudflare Workers では、あるリクエストで始めた通信を別のリクエストから待たない。JWKS は jose の `createRemoteJWKSet` で取得する（Workers の上では取得中の通信を共有しない作り）。破ると、同時に来たリクエストが失敗する
- **INV-3**: ユーザー ID は検証済みのトークンの `sub` からだけ取る。リクエストの本文やクエリの値を信用しない（`docs/steering/authentication.md`）。破ると、他人のデータを読み書きできる
- **INV-4**: `globalErrorHandler` を通るエラーの応答は `{ error, accessLogId }` の形にし、`accessLogId` で `access_logs` と `error_logs` をたどれるようにする（`docs/steering/error-handling.md`）。新しいエラーは `AppError` で投げてここを通す。破ると、利用者が伝えた番号から原因をたどれなくなる。今の例外は、入力の検証の失敗（AC-13）と 404（AC-08）
- **INV-5**: CORS で許可する Origin は、環境変数の完全一致だけ。ワイルドカードや前方一致にしない（資格情報を許可しているので）。破ると、ほかのサイトから利用者のトークンで API を呼ばれうる

## エラー時の挙動

- トークンの検証に失敗したとき: 401。原因（署名の不一致、期限切れ、JWKS の取得の失敗など）は `AppError` の内部のエラーとして `error_logs` に残る
- DB の失敗: 各機能は `AppError(500, "<処理> に失敗: <DB のエラーの文>")` で投げ、その文が**そのまま応答に出る**（[§既知の落とし穴](#既知の落とし穴)）
- 画面: 多くの画面は、失敗をトーストで知らせ、`reportUiError` で `error_logs` に送る
- JWKS の取得に失敗し続けるとき: 公開鍵方式のトークンは 30 秒ごとに 1 回だけ取得を試み、それ以外はすぐ 401。HS256 のトークンには影響しない

## 既知の落とし穴

- **ローカルの Supabase は公開鍵方式（ES256）で署名する**（Supabase CLI 2.120。HS256 には戻せない）。本番と開発用は、2026-10-13 の時点では HS256。どちらのトークンも通るが、テストでは両方を確かめる
- **本番の署名の鍵を公開鍵方式に切り替える前に**: この仕様（AC-platform-02）が本番に出ていることを確かめる。出ていないと、切り替えた瞬間に全員が 401 になる
- テスト（Vitest）は jose を Workers と同じ `dist/browser` の版で読み込む（`packages/api/vitest.shared.ts`）。Node 向けの版は JWKS の取得に `http` を使い、本番と挙動がずれる
- `aud` / `iss` は確かめていない（Supabase のプロジェクトの鍵で署名され、`sub` があるトークンは、用途を問わず通る）
- **DB のエラーの文が応答に出る**: 各機能のリポジトリは、DB のエラーの文を `AppError` のメッセージに入れ、そのまま利用者に返す（例: goals の「Failed to search goals: "failed to parse logic tree ..."」）。旧ドキュメントは、予期しないエラーは一般的な文にするとしていた
- **アクセスログが書けないと全部止まる**: 処理の前にアクセスログを DB に同期で書く。DB が止まると全リクエストが 500 になり、その 500 の処理の中でもアクセスログの ID を読んで例外になり、CORS のヘッダーの無い応答になる（ブラウザには CORS のエラーに見える。コードから。未確認）
- **401 のたびに 2 行書く**: 認証の失敗のたびに、`access_logs` と `error_logs`（ERROR）に 1 行ずつ書く。ボットの通信でも増え、消す仕組みが無い
- **壊れた JSON は 500**: Hono の `HTTPException` を `AppError` として扱わないので、利用者の入力の誤りが 500 と ERROR の記録になる
- **検証の失敗と 404 はたどれない**: 入力の検証の失敗（`{ data, error, success: false }`）と 404（文字の「404 Not Found」）は `accessLogId` を返さず、`error_logs` にも残らない（INV-4 の例外）
- **予期しない例外のメッセージが残らない**: `error_logs.message` は「Internal Server Error」になり、本当のメッセージはスタックトレースの中だけ
- **開発用の Origin が本番でも許可される**: 本番で `DEV_FRONTEND_URL` を設定していないと、`http://localhost:5173` が許可される
- **エラーの記録の API に上限が無い**: 本文の大きさと回数の制限が無い。ログインした利用者なら、`source: "API"` や `level: "CRITICAL"` も書ける
- **画面のエラーの送信が失敗を投げる**: `reportUiError` は、空のメッセージ、ログアウト中（401）、通信の失敗で例外になる。`void` で呼ぶ所では処理されない例外になり、`await` で呼ぶ所ではエラーの処理の外に漏れる
- **アプリのバージョンが API のエラーに入らない**: API は `x-app-version` のヘッダーを読むが、web は送らない（CORS でも許可していない）
- **CRITICAL のメールは無い**: 旧要件の「CRITICAL のエラーは開発者にメールで知らせる」は実装されていない。作らないと決めた（人間の判断 2）
- **メールの失敗が記録されない**: 完了メールの依頼の失敗を捕まえない（effort-entry の既知の落とし穴）。GAS が JSON 以外を返すと解析の例外になる
- **同じ `API_KEY` を両方向に使う**: GAS からの取り込みの認証と、GAS へのメールの依頼に同じキーを使う
- **アカウントの削除のリクエストのアクセスログは更新できない**: 消したユーザーの ID を入れようとして外部キーに反する（profile の既知の落とし穴）

## ポストモーテム

該当なし

## テストとの対応

| AC | テスト | 種類 |
| --- | --- | --- |
| AC-platform-01 | `packages/api/src/middleware/auth.test.ts`、`packages/api/test/fresh-user.int.test.ts` | 単体、結合 |
| AC-platform-02 | `packages/api/src/middleware/auth.test.ts`、`packages/api/src/lib/jwt.test.ts`（JWKS の URL）、`packages/api/test/fresh-user.int.test.ts`（ローカルの Supabase で本物のログイン） | 単体、結合 |
| AC-platform-03 | `packages/api/src/middleware/auth.test.ts`、`packages/api/src/lib/jwt.test.ts` | 単体 |
| AC-platform-04 | `packages/api/src/middleware/auth.test.ts`、`packages/api/src/lib/jwt.test.ts` | 単体 |
| AC-platform-05 | `packages/api/src/middleware/auth.test.ts`、`packages/api/test/fresh-user.int.test.ts` | 単体、結合 |
| AC-platform-06 | `packages/api/src/middleware/auth.test.ts` | 単体 |
| AC-platform-07 | `packages/api/src/lib/jwt.test.ts` | 単体 |
| INV-1 | `packages/api/src/lib/jwt.test.ts` | 単体 |
| INV-2 | jose の実装の確認（`jwks/remote.js` の Workers の分岐）。Node のテストでは再現できない | 確認のみ |
| AC-platform-16 | `packages/api/scripts/apiReference.test.ts`（全ルートの `describeRoute` と、`api.md` が定義と一致すること） | 単体 |
| AC-platform-08、09、11〜15、17、INV-4、INV-5 | 未（P6。`*.int.test.ts` でアクセスログとエラーの記録、CORS のヘッダー） | 結合 |
| AC-platform-10 | 確認のみ（`packages/api/wrangler.jsonc` の `observability`） | 確認のみ |
| AC-platform-18 | 未（P6。Testing Library + MSW） | 部品 |
| AC-platform-19 | 未（P6。`mailer.ts` の単体テストで fetch を差し替え、失敗の判定を確かめる。結合テストでは `packages/api/test/setup.ts` がメールの依頼を横取りする） | 単体、結合 |

## 変更履歴

| バージョン | 日付 | 内容 | 改修の記録 |
| --- | --- | --- | --- |
| v1.0.7 | 2026-10-15 | 移行時点の基準（リクエストの流れ、ログ、エラー処理、CORS、OpenAPI、メールの依頼の節を足した） | [v1.0.7-baseline](changes/v1.0.7-baseline.md) |
| v1.1.0 | 2026-10-13 | API の認証を公開鍵方式（JWKS）のアクセストークンにも対応させた。この spec.md を認証の部分から作成 | [v1.1.0-auth-asymmetric-jwt](changes/v1.1.0-auth-asymmetric-jwt.md) |
