# UI デザインの規約

UI を変える改修（新しい画面、画面の改修、コンポーネントの追加、スタイルの変更）の前に読む。目的は「描画されるだけの UI」ではなく、**既存の画面とそろった、どの画面幅でも崩れない UI** にすること。

## 1. 手本の画面に器をそろえる

新しい画面は、まず手本を 1 つ選んで器（幅、余白、見出し）をそろえる。

| 画面の種類 | 手本 | 要点 |
| --- | --- | --- |
| 一覧・検索 | `pages/efforts/EffortsPage.tsx` | `PageLayout` + 絞り込みパネル + テーブル + `TableFooter`。読み込み中は Skeleton、0 件は `EmptyState` |
| 設定・フォーム | `pages/settings/SettingsPage.tsx` | `PageLayout` + カード（`SettingsCard` / `CardContainer`）を `grid gap-4 sm:gap-6` で並べる |
| 認証まわり | `pages/auth/LoginPage.tsx` | `features/auth/components/AuthPageContainer` で包む |
| 入力して保存する画面 | `pages/goals/AddGoalsPage.tsx` | フォームの末尾に `FormActions`（右寄せのキャンセルと保存） |

- ログイン後のページは `components/layout/PageLayout`（中で `PageContainer` と `PageHeader` を使う）で包む。**独自の横幅や外側の余白を持ち込まない**（`PageContainer` が `max-w-5xl` と `px-3 sm:px-8 md:px-10 lg:px-12` を持っている）
- 見出しとページの説明は `PageLayout` の `pageTitle` / `pageDescription` に渡す
- 固定の px 幅は使わない。`w-full`、`max-w-*`、`flex` / `grid` の折り返しで作る

## 2. 既存の部品を流用する

- **shadcn/ui**（`components/ui/`）を最優先で使う。新しいコンポーネントが必要なら、shadcn に既存のものがあるかを先に確かめる（CLI の実行は事前にユーザーへ確認する。`.claude/rules/third-party-skills.md`）
- 共通部品（`components/`）:
  - 状態の表示: `empty-state/EmptyState`、`skeleton/*`、`spinner/*`
  - 一覧: `table-footer/*`（件数、ページ送り、表示件数）、`filter/*`（絞り込み）
  - フォーム: `form/FormActions`
  - 見出し: `sections/SectionHeader`
- **同じ見た目の UI を 2 か所目で使うときは、コピーせず共通部品に切り出す**（機能の中で使い回すなら `features/<feature>/components`、機能をまたぐなら `components/`）
- **新しい色やトークンを増やさない**。色は `styles/globals.css` のトークン（`background` / `foreground` / `primary` / `muted` / `border` / `destructive` / `chart-*` など）を Tailwind のクラスで使う。ダークモードは `.dark` で自動的に切り替わる

## 3. 情報と操作の流れ

- 主な操作（保存、登録）はフォームの末尾にまとめる（`FormActions`）
- 読み込み中、0 件、エラーの見せ方を必ず用意する（Skeleton / `EmptyState` / エラーメッセージ）
- 操作の結果は `lib/toast.ts` のトーストで伝える。エラーの文言は、利用者が次に何をすればよいかがわかる日本語にする
- 取り消せない操作（削除など）は確認ダイアログ（`alert-dialog`）を挟む

## 4. レスポンシブ

- ブレークポイントは Tailwind の既定（`sm` 640px / `md` 768px / `lg` 1024px）
- `md` 未満ではモバイルの下部ナビ（`MobileBottomNav`）が出るため、本文の下に余白がある（`AuthenticatedLayout` の `pb-16 md:pb-0`）。画面下端に固定する要素を作るときは重ならないようにする
- **確認する幅は 375px / 768px / 1280px の 3 つ**。テキストの折り返し、はみ出し、横スクロール、ボタンのつぶれがないかを見る
- 長い文字列（案件名、タスク名、目標の本文）でも崩れないように、`min-w-0`、`truncate`、`break-words` を使う

## 5. 確認のしかた

- 実装の前に、Playwright MCP で今の画面と手本の画面を開いて確かめる
- 実装の後に、3 つの幅でスクリーンショットを撮り、手本と見比べる（横幅、余白、トーン、主な操作の位置）
- アクセシビリティの観点は `web-design-guidelines` スキルで確かめる

---
_トークンの値の一覧ではなく、手本と判断の軸を書く。値は `styles/globals.css` を正とする_
