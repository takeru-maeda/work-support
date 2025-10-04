# 詳細設計書

## 1. 技術スタック

| カテゴリ | 技術 | 備考 |
| :--- | :--- | :--- |
| 言語 | TypeScript | |
| バックエンド | Hono.js | Cloudflare Workersにデプロイ |
| フロントエンド | React (Vite) | Vercelにデプロイ |
| データベース | Supabase | |
| APIドキュメンテーション | hono-openapi | OpenAPI仕様の自動生成 |
| フォーム | Googleフォーム | Google Apps ScriptからHTTPリクエストを送信 |
| ルーティング | React Router | |
| スキーマバリデーション | Zod | |
| UIコンポーネント | shadcn/ui | |
| 状態管理 | zustand | UI状態 |
| データ取得 | SWR | サーバー状態 |
| CSSフレームワーク | Tailwind CSS | |
| HTTPクライアント | axios | SWRのfetcherとして利用 |

### 1.2. プロジェクト構成

本プロジェクトは、バックエンド、フロントエンド、共有コードを単一のリポジトリで管理するモノレポ構成を採用する。`pnpm` の `workspaces` 機能の利用を想定している。

```
/
├── @docs/
├── packages/
│   ├── api/          # バックエンド (Hono.js)
│   ├── web/          # フロントエンド (React + Vite)
│   └── shared/       # 共有コード (型定義など)
├── .gitignore
├── package.json      # モノレポ全体を管理
└── tsconfig.base.json # 共有TypeScript設定
```

### 1.3. バックエンドアーキテクチャ

`packages/api` は、機能ごとに責務を分割する **フィーチャーベース（Vertical Slice）アーキテクチャ** を採用する。これにより、コードの凝集性を高め、拡張性とメンテナンス性を向上させる。

#### 1.3.1. ディレクトリ構成

```
packages/api/src/
├── features/
│   ├── effort/
│   │   ├── index.ts      # ルート定義 (Hono)
│   │   ├── service.ts    # ビジネスロジック
│   │   └── repository.ts # データアクセス (DB)
│   ├── goals/
│   │   # ... (同様の構成)
│   # ... (他のフィーチャー)
│
├── middleware/
│   ├── auth.ts           # 認証ミドルウェア
│   └── logger.ts         # ログミドルウェア
│
├── lib/
│   └── supabase.ts       # Supabaseクライアントの初期化
│
├── index.ts              # アプリケーションのエントリポイント
└── custom-types.ts       # Honoの型拡張など
```

#### 1.3.2. 各ファイルの責務

フィーチャー内の各ファイルは、以下の通り責務を明確に分離する。

*   **`index.ts` (ルーティング層):**
    *   HTTPリクエストの受付窓口。
    *   Honoのルート定義、リクエスト検証 (Zod)、認証ミドルウェアの適用を行う。
    *   `Service`を呼び出し、結果をクライアントに返す。

*   **`service.ts` (ビジネスロジック層):**
    *   アプリケーション固有のユースケースやビジネスルールを実装する。
    *   HTTPの概念には関与しない。
    *   `Repository`を介してデータ操作を行う。

*   **`repository.ts` (データアクセス層):**
    *   データベース (Supabase) との通信を抽象化する。
    *   CRUD操作を実装し、`Service`に対して具体的なDB実装を隠蔽する。

## 2. 認証

### 2.1. Web UI認証
- **方式:** Supabaseが提供するメールアドレスとパスワードによる認証を利用する。
- **ライブラリ:** フロントエンド（React）で `@supabase/supabase-js` を使用して実装する。

### 2.2. APIキー認証 (Google Apps Script)
- **目的:** Google Apps ScriptからのHTTPリクエストが、正当なアプリケーションから送信されたものであることを認証する。
- **キー管理:** アプリケーション全体で単一の固定APIキーを使用する。このキーはバックエンドの環境変数（Secret）として管理し、GAS側にも同じ値を設定する。

#### 認証フロー
1.  **[GAS] リクエスト送信:**
    - GASは、`Authorization: Bearer <固定APIキー>` ヘッダーを付与して、バックエンド (`/api/effort`) にリクエストを送信する。
2.  **[バックエンド] 固定APIキー検証:**
    - バックエンドは、リクエストヘッダーのAPIキーと、環境変数に設定されたAPIキーが一致するかを検証する。
    - 一致しない場合、`401 Unauthorized` エラーを返す。
3.  **[バックエンド] ユーザー特定:**
    - APIキーが有効な場合、リクエストペイロードに含まれるメールアドレス (`email`) を取得する。
    - 取得したメールアドレスを基に、データベースの `auth.users` テーブルを検索し、ユーザー情報を特定する。
    - ユーザーが見つからない場合、`400 Bad Request` などのエラーを返す。
    - ユーザーが見つかった場合、そのユーザー情報を含めて後続の処理を実行する。

### 2.3. フロントエンド・バックエンド間 認証フロー

フロントエンド（React）からバックエンド（Hono）のAPIを呼び出す際の認証は、以下の流れで行う。

1.  **[フロント] ログイン:**
    - ユーザーがメールアドレスとパスワードでログインする。
    - Supabaseから返却されたJWT（アクセストークン）は `@supabase/supabase-js` によって自動的にブラウザのLocalStorageに保存される。

2.  **[フロント] APIリクエスト:**
    - APIを呼び出す際、LocalStorageからJWTを取得する。
    - 取得したJWTを、`axios` などのHTTPクライアントを使い、リクエストの `Authorization: Bearer <JWT>` ヘッダーに設定してバックエンドに送信する。

3.  **[バックエンド] リクエスト検証:**
    - APIエンドポイントは、まずリクエストヘッダーからJWTを検証する。
    - SupabaseのAdminクライアント (`service_role` キーを使用) の `getUser(jwt)` 関数を呼び出し、JWTが有効であり、どのユーザーのものかを検証する。
    - 検証に成功した場合のみ、後続の処理を実行する。

## 3. データ構造

### 3.1. リクエストペイロード (Googleフォーム)

Googleフォームからの送信は、Google Apps Scriptを利用してPOSTリクエストを送信することで実現する。フォームの質問は「日付」と「工数」の2つのみとする。

```typescript
import { z } from "zod";

// Googleフォームからのリクエストペイロードのスキーマ
export const EffortRequestSchema = z.object({
    date: z.coerce.date(),
    email: z.email(),
    effort: z.string(),
});

export type EffortRequest = z.infer<typeof EffortRequestSchema>;
```

#### Google Apps Script サンプル

Googleフォームのスクリプトエディタに設定するコードのサンプル。フォーム設定で「メールアドレスを収集する」を有効化していることを前提とする。

```javascript
function onSubmit(e) {
  const respondentEmail = e.response.getRespondentEmail();
  const data = {
    date: e.response.getItemResponses()[0].getResponse(),
    email: respondentEmail,
    effort: e.response.getItemResponses()[1].getResponse(),
  };

  const API_ENDPOINT = "YOUR_API_ENDPOINT";
  const API_KEY = "YOUR_API_KEY";
  const DEVELOPER_EMAIL = "your-developer-email@example.com";

  const options = {
    method: "post",
    contentType: "application/json",
    headers: { "Authorization": "Bearer " + API_KEY },
    payload: JSON.stringify(data),
    muteHttpExceptions: true,
  };

  try {
    const response = UrlFetchApp.fetch(API_ENDPOINT, options);
    const responseCode = response.getResponseCode();

    // 失敗したら開発者にメール通知
    if (responseCode >= 400) {
      const body = `工数登録でエラーが発生しました。\n\nUser: ${respondentEmail}\nCode: ${responseCode}\nResponse: ${response.getContentText()}`;
      MailApp.sendEmail(DEVELOPER_EMAIL, "工数登録エラー", body);
    }
  } catch (error) {
    // fetch自体の失敗
    MailApp.sendEmail(DEVELOPER_EMAIL, "工数登録API呼び出しエラー", error.toString());
  }
}
```

#### ペイロードサンプル

```json
{
  "date": "2025-09-23",
  "email": "user.from.google.session@example.com",
  "effort": "■案件マッチングツール\n・データ抽出バッチ改修：[2]<2.5>\n・フロント改修：[5.75]<3>\n\n■その他\n・タスク管理：[0.25]<0.25>"
}
```

## 4. ビジネスロジック

### 4.1. 工数テキストの解析ルール

Googleフォームの「工数」テキストエリアから送信される複数行のテキストを解析し、`work_records`テーブルに保存する複数のレコードに変換する。

#### 入力テキスト形式

```
■<案件名1>
・<タスク名1-1>：[<見積1-1>]<実績1-1>
・<タスク名1-2>：[<見積1-2>]<実績1-2>

■<案件名2>
・<タスク名2-1>：[<見積2-1>]<実績2-1>
```

#### 解析ルール

1.  テキスト全体を改行で分割する。
2.  行頭が `■` で始まる行を**案件**として解釈し、後続のタスク行のコンテキストとして保持する。
3.  行頭が `・` で始まる行を**タスク**として解釈し、正規表現を用いて各要素を抽出する。
    *   **正規表現**: `^・(.+?)：\[(.*?)\]<(.*?)>
    *   **グループ1**: タスク名
    *   **グループ2**: 見積工数（数値）。空文字列の場合は`null`とする。
    *   **グループ3**: 実績工数（数値）。空文字列の場合は`null`とする。
4.  抽出した各情報と、案件名、`work_date`等を組み合わせて、`work_records`テーブルに保存するレコードを生成する。

#### 解析例

**入力:**
```
■案件マッチングツール
・データ抽出バッチ改修：[2]<2.5>
・フロント改修：[5.75]<3>
・バックエンド改修：[]<2.75>

■その他
・タスク管理：[0.25]<0.25>
```

**出力（`work_records`に保存されるデータのイメージ）:**
```json
[
    {
        "project_name": "案件マッチングツール",
        "task_name": "データ抽出バッチ改修",
        "estimated_hours": 2,
        "hours": 2.5
    },
    {
        "project_name": "案件マッチングツール",
        "task_name": "フロント改修",
        "estimated_hours": 5.75,
        "hours": 3
    },
    {
        "project_name": "案件マッチングツール",
        "task_name": "バックエンド改修",
        "estimated_hours": null,
        "hours": 2.75
    },
    {
        "project_name": "その他",
        "task_name": "タスク管理",
        "estimated_hours": 0.25,
        "hours": 0.25
    }
]
```

### 4.2. 週報の対象期間算出ロジック

`GET /api/reports/weekly` エンドポイントで利用される、週報の対象期間（月曜日〜金曜日）を算出するためのロジック。

1.  APIリクエストで受け取った日付 (`date` パラメータ) を基点とする。
2.  その日付が属する週の月曜日を取得する。
    - 週の始まりは月曜日として計算する。
3.  算出した月曜日の日付を `startDate` とする。
4.  `startDate` に4日を加算した日付を `endDate` (金曜日) とする。
5.  `{ startDate, endDate }` をレポートの対象期間とする。

### 4.3. 目標進捗サマリーの算出ロジック

週報で表示する「目標進捗サマリー」の各指標を算出するためのロジック。

**前提**:
*   計算対象は、レポート対象週と期間が重複する目標のみ。

**サマリー指標の計算方法**:

1.  **単純平均進捗率 (`進捗率`)**:
    *   `対象目標のprogressの合計値 / 対象目標の数` で算出。

2.  **加重達成率**:
    *   `SUM(progress * weight) / SUM(weight)` で算出。

3.  **期待値**:
    *   まず目標ごとに `(経過日数 / 全期間日数) * 100` で期待進捗率を算出。
    *   その後、`SUM(期待進捗率 * weight) / SUM(weight)` で全体の期待値を算出。

4.  **期待値との差**:
    *   `加重達成率 - 期待値` で算出。

5.  **進捗差分 (`(+...%)`)**:
    *   レポート対象週の月曜日から日曜日までの期間における進捗の変化率を算出する。
    *   **個別の目標**:
        *   `週末時点の進捗率` - `週初時点の進捗率` で算出。
        *   `週末時点の進捗率`: `goals`テーブルの現在の`progress`値。
        *   `週初時点の進捗率`: レポート対象週の月曜日より前に記録された最後の`goal_progress_histories`レコードの`progress`値。該当する履歴がない場合は0とする。
    *   **全体 (単純平均進捗率)**:
        *   `週末時点の単純平均進捗率` - `週初時点の単純平均進捗率` で算出。
    *   **全体 (加重達成率)**:
        *   `週末時点の加重達成率` - `週初時点の加重達成率` で算出。

## 5. API設計

| Method | Endpoint | 認証 | 説明 |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/effort` | 固定APIキー | **工数登録**: 外部からのHTTPリクエストを受信し、工数を登録する。 |
| `GET` | `/api/reports/weekly` | JWT | **週報生成**: 指定された日付 (`?date=YYYY-MM-DD`) が属する週の月曜〜金曜の週報データを生成して返す。 |
| `GET` | `/api/missions` | JWT | **ミッション取得**: 現在のミッションを取得する。 |
| `PUT` | `/api/missions` | JWT | **ミッション更新**: ミッションを更新する。 |
| `GET` | `/api/goals` | JWT | **目標取得**: `end_date`が最も未来日に設定されている期間の目標群を取得する。 |
| `POST` | `/api/goals` | JWT | **目標作成**: 新しい目標を作成する。 |
| `PUT` | `/api/goals/:id` | JWT | **目標更新**: 指定したIDの目標を更新する。 |
| `DELETE`| `/api/goals/:id` | JWT | **目標削除**: 指定したIDの目標を削除する。 |

## 6. ミドルウェア設計

バックエンド（Hono）では、認証などの共通処理をミドルウェアとして実装し、ルートに適用する。

### 6.1. 認証ミドルウェア

認証方式ごとに、責務を分割したミドルウェアを作成する。

#### 6.1.1. `jwtAuthMiddleware`

-   **責務:**
    -   リクエストヘッダーの `Authorization: Bearer <JWT>` からJWTを取得する。
    -   Supabaseの `getUser(jwt)` 関数を使い、JWTを検証し、ユーザー情報を取得する。
    -   取得したユーザー情報を、後続のハンドラで利用できるようコンテキスト (`c.set('user', ...)` に格納する。
    -   検証に失敗した場合は `401 Unauthorized` エラーを返す。
-   **適用範囲:**
    -   フロントエンドから呼び出される全てのAPIルート (`/api/*`)。ただし、APIキー認証を行う `/api/effort` は除く。

#### 6.1.2. `apiKeyAuthMiddleware`

-   **責務:**
    -   リクエストヘッダーの `Authorization: Bearer <APIキー>` から固定APIキーを取得し、環境変数の値と照合する。
    -   検証に成功した場合、リクエストペイロードからメールアドレスを取得し、データベースを検索してユーザー情報を特定する。
    -   特定したユーザー情報をコンテキスト (`c.set('user', ...)` に格納する。
    -   検証に失敗した場合は `401 Unauthorized` または `400 Bad Request` を返す。
-   **適用範囲:**
    -   外部サービスからのリクエストを受信する `/api/effort` ルートに限定して適用する。

## 7. ログ設計

アプリケーションの動作を追跡し、問題発生時の調査を容易にするため、データベースにログを記録する。

### 7.2. アクセスログミドルウェア (`accessLogMiddleware`)

- **責務:**
    - 全てのルート (`*`) のリクエストに対して、認証ミドルウェアよりも先に適用される。
    - リクエスト受信時に、IPアドレス、パス、受信時刻などの情報を取得する。
    - 後続の処理 (`next()`) を実行する。
    - 処理完了後、レスポンスのステータスコード、処理時間などを取得する。
    - 認証ミドルウェアによってコンテキストにセットされた `user_id` があれば、それも取得する。
    - 収集した情報を `access_logs` テーブルに非同期で書き込む。
    - 生成した `access_log_id` をコンテキストにセットし、後続の処理で利用できるようにする。

### 7.3. アプリケーションロガー

- アプリケーションのどこからでも `info` および `error` ログを記録するための仕組み（ロガークラスなど）を用意する。
- このロガーは、コンテキストから `access_log_id` を取得し、`info_logs` または `error_logs` テーブルにログを書き込む際に、関連付けを行う。

## 8. テーブル設計

詳細は `@docs/database.md` を参照。

## 9. エラーハンドリング

アプリケーション全体で一貫したエラー処理を行うため、以下の設計を採用する。

### 9.1. カスタムエラークラスの定義

-   `Error` クラスを継承したカスタムエラークラス（例: `AppError`）を定義する。
-   このクラスは、エラー発生時に必要な情報（HTTPステータスコード、クライアントに返すメッセージ、ログに記録するログレベル、元のエラーオブジェクトなど）をプロパティとして保持する。
    -   例: `statusCode: number`, `message: string`, `logLevel: 'ERROR' | 'CRITICAL'`, `originalError?: unknown`

### 9.2. エラーのスロー

-   各APIハンドラやビジネスロジック内でエラーが発生した場合、このカスタムエラークラスのインスタンスを生成し、`throw` する。
    -   例: `throw new AppError(400, '入力値が不正です', 'ERROR');`

### 9.3. グローバルエラーハンドラーの実装

-   Honoの `app.onError()` メソッドを使用して、グローバルなエラーハンドラーを設定する。
-   このハンドラーは、アプリケーション内でスローされたエラーをすべてキャッチする。
-   キャッチしたエラーがカスタムエラークラスのインスタンスである場合、そのプロパティを基に以下の処理を行う。
    1.  **ログ記録:**
        -   エラークラスの `logLevel`、`message`、`stack_trace`（`err.stack`）などの情報を取得する。
        -   `accessLogMiddleware` がコンテキストにセットした `access_log_id` と関連付けて、`error_logs` テーブルにエラー情報を保存する。
    2.  **クライアントへのレスポンス:**
        -   エラークラスの `statusCode` と `message` を使用して、統一された形式のJSONレスポンスをクライアントに返す。
        *   例: `{ "error": "エラーメッセージ" }`

-   カスタムエラークラス以外の予期せぬエラーがスローされた場合は、`500 Internal Server Error` として処理し、詳細なエラー情報はログにのみ記録し、クライアントには一般的なエラーメッセージを返す。

### 9.4. Googleフォーム連携時のエラーハンドリング

Googleフォームからのリクエスト (`POST /api/effort`) でエラーが発生した場合、バックエンドは詳細なエラーメッセージを含む適切なHTTPステータスコード（4xx or 5xx）をレスポンスとして返す。

エラー通知の責務は、APIを呼び出す側のGoogle Apps Scriptが担う。GASは、APIからのエラーレスポンスを検知した場合、開発者宛にエラー通知メールを送信する。これにより、バックエンドはメール送信の責務から解放される。

## 10. 環境変数管理

アプリケーションの設定値や機密情報を安全かつ効率的に管理するため、以下の方法を採用する。

### 10.1. 開発環境（ローカル開発時）

-   **`.env` ファイルの利用:**
    -   プロジェクトのルートディレクトリに `.env` ファイルを作成し、そこに環境変数を `KEY=VALUE` 形式で記述する。
    -   `.env` ファイルはGit管理から除外するため、必ず `.gitignore` に `/.env` を追記する。
-   **フロントエンド (React/Vite) での参照:**
    -   フロントエンドで参照したい環境変数には `VITE_` プレフィックスを付ける（例: `VITE_SUPABASE_URL`）。
    -   コード内では `import.meta.env.VITE_SUPABASE_URL` のように参照する。
-   **バックエンド (Hono) での参照:**
    -   Hono（Cloudflare Workers）では、`c.env.YOUR_VAR_NAME` のように参照する。ローカル開発時には `wrangler.toml` の `vars` セクションや `.dev.vars` ファイルで定義する。

### 10.2. 本番環境（デプロイ時）

-   **Cloudflare Workers (Hono):**
    -   Cloudflare Workersのダッシュボード、または `wrangler.toml` を通じて、**Secrets** として環境変数を設定する。
    -   `wrangler secret put YOUR_SECRET_KEY` のようにコマンドを実行し、値を安全に登録する。
    -   `SUPABASE_SERVICE_ROLE_KEY` のような機密情報は、必ずSecretsとして管理し、コードリポジトリに絶対にコミットしない。
-   **Vercel (React):**
    -   Vercelのプロジェクト設定画面で、**Environment Variables** として環境変数を設定する。
    -   フロントエンドに公開する変数は、`VITE_` プレフィックスを付けたまま設定する。
    -   Vercelはビルド時にこれらの変数を注入する。

## 11. CORS設定

フロントエンド（Vercel）とバックエンド（Cloudflare Workers）が異なるオリジンで動作するため、CORS (Cross-Origin Resource Sharing) の設定が必須となる。

### 11.1. Hono `cors` ミドルウェアの利用

-   Honoが提供する公式の `cors` ミドルウェア (`hono/cors`) を利用する。
-   `app.use(cors(options))` の形式で、グローバルまたは特定のルートに適用する。

### 11.2. 設定オプション

-   **`origin`:**
    -   **本番環境:** フロントエンドがデプロイされるVercelのドメイン（例: `https://your-frontend-app.vercel.app`）を正確に指定する。
    -   **開発環境:** ローカル開発サーバーのオリジン（例: `http://localhost:5173` など）も許可するように設定する。
    -   複数のオリジンを許可する場合は配列で指定する。
-   **`credentials`:**
    -   JWT認証でCookieを使用する場合や、認証情報（Authorizationヘッダーなど）を伴うリクエストを許可する場合、`true` に設定する。
    -   Supabaseのセッション管理など、認証情報を伴うAPIリクエストを行うため、`true` に設定する。
-   **`methods`, `headers`:**
    -   許可するHTTPメソッド（`GET`, `POST`, `PUT`, `DELETE` など）やヘッダーを適切に設定する。

### 11.3. 実装例（擬似コード）

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

// 環境変数から許可するオリジンを取得
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://your-frontend-app.vercel.app']
  : ['http://localhost:5173', 'http://localhost:3000']; // 開発環境のポートに合わせて調整

app.use(
  cors({
    origin: allowedOrigins,
    allowHeaders: ['Content-Type', 'Authorization'], // 許可するヘッダー
    allowMethods: ['POST', 'GET', 'PUT', 'DELETE', 'OPTIONS'], // 許可するメソッド
    credentials: true, // 認証情報（Cookie, Authorizationヘッダーなど）を許可
  })
);

// ... その他のミドルウェアやルート ...
```

## 12. フロントエンド設計

### 12.1. 画面要件

- **ミッション管理画面 (`/mission`)**
    - 現在登録されているミッションを表示する。
    - テキストエリアでミッション内容を編集し、更新ボタンで保存できる。
- **目標管理画面 (`/goals`)**
    - `end_date`が最も未来日に設定されている期間の目標群のみを表示する。
    - 各目標の進捗率を更新できる。
    - 新しい目標を登録するフォーム（モーダルなど）を開き、目標内容、期間、ウェイトを登録できる。
- **週報出力画面 (`/report`)**
    - 日付選択コンポーネント（カレンダー）を表示する。
    - 日付を選択すると、その週に対応する週報（ミッション、業務状況、目標進捗）が整形されて表示される。

### 12.2. アーキテクチャ

バックエンドとの一貫性を保つため、フロントエンドも**フィーチャーベースのアーキテクチャ**を採用する。

#### ディレクトリ構成案 (`packages/web/src`)
```
packages/web/src/
├── routes/
│   ├── index.tsx         # React Routerのルート定義
│   └── protected.tsx     # 認証が必要なルートのレイアウト
├── pages/                # ルートに対応するページコンポーネント
│   ├── Mission.tsx
│   ├── Goals.tsx
│   └── Report.tsx
├── features/             # 各機能（ドメイン）に関連するコンポーネント、フック、状態管理
│   ├── mission/
│   ├── goals/
│   └── report/
├── components/
│   ├── ui/               # shadcn/ui から導入したUIコンポーネント (Button, Inputなど)
│   └── layout/           # ヘッダー、サイドバーなどの共通レイアウト
├── lib/
│   ├── api.ts            # APIクライアント (axios) の設定と、各エンドポイントを呼び出す関数
│   └── utils.ts          # 汎用的なユーティリティ関数
├── store/                # グローバルな状態管理 (Zustand)
│   └── authStore.ts
└── App.tsx               # アプリケーションのエントリポイント
```

### 12.3. 主要な技術要素の役割

- **ルーティング (`React Router`)**:
    - `/mission`, `/goals`, `/report` といったパスとページコンポーネントをマッピングする。
    - ログインしていないユーザーをリダイレクトする認証ガードも実装する。
- **コンポーネント (`React`, `shadcn/ui`)**:
    - `components/ui` には `shadcn/ui` から導入した再利用可能な最小単位のコンポーネントを配置する。
    - `features/*` 配下には、各機能に特化した複合コンポーネントを配置します。
- **状態管理 (`Zustand`)**:
    - ログインしているユーザー情報など、アプリケーション全体で共有する状態を `store/` で管理する。
    - 各ページやフィーチャーに閉じた状態は、Reactの `useState` や、各`features`ディレクトリ内のストアで管理する。
- **データ取得 (`axios`)**:
    - `lib/api.ts` にAPI通信のロジックを集約する。`react-query` や `swr` などのライブラリを組み合わせ、キャッシュや再取得を効率化することも推奨される。

## 13. テスト方針

本プロジェクトでは、品質を担保し、安全なリファクタリングを可能にするため、テストコードの記述を必須とする。

### 13.1. 用語の定義

混乱を避けるため、以下の通り用語を定義する。

*   **Spec (仕様書):** `@docs`配下に格納される、これから作る機能の振る舞いを定義したドキュメント群を指す。
*   **Test (テストコード):** 実装されたコードが、仕様書通りに振る舞うことを検証するために記述されるコードを指す。

### 13.2. テストフレームワーク

*   **`vitest`**: バックエンド・フロントエンド双方のテストフレームワークとして採用する。高速な動作とViteとの親和性を評価。

### 13.3. ファイル命名規則

テストコードを格納するファイルは、`*.test.ts` （または `.tsx`）という命名規則に統一する。

例: `database.ts` のテストファイルは `database.test.ts` となる。

### 13.4. バックエンドのテスト

HonoのAPIをテストする際は、Hono標準のテストクライアント（`app.request()`）を利用する。これにより、実際のサーバーを起動することなく、リクエストのシミュレーションとレスポンスの検証を行う。

#### テストコード例 (`index.test.ts`)

```typescript
import { describe, it, expect } from 'vitest';
import app from '../../index'; // Honoアプリケーションのインスタンス

describe('POST /api/effort', () => {
  it('Should return 201 Created for a valid request', async () => {
    const validPayload = {
      date: '2025-09-27',
      email: 'test@example.com',
      effort: '■プロジェクトA\n・タスク1：[1]<2>',
    };

    const res = await app.request('/api/effort', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_VALID_API_KEY',
      },
      body: JSON.stringify(validPayload),
    });

    expect(res.status).toBe(201);
  });
});
```