# フロントエンド設計

## 画面要件

- **ホーム画面 (`/`)**
  - アプリ全体のハブとして、主要機能（工数登録・目標管理・週報出力）へのカード型リンクを配置する。
  - 固定ヘッダーに現在ログイン中ユーザーのメニュー、テーマ切り替え、グローバルナビゲーションを持つ。
- **工数登録画面 (`/efforts/new`)**
  - 日付選択、工数エントリ一覧、サマリー（案件別集計）を表示する。
  - 工数エントリはドラッグ＆ドロップで並び替え、既存案件・タスク候補から選択、見積／実績工数入力、メモ入力を行う。
  - 入力内容はローカルストレージに自動保存し、送信後にリセットする。
  - 入力の度に `PUT /api/effort/draft` へドラフトを同期し、画面初期化時は `GET /api/effort/draft` を通じて `work_entry_drafts` から復元する。
  - 案件・タスク候補は `GET /api/projects` / `GET /api/tasks` を利用してユーザー専用マスターを取得する。
  - 画面遷移時に `GET /api/projects`、`GET /api/tasks`、`GET /api/effort/draft` を並列で呼び出し、取得した案件・タスクをコンボボックスへ表示する。ドラフトが存在する場合はフォームへ初期反映する。
  - メール通知の有効/無効はユーザー設定（`user_settings.notify_effort_email`）に基づき、UI ではトグルを表示して変更できる。
  - 実績工数 (`hours`) は必須入力とし、空の場合は送信できない。
- **工数一覧画面 (`/efforts`)**
  - 登録済み工数を一覧で表示し、必要に応じて並び替えや絞り込み機能を提供する。
- **目標管理画面 (`/goals`)**
  - 最新期間の目標一覧をテーブル表示し、各行の更新ボタンから目標（タイトル）、ウェイト、進捗率を一括更新できる。ウェイト合計が100%でない場合は更新ボタンを非活性とする。初期表示は `GET /api/goals/current` のレスポンスを使用する。
  - 内容（詳細記述）は行内リンクから開くダイアログで編集し、保存時に `PUT /api/goals/:id` へ内容を送信する。
  - 期間フィールドは表示のみとし、UIから編集不可とする。
  - 削除ボタン押下時は確認ダイアログを表示し、目標タイトルと一致するテキストが入力された場合のみ最終削除操作（`DELETE /api/goals/:id`）を許可する。
  - 目標一覧のヘッダーでは、取得した現在目標を用いて以下の指標をリアルタイムに算出し表示する。
    - **全体進捗率:** `SUM(goal.progress) / 目標件数` を算出する。
    - **加重進捗率:** `SUM(goal.progress * goal.weight / 100)` を計算する（ウェイト合計が100、進捗率が0〜100である前提のため上限超過は発生しない）。
  - 過去目標タブでは検索条件（キーワード、期間、進捗率範囲）・並び替え・ページネーションを提供し、変更された条件を `localStorage` に保存してリロード時に自動復元する。データ取得には `GET /api/goals/history` を利用する。
  - 目標追加ダイアログではタイトル・期間・ウェイト・内容を登録し、作成時に「期間は後から変更できない」「既存の目標が編集不可になる」旨を警告する。保存前に既存期間より未来日であることを検証する。
  - 週間レポート用に `GET /api/goals/progress/previous-week` を呼び出し、前週との差分を表示できるようにする。
- **週報出力画面 (`/weekly-report`)**
  - ミッション編集フォームと週報プレビューを表示する。
  - 日付選択で対象週を切り替え、ミッション・工数・目標サマリーを整形したテキストで確認できる。
- **ログイン画面 (`/login`)**
  - メールアドレスとパスワードでログインするフォームを提供する。
  - Supabase SDKを利用してサインインし、成功後は認証済みルートへリダイレクトする。
- **サインアップ画面 (`/signup`)**
  - メールアドレスとパスワードでアカウントを作成するフォームを提供する。
  - Supabase SDKでの登録成功後、`POST /api/user-settings` を呼び出して通知設定を初期化し、確認画面またはログイン画面へ遷移する。
- **プロフィール画面 (`/profile`)**
  - ユーザーの基本情報（名前・メール）を表示し、名前およびプロフィール画像のみ更新できる。
- **パスワードリセット画面**
  - リセットメール送信画面 (`/reset-password`) でメールアドレスを入力すると Supabase SDK 経由でリセットメールを送信する。
  - リセットリンクから遷移する画面では新しいパスワードを入力し、`updatePassword` を実行する。
- **目標追加画面 (`/goals/add`)**
  - 最新期間の目標へ新規レコードを追加するフォームを提供する。
  - 作成時に期間は必ず既存期間より未来日時であることをバリデーションし、保存成功後に目標一覧へリダイレクトする。
- **設定画面 (`/settings`)** *(実装予定)*
  - 工数登録完了メール通知のオン/オフを切り替えるトグルを提供し、`user_settings.notify_effort_email` と同期する。

## 共通モジュール／フロー

- **エラーログ送信モジュール**
  - 共通モジュール（例: `features/logs/services/errorLogger.ts`）を作成し、UI 全体で発生した例外や想定外エラーを `POST /api/logs/error` に送信する。
  - 送信時には `source` に `UI` を設定し、`userAgent` / `pageUrl` / `appVersion` / 画面固有のメタデータを付与する。
  - 重大なエラー発生時にはユーザー向けのトーストや画面遷移制御を組み合わせることを検討する。
- **サインアップフロー**
  - Supabase SDKで会員登録が完了したら、バックエンドの `POST /api/user-settings` を呼び出して通知設定を初期化する（ボディは不要）。

## アーキテクチャ

フロントエンドは Vite + React Router で構成する SPA とし、UI は shadcn/ui をベースに**Balletproof（Bulletproof React を基にした本プロジェクト向け拡張）構成**で再利用性と可読性を確保する。Balletproof では「アプリ全体の骨格」「機能ごとの境界」「共有資産」をレイヤー分割し、関心の分離を徹底する。

### Balletproof ディレクトリ構成（計画） `packages/web/src`

```
packages/web/src/
├── app/                  # アプリ全体のセットアップ（プロバイダ、router、エラーバウンダリ）
│   ├── App.tsx
│   ├── main.tsx
│   └── providers.tsx など
├── pages/                # ルーティング単位のページ（React Router の element 実体）
│   ├── home/
│   │   └── HomePage.tsx
│   ├── efforts/
│   │   ├── EffortsPage.tsx
│   │   └── EffortsNewPage.tsx
│   ├── goals/
│   │   └── GoalsPage.tsx
│   ├── weekly-report/
│   │   └── WeeklyReportPage.tsx
│   ├── profile/
│   │   └── ProfilePage.tsx
│   └── auth/
│       ├── LoginPage.tsx
│       └── SignupPage.tsx
├── features/             # 各機能境界で UI / hooks / services / schema を集約
│   ├── goals/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── types.ts
│   ├── mission/
│   ├── reports/
│   └── effort/
├── components/
│   ├── layout/           # app-header などレイアウト用複合コンポーネント
│   ├── shared/           # 複数 feature から利用する複合 UI
│   └── ui/               # shadcn/ui ベースのスタンドアロン部品
├── hooks/                # 複数 feature で再利用されるカスタムフック
├── lib/                  # 日付計算、認証ラッパー、API クライアントなど共通ロジック
├── services/             # API 通信やローカルストレージ I/O を抽象化
├── store/                # Zustand 等で管理するグローバル状態（例: テーマ）
├── styles/               # Tailwind v4 テーマとグローバル CSS
├── config/               # 環境変数やルーティング設定等の集中管理（例: routes.ts）
├── types/                # 型共有（API スキーマは `packages/shared` をインポート）
└── index.css             # グローバルスタイルのエントリーポイント
```

> **Note:** 現在の実装は段階的に BalletProof へ移行中であり、今後のスプリントで上記構成に合わせてリファクタリングする。

## 主要な技術要素の役割

- **ルーティング (`React Router`)**:
  - `/`, `/efforts`, `/efforts/new`, `/goals`, `/weekly-report`, `/profile`, `/login`, `/signup` などのパスを `Routes` で管理する。
  - `AuthGuard` コンポーネントを利用して、認証が必要なルートで未ログイン時に `/login` へ遷移させる。
- **コンポーネント (`React`, `shadcn/ui`)**:
  - `components/ui` には `shadcn/ui` から導入した再利用可能な最小単位のコンポーネントを配置する。
  - ページ固有の複合コンポーネントは `components/` 直下にまとめ、カードやテーブルなど UI 要素を組み合わせて表現する。
- **状態管理**:
  - フィーチャー内部の短命な状態は `useState` / `useReducer` を利用する。
  - アプリ全体で共有するテーマやセッションなどの状態は `store/` に配置した Zustand ストア（例: `useThemeStore`）で集中管理し、`persist` ミドルウェアで `localStorage` に保存する。`lib/auth` は認証情報とローカルストレージの同期を担う。
- **データ取得・API 連携**:
  - HTTP クライアントや Supabase SDK をラップしたサービスを `services/` に集約し、フィーチャー層から利用する。
  - バックエンドと共有する Zod スキーマは `packages/shared` からインポートし、型整合性を保つ。
