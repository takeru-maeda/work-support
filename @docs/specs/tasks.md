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
- [x] `work_records` の差分ビュー `work_record_diffs` を追加する
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
- [x] Web UI向け構造化工数登録APIを実装する (`POST /api/effort/entries`)
- [x] 工数ドラフト保存APIを実装する (`PUT /api/effort/draft`, `DELETE /api/effort/draft`)
- [x] 工数ドラフト取得APIを実装する (`GET /api/effort/draft`)
- [x] 工数ドラフト更新時の `clientUpdatedAt` に基づく同時実行制御を実装する
- [x] 工数登録完了時に `user_settings.notify_effort_email` を参照して完了メールを送信する処理を実装する
- [x] GAS 向けメール送信ユーティリティ（API キー検証含む）を実装する
- [x] 工数登録完了メールの本文生成ロジック（差分・集計を含む）を実装する
- [x] `POST /api/user-settings` を実装し、新規ユーザー作成直後に通知設定レコードを登録できるようにする

### 3.3. ミッション管理機能 (`/api/missions`)
- [x] ルートを定義する (`features/missions/index.ts`)
- [x] ミッションの取得・更新ロジックを実装する (`features/missions/service.ts`, `repository.ts`)

### 3.4. 目標管理機能 (`/api/goals`, `/api/goals/current`)
- [x] ルートを定義する (`features/goals/index.ts`)
- [x] 最新期間の目標取得（`GET /api/goals/current`）およびCRUDロジックを実装する (`features/goals/service.ts`, `repository.ts`)
- [x] 目標作成・更新APIで `content` を取り扱う
- [x] 前週進捗取得APIを実装する (`GET /api/goals/progress/previous-week`)
- [x] 過去目標検索APIを実装する（キーワード・期間・進捗率フィルタ、複数ソートに対応）(`GET /api/goals/history`)
- [x] 目標進捗集計ロジック（全体進捗率／加重進捗率）を `packages/shared` へ抽出し、API・フロント双方で共通利用する
- [x] エラーログ保存APIを実装する (`POST /api/logs/error`)
- [x] エラーログ保存APIのバリデーションとUIメタ情報保存処理を実装する

### 3.5. 週報出力機能 (`/api/reports/weekly`)
- [x] ルートを定義する (`features/reports/index.ts`)
- [x] 週報データ生成ロジックを実装する (`features/reports/reports.service.ts`)

### 3.6. マスターデータ取得API
- [x] ユーザーの案件・タスク取得APIを実装する (`GET /api/projects`)

### 3.7. ユーザー設定API
- [x] ユーザー設定取得APIを実装する (`GET /api/user-settings`)
- [x] ユーザー設定更新APIを実装する (`PUT /api/user-settings`)

### 3.8. 工数レポートAPI
- [x] 工数一覧取得APIを実装する (`GET /api/reports/work-records`)

### 3.9. ログ運用機能
- [x] アプリケーションロガーを実装し、`access_log_id` と紐付けて `info_logs` に保存する
- [x] アプリケーションロガーを実装し、`access_log_id` と紐付けて `error_logs` に保存する

## 4. 🖥️ UI実装 (フロントエンド / `packages/web`)

### 4.1. 共通機能
- [x] React Routerによるルーティング設定 (`routes/index.tsx`)
- [x] 認証ガード（Protected Route）を実装する
- [x] ヘッダー等の共通レイアウトコンポーネントを実装する
- [x] APIクライアント (axios) の設定を実装する (`lib/api.ts`)
- [x] Zustandによる認証状態ストアを実装する (`store/authStore.ts`)
- [x] UI共通のエラーハンドリングモジュールを実装し、`POST /api/logs/error` を呼び出してエラーを記録する

### 4.2. ミッション管理画面 (`/mission`)
- [x] ミッション表示・更新フォームのUIを実装する
- [x] API呼び出しロジックを実装する

### 4.3. 目標管理画面 (`/goals`)
- [x] 最新目標の表示UIを実装する（期間は編集不可にし、ウェイト合計100%チェック付きの更新ボタンを提供する）
- [x] 内容編集ダイアログを実装し、`content` を更新できるようにする
- [x] 削除確認ダイアログで目標タイトルの再入力を求めるUXを実装する
- [x] 過去目標一覧の検索（キーワード・期間・進捗率）／並び替え／ページングUIを実装し、条件を `localStorage` に保存する
- [x] `GET /api/goals/progress/previous-week` との連携を実装する
- [x] `GET /api/goals/history` との連携を実装する

### 4.4. 週報出力画面 (`/report`)
- [x] 日付選択カレンダーのUIを実装する
- [x] 整形された週報の表示エリアUIを実装する
- [x] 週報画面にミッション編集フォームと週報プレビューを組み合わせたUIを実装する
- [x] `GET /api/reports/weekly` を呼び出すロジックを実装する

### 4.5. 認証関連画面
- [x] ログイン画面のUIおよび Supabase サインイン処理を実装する (`/login`)
- [x] サインアップ画面のUIおよび Supabase サインアップ処理を実装する (`/signup`)
- [x] パスワードリセット画面のUIとリセットメール送信／新パスワード入力フローを実装する
- [x] プロフィール画面で名前・プロフィール画像の更新処理を実装する (`/profile`)
- [x] サインアップ完了後に `POST /api/user-settings` を呼び出し、通知設定を初期化するフローを実装する
- [x] 設定画面の工数メール通知トグルを `user_settings` と同期する (`/settings`)

### 4.6. 工数登録画面 (`/efforts/new`)
- [x] 工数エントリのドラッグ＆ドロップ並び替え
- [ ] ローカル保存を実装する
- [ ] 実績工数 (`hours`) の必須入力バリデーションを実装する
- [ ] 完了メール送信結果を UI にフィードバックする（成功/失敗トーストなど）
- [ ] 工数入力内容から差分・集計を表示し、メール本文と同じ形式で確認できるようにする
- [ ] 入力内容の変更ごとにドラフト保存APIへ同期し、送信成功後にドラフトを削除する
- [ ] 画面遷移時に `GET /api/projects`（案件・タスク取得）と `GET /api/effort/draft` を呼び出し、ドラフト初期表示と候補の初期化を実装する

### 4.7. 工数一覧画面 (`/efforts`)
- [x] 工数一覧の検索フォームとテーブルUIを実装する
- [ ] ソート・フィルタ操作を実装する
- [ ] `GET /api/reports/work-records` を呼び出し、取得データを一覧表示する
- [ ] 絞り込み・並び替え条件を `localStorage` に保存し、復元できるようにする

### 4.8. ホーム画面 (`/`)
- [x] 主要機能へのカード型リンクと固定ヘッダーを実装する

### 4.9. 目標追加画面 (`/goals/add`)
- [x] 目標追加フォームを実装する
- [x] 期間の未来日バリデーションと保存後の遷移を行う
- [x] 編集中の目標と期間を `localStorage` に保存する
- [x] 画面初期化時に `localStorage` からドラフトを復元する
- [x] 保存成功後に `localStorage` のドラフトを削除する
