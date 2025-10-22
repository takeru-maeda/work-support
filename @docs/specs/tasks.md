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
- [x] `work_entry_drafts` テーブルを定義する
- [x] `work_entry_drafts` に `client_updated_at` カラムを追加する
- [x] `goals` テーブルに `content` カラムを追加する
- [x] `log_source` ENUM を追加し、`error_logs` の `source` カラムに適用する
- [x] `error_logs` テーブルに `source` / `user_agent` / `page_url` / `app_version` / `client_context` を追加する
- [x] `user_settings` テーブルを追加し、工数登録メール通知フラグなどの設定を保持する
- [x] `missions` テーブルを定義する
- [x] `goals` テーブルを定義する
- [x] `goal_progress_histories` テーブルを定義する
- [x] `access_logs` テーブルを定義する (IDをUUIDに変更済み)
- [x] `info_logs` テーブルを定義する
- [x] `error_logs` テーブルを定義する
- [x] 各テーブルに必要なインデックスを設定する
- [x] `work_entry_drafts` に `user_id` ユニークインデックスを設定する

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
- [ ] Web UI向け構造化工数登録APIを実装する (`POST /api/effort/entries`)
- [ ] 工数ドラフト保存APIを実装する (`PUT /api/effort/draft`, `DELETE /api/effort/draft`)
- [ ] 工数ドラフト取得APIを実装する (`GET /api/effort/draft`)
- [ ] 工数ドラフト更新時の `clientUpdatedAt` に基づく同時実行制御を実装する
- [ ] 工数登録完了時に `user_settings.notify_effort_email` を参照して完了メールを送信する処理を実装する
- [ ] GAS 向けメール送信ユーティリティ（API キー検証含む）を実装する
- [ ] 工数登録完了メールの本文生成ロジック（差分・集計を含む）を実装する
- [ ] `POST /api/user-settings` を実装し、新規ユーザー作成直後に通知設定レコードを登録できるようにする

### 3.3. ミッション管理機能 (`/api/missions`)
- [x] ルートを定義する (`features/missions/index.ts`)
- [x] ミッションの取得・更新ロジックを実装する (`features/missions/service.ts`, `repository.ts`)

### 3.4. 目標管理機能 (`/api/goals`)
- [x] ルートを定義する (`features/goals/index.ts`)
- [x] 最新期間の目標取得、およびCRUDロジックを実装する (`features/goals/service.ts`, `repository.ts`)
- [ ] 目標作成・更新APIで `content` を取り扱う
- [ ] 前週進捗取得APIを実装する (`GET /api/goals/progress/previous-week`)
- [ ] 過去目標検索APIを実装する（キーワード・期間・進捗率フィルタ、複数ソートに対応）(`GET /api/goals/history`)
- [ ] 目標進捗集計ロジック（全体進捗率／加重進捗率）を `packages/shared` へ抽出し、API・フロント双方で共通利用する
- [ ] エラーログ記録APIを実装する (`POST /api/logs/error`)
- [ ] エラーログ記録APIのバリデーションとUIメタ情報保存処理を実装する

### 3.5. 週報出力機能 (`/api/reports/weekly`)
- [x] ルートを定義する (`features/reports/index.ts`)
- [x] 週報データ生成ロジックを実装する (`features/reports/reports.service.ts`)

### 3.6. マスターデータ取得API
- [ ] ユーザーの案件一覧取得APIを実装する (`GET /api/projects`)
- [ ] ユーザーのタスク一覧取得APIを実装する (`GET /api/tasks`)

## 4. 🖥️ UI実装 (フロントエンド / `packages/web`)

### 4.1. 共通機能
- [x] React Routerによるルーティング設定 (`routes/index.tsx`)
- [x] 認証ガード（Protected Route）を実装する
- [x] ヘッダー等の共通レイアウトコンポーネントを実装する
- [x] APIクライアント (axios) の設定を実装する (`lib/api.ts`)
- [x] Zustandによる認証状態ストアを実装する (`store/authStore.ts`)

### 4.2. ミッション管理画面 (`/mission`)
- [x] ミッション表示・更新フォームのUIを実装する
- [x] API呼び出しロジックを実装する

### 4.3. 目標管理画面 (`/goals`)
- [ ] 最新目標の表示UIを実装する（期間は編集不可にし、ウェイト合計100%チェック付きの更新ボタンを提供する）
- [ ] 内容編集ダイアログを実装し、`content` を更新できるようにする
- [ ] 削除確認ダイアログで目標タイトルの再入力を求めるUXを実装する
- [ ] 過去目標一覧の検索（キーワード・期間・進捗率）／並び替え／ページングUIを実装し、条件を `localStorage` に保存する
- [ ] 目標追加モーダルで警告メッセージと期間バリデーションを実装する
- [ ] `GET /api/goals/progress/previous-week` との連携を実装する
- [ ] `GET /api/goals/history` との連携を実装する
- [ ] エラーログ送信モジュールを実装し、UI 全体から `POST /api/logs/error` を呼び出せるようにする
- [ ] 未捕捉エラーを捕捉してエラーログ送信・ユーザー通知を行う共通フローを整備する
- [ ] 工数登録画面から完了メール通知の現在値を表示し、通知結果のフィードバックを実装する
- [ ] ユーザー設定画面（またはプロフィール）に工数メール通知トグルを追加し、`user_settings` と同期する

### 4.4. 週報出力画面 (`/report`)
- [x] 日付選択カレンダーのUIを実装する
- [x] 整形された週報の表示エリアUIを実装する
- [ ] `GET /api/reports/weekly` を呼び出すロジックを実装する

### 4.5. 認証関連画面
- [x] ログイン画面のUIおよび Supabase サインイン処理を実装する (`/login`)
- [x] サインアップ画面のUIおよび Supabase サインアップ処理を実装する (`/signup`)
- [x] パスワードリセット画面のUIとリセットメール送信／新パスワード入力フローを実装する
- [x] プロフィール画面で名前・プロフィール画像の更新処理を実装する (`/profile`)
- [ ] 設定画面を実装し、工数メール通知トグルを `user_settings` と同期する (`/settings`)

### 4.6. 工数登録画面 (`/effort`)
- [ ] 実績工数 (`hours`) の必須入力バリデーションを実装する
- [ ] 完了メール送信結果を UI にフィードバックする（成功/失敗トーストなど）
- [ ] 工数入力内容から差分・集計を表示し、メール本文と同じ形式で確認できるようにする
- [ ] 画面遷移時に `GET /api/projects` / `GET /api/tasks` / `GET /api/effort/draft` を呼び出し、ドラフト初期表示と候補の初期化を実装する
