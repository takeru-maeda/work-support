# フロントエンド設計

## 画面要件

- **ホーム画面 (`/`)**
  - アプリ全体のハブとして、主要機能（工数登録・目標管理・週報出力）へのカード型リンクを配置する。
  - 固定ヘッダーに現在ログイン中ユーザーのメニュー、テーマ切り替え、グローバルナビゲーションを持つ。
- **工数登録画面 (`/effort`)**
  - 日付選択、工数エントリ一覧、サマリー（案件別集計）を表示する。
  - 工数エントリはドラッグ＆ドロップで並び替え、既存案件・タスク候補から選択、見積／実績工数入力、メモ入力を行う。
  - 入力内容はローカルストレージに自動保存し、送信後にリセットする。
- **目標管理画面 (`/goals`)**
  - 最新期間の目標一覧をカードまたはテーブルで表示し、進捗率やウェイトを更新できる。
  - 過去目標一覧を別テーブルで閲覧し、履歴を振り返れる。
  - 目標追加ダイアログからタイトル・期間・ウェイトを登録する。
- **週報出力画面 (`/weekly-report`)**
  - ミッション編集フォームと週報プレビューを表示する。
  - 日付選択で対象週を切り替え、ミッション・工数・目標サマリーを整形したテキストで確認できる。

## アーキテクチャ

フロントエンドは Vite + React Router で構成する SPA とし、UI は shadcn/ui をベースに**BalletProof（Bulletproof React を基にした本プロジェクト向け拡張）構成**で再利用性と可読性を確保する。BalletProof では「アプリ全体の骨格」「機能ごとの境界」「共有資産」をレイヤー分割し、関心の分離を徹底する。

### BalletProof ディレクトリ構成（計画） `packages/web/src`

```
packages/web/src/
├── app/                  # アプリ全体のセットアップ（プロバイダ、router、エラーバウンダリ）
│   ├── App.tsx
│   ├── main.tsx
│   └── providers.tsx など
├── pages/                # ルーティング単位のページ（React Router の element 実体）
│   ├── home/
│   │   └── HomePage.tsx
│   ├── effort/
│   │   └── EffortPage.tsx
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
  - `/`, `/effort`, `/goals`, `/weekly-report`, `/profile`, `/login`, `/signup` などのパスを `Routes` で管理する。
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
