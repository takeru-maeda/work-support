# API の全体像

API（`packages/api`、Hono on Cloudflare Workers）のエンドポイントの一覧。

- **「前提」は手書き**。認証やエラーの形が変わったら、ここを直す
- **「エンドポイント」から下は自動生成**（`pnpm api:docs`）。各ルートの `describeRoute`（説明と応答）、`validator`（パス・クエリ・本文の項目）、かかっている認証のミドルウェアから作る。ルートを変えたら `pnpm api:docs` で作り直す。ずれていると `pnpm test`（CI）が失敗する。`describeRoute` の無いルートも失敗にする（一覧に出ないため）
- 項目の型や制約は `packages/shared/src/schemas/`、振る舞いは各機能の仕様書（`docs/specs/<feature>/spec.md`）を正とする。開発サーバーの Swagger UI（`/ui`）でも同じ定義を見られる

## 前提

- **認証**: 「JWT」は、Web から送る Supabase のアクセストークン（`Authorization: Bearer <token>`）。「API キー」は、GAS / Google Form からの工数の取り込み用。詳しくは `docs/steering/authentication.md` と `docs/specs/platform/spec.md`
- **ユーザー**: どのエンドポイントも、ユーザーはトークンから決まる。パスや本文でユーザー ID は受け取らない
- **エラー**: 失敗は `{ "error": "<メッセージ>", "accessLogId": <番号> }`。`accessLogId` で `access_logs` と `error_logs` をたどれる（`docs/steering/error-handling.md`）。下の「応答」には、`describeRoute` に書いた成功の応答だけが出る（400 の入力エラーや 401 は省いている）
- **記録**: どのリクエストも `access_logs` に 1 行書く

## エンドポイント

<!-- BEGIN GENERATED: pnpm api:docs で作り直す。この間は手で編集しない -->

エンドポイントは 21 個。

### effort（`packages/api/src/features/effort/`）

| メソッド | パス | 認証 | 説明 | パス / クエリ | 本文の項目 | 応答 |
| --- | --- | --- | --- | --- | --- | --- |
| POST | `/api/effort` | API キー | 工数を登録します | — | `date`、`email`、`effort` | 201 |
| DELETE | `/api/effort/draft` | JWT | 工数ドラフトを削除します | — | — | 204 |
| GET | `/api/effort/draft` | JWT | 保存済みの工数ドラフトを取得します | — | — | 200, 204 |
| PUT | `/api/effort/draft` | JWT | 工数ドラフトを保存します | — | `date`、`entries`、`memo`、`clientUpdatedAt` | 200 |
| POST | `/api/effort/entries` | JWT | 工数を保存します | — | `date`、`entries`、`memo` | 201 |

### goals（`packages/api/src/features/goals/`）

| メソッド | パス | 認証 | 説明 | パス / クエリ | 本文の項目 | 応答 |
| --- | --- | --- | --- | --- | --- | --- |
| POST | `/api/goals` | JWT | 目標を新規作成します | — | `title`、`start_date`、`end_date`、`weight`、`content` | 201 |
| DELETE | `/api/goals/:id` | JWT | 目標を削除します | `id` | — | 204 |
| PUT | `/api/goals/:id` | JWT | 目標を更新します | `id` | `title`、`start_date`、`end_date`、`weight`、`progress`、`content` | 200 |
| GET | `/api/goals/current` | JWT | 最新の目標のリストを取得します | — | — | 200 |
| GET | `/api/goals/history` | JWT | 過去の目標を検索します | `query`、`startDate`、`endDate`、`minProgress`、`maxProgress`、`sort`、`page`、`pageSize` | — | 200 |
| GET | `/api/goals/progress/previous-week` | JWT | 前週末時点の最新進捗率を取得します | `referenceDate` | — | 200 |

### logs（`packages/api/src/features/logs/`）

| メソッド | パス | 認証 | 説明 | パス / クエリ | 本文の項目 | 応答 |
| --- | --- | --- | --- | --- | --- | --- |
| POST | `/api/logs/error` | JWT | エラーログを保存します | — | `message`、`stackTrace`、`level`、`source`、`userAgent`、`pageUrl`、`appVersion`、`clientContext` | 201 |

### missions（`packages/api/src/features/missions/`）

| メソッド | パス | 認証 | 説明 | パス / クエリ | 本文の項目 | 応答 |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/api/missions` | JWT | ミッションを取得します | — | — | 200 |
| PUT | `/api/missions` | JWT | ミッションを更新します | — | `content` | 200 |

### projects（`packages/api/src/features/projects/`）

| メソッド | パス | 認証 | 説明 | パス / クエリ | 本文の項目 | 応答 |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/api/projects` | JWT | ユーザーに紐づく案件とタスクを取得します | — | — | 200 |

### reports（`packages/api/src/features/reports/`）

| メソッド | パス | 認証 | 説明 | パス / クエリ | 本文の項目 | 応答 |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/api/reports/weekly` | JWT | 週報の雛形を生成します | `date` | — | 200 |
| GET | `/api/reports/work-records` | JWT | 工数一覧を取得します | `startDate`、`endDate`、`projectId`、`taskId`、`sort`、`page`、`pageSize` | — | 200 |

### user-settings（`packages/api/src/features/user-settings/`）

| メソッド | パス | 認証 | 説明 | パス / クエリ | 本文の項目 | 応答 |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/api/user-settings` | JWT | ユーザー設定を取得します | — | — | 200, 404 |
| POST | `/api/user-settings` | JWT | ユーザー設定を初期化します | — | — | 200, 201 |
| PUT | `/api/user-settings` | JWT | ユーザー設定を更新します | — | `notifyEffortEmail` | 200, 404 |

### users（`packages/api/src/features/users/`）

| メソッド | パス | 認証 | 説明 | パス / クエリ | 本文の項目 | 応答 |
| --- | --- | --- | --- | --- | --- | --- |
| DELETE | `/api/users/me` | JWT | 認証ユーザー自身のアカウントを削除します | — | — | 204, 401, 500 |

<!-- END GENERATED -->
