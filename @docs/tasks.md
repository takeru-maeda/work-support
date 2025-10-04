# 開発タスクリスト

このタスクリストは、`@docs`配下の仕様書に基づき生成されています。

## 1. 🛠️ プロジェクト基盤構築 (モノレポ設定)

- [x] ルートに`pnpm` workspaceを設定する (`package.json`)
- [x] `packages/api`, `packages/web`, `packages/shared` のディレクトリを作成する
- [x] `packages/api`にHonoプロジェクトをセットアップする
- [x] `packages/web`にReact (Vite) プロジェクトをセットアップする
- [x] `packages/shared`に共通の`package.json`と`tsconfig.json`をセットアップする
- [x] ルートに共有の`tsconfig.base.json`を作成し、各パッケージから参照するように設定する
- [x] `vitest`を各パッケージに導入し、テスト実行環境を整備する
- [x] ESLintとPrettierをモノレポに設定する

## 2. 🗃️ データベース設定 (Supabase)

- [x] `log_level` ENUMを作成する
- [x] `projects` テーブルを定義する
- [x] `tasks` テーブルを定義する
- [x] `work_records` テーブルを定義する
- [x] `missions` テーブルを定義する
- [x] `goals` テーブルを定義する
- [x] `goal_progress_histories` テーブルを定義する
- [x] `access_logs` テーブルを定義する (IDをUUIDに変更済み)
- [x] `info_logs` テーブルを定義する
- [x] `error_logs` テーブルを定義する
- [x] 各テーブルに必要なインデックスを設定する

## 3.  API実装 (バックエンド / `packages/api`)

### 3.1. 共通機能
- [x] Supabaseクライアントの初期化モジュール (`lib/supabase.ts`) を実装する
- [x] `jwtAuthMiddleware` を実装する (`middleware/auth.ts`)
- [x] `apiKeyAuthMiddleware` を実装する (`middleware/auth.ts`)
- [x] `accessLogMiddleware` を実装する (`middleware/logger.ts`)
- [x] グローバルエラーハンドラー (`app.onError`) を実装する
- [x] エラー通知メール送信ロジック (`lib/emailer.ts`など) を実装する
- [x] CORS設定を実装する

### 3.2. 工数登録機能 (`/api/effort`)
- [x] ルートを定義する (`features/effort/index.ts`)
- [x] 工数テキストの解析ロジックを実装する (`features/effort/effort.service.ts`)
- [x] DBへの書き込み処理を実装する (`features/effort/effort.repository.ts`)

### 3.3. ミッション管理機能 (`/api/missions`)
- [x] ルートを定義する (`features/missions/index.ts`)
- [x] ミッションの取得・更新ロジックを実装する (`features/missions/service.ts`, `repository.ts`)

### 3.4. 目標管理機能 (`/api/goals`)
- [x] ルートを定義する (`features/goals/index.ts`)
- [x] 最新期間の目標取得、およびCRUDロジックを実装する (`features/goals/service.ts`, `repository.ts`)

### 3.5. 週報出力機能 (`/api/reports/weekly`)
- [x] ルートを定義する (`features/reports/index.ts`)
- [x] 週報データ生成ロジックを実装する (`features/reports/reports.service.ts`)

## 4. 🖥️ UI実装 (フロントエンド / `packages/web`)

### 4.1. 共通機能
- [ ] React Routerによるルーティング設定 (`routes/index.tsx`)
- [ ] 認証ガード（Protected Route）を実装する
- [ ] ヘッダー等の共通レイアウトコンポーネントを実装する
- [ ] APIクライアント (axios) の設定を実装する (`lib/api.ts`)
- [ ] Zustandによる認証状態ストアを実装する (`store/authStore.ts`)

### 4.2. ミッション管理画面 (`/mission`)
- [ ] ミッション表示・更新フォームのUIを実装する
- [ ] API呼び出しロジックを実装する

### 4.3. 目標管理画面 (`/goals`)
- [ ] 最新目標の表示UIを実装する
- [ ] 進捗更新スライダー等のUIを実装する
- [ ] 新規目標作成モーダルフォームのUIを実装する
- [ ] API呼び出しロジックを実装する

### 4.4. 週報出力画面 (`/report`)
- [ ] 日付選択カレンダーのUIを実装する
- [ ] 整形された週報の表示エリアUIを実装する
- [ ] `GET /api/reports/weekly` を呼び出すロジックを実装する
