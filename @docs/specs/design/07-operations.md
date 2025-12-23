# ログ・環境・テスト方針

## ログ設計

アプリケーションの動作を追跡し、問題発生時の調査を容易にするため、データベースにログを記録する。

### アクセスログミドルウェア (`accessLogMiddleware`)

- 全てのルート (`*`) のリクエストに対して、認証ミドルウェアよりも先に適用する。
- リクエスト受信時に、IPアドレス、パス、受信時刻などの情報を取得する。
- 後続の処理 (`next()`) を実行する。
- 処理完了後、レスポンスのステータスコード、処理時間などを取得する。
- 認証ミドルウェアによってコンテキストにセットされた `user_id` があれば取得する。
- 収集した情報を `access_logs` テーブルに非同期で書き込む。
- 生成した `access_log_id` をコンテキストにセットし、後続の処理で利用できるようにする。

### アプリケーションロガー

- アプリケーションのどこからでも `info` および `error` ログを記録するための仕組み（ロガークラスなど）を用意する。
- このロガーは、コンテキストから `access_log_id` を取得し、`info_logs` または `error_logs` テーブルにログを書き込む際に、関連付けを行う。
- UI 由来のエラーを記録する場合は、`source` に `UI` を設定し、`user_agent` や `page_url`、`app_version`、必要なメタ情報を `client_context`（JSONB）に格納する。
- フロントエンドからのエラー送信は `POST /api/logs/error` を利用し、認証済みユーザーであることを前提とする。API 側でログ保存後、必要に応じてモニタリング基盤や通知に連携する。

## 環境変数管理

アプリケーションの設定値や機密情報を安全かつ効率的に管理するため、以下の方法を採用する。

### 開発環境（ローカル開発時）

- **`.env` ファイルの利用:** プロジェクトのルートディレクトリに `.env` ファイルを作成し、そこに環境変数を `KEY=VALUE` 形式で記述する。`.env` ファイルはGit管理から除外する。
- **フロントエンド (React/Vite) での参照:** フロントエンドで参照したい環境変数には `VITE_` プレフィックスを付ける（例: `VITE_SUPABASE_URL`）。コード内では `import.meta.env.VITE_SUPABASE_URL` のように参照する。
- **バックエンド (Hono) での参照:** Hono（Cloudflare Workers）では、`c.env.YOUR_VAR_NAME` のように参照する。ローカル開発時には `wrangler.toml` の `vars` セクションや `.dev.vars` ファイルで定義する。
- **メール送信APIキー:** GAS へのメール送信で利用する固定APIキーはバックエンドの `API_KEY`（既存）に統一し、フロントでは値を保持しない。バックエンド内のメール送信ユーティリティから GAS にリクエストを発行する。

### 本番環境（デプロイ時）

- **Cloudflare Workers (Hono):** Cloudflare Workersのダッシュボード、または `wrangler.toml` を通じて、**Secrets** として環境変数を設定する。`wrangler secret put YOUR_SECRET_KEY` のようにコマンドを実行し、値を安全に登録する。`SUPABASE_SERVICE_ROLE_KEY` のような機密情報は、必ずSecretsとして管理し、コードリポジトリにコミットしない。
- **Vercel (React):** Vercelのプロジェクト設定画面で、**Environment Variables** として環境変数を設定する。フロントエンドに公開する変数は、`VITE_` プレフィックスを付けたまま設定し、Vercelはビルド時にこれらの変数を注入する。

## CORS設定

フロントエンド（Vercel）とバックエンド（Cloudflare Workers）が異なるオリジンで動作するため、CORS (Cross-Origin Resource Sharing) の設定が必須となる。

### Hono `cors` ミドルウェアの利用

- Honoが提供する公式の `cors` ミドルウェア (`hono/cors`) を利用する。
- `app.use(cors(options))` の形式で、グローバルまたは特定のルートに適用する。

### 設定オプション

- **`origin`:**
  - **本番環境:** フロントエンドがデプロイされるドメイン（例: `https://work-support-app.com`）。
  - **開発環境:** ローカル開発サーバーのオリジン（例: `http://localhost:5173` など）。複数のオリジンを許可する場合は配列で指定する。
- **`credentials`:** JWT認証でCookieを使用する場合や、認証情報（Authorizationヘッダーなど）を伴うリクエストを許可する場合は `true` に設定する。
- **`methods`, `headers`:** 許可するHTTPメソッド（`GET`, `POST`, `PUT`, `DELETE` など）やヘッダーを適切に設定する。

### 実装例（擬似コード）

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

// 環境変数から許可するオリジンを取得
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://work-support-app.com']
  : ['http://localhost:5173', 'http://localhost:3000']; // 開発環境

app.use(
  cors({
    origin: allowedOrigins,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['POST', 'GET', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  })
);

// ... その他のミドルウェアやルート ...
```

## テスト方針

本プロジェクトでは、品質を担保し、安全なリファクタリングを可能にするため、テストコードの記述を必須とする。

### 用語の定義

- **Spec (仕様書):** `@docs`配下に格納される、これから作る機能の振る舞いを定義したドキュメント群。
- **Test (テストコード):** 実装されたコードが仕様書通りに振る舞うことを検証するコード。

### テストフレームワーク

- **`vitest`:** バックエンド・フロントエンド双方のテストフレームワークとして採用する。高速な動作とViteとの親和性を評価。

### ファイル命名規則

テストコードを格納するファイルは、`*.test.ts` （または `.tsx`）という命名規則に統一する。例: `database.ts` のテストファイルは `database.test.ts`。

### バックエンドのテスト

HonoのAPIをテストする際は、Hono標準のテストクライアント（`app.request()`）を利用する。これにより、実際のサーバーを起動することなく、リクエストのシミュレーションとレスポンスの検証を行う。

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
