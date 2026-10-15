---
title: ランディングページ
feature: landing
status: current
updated: 2026-10-15
code:
  - packages/web/src/pages/landing/LandingPage.tsx :: LandingPage
  - packages/web/src/pages/landing/landingContent.ts :: hero
  - packages/web/src/pages/landing/components/LandingHeader.tsx :: LandingHeader
  - packages/web/src/pages/landing/components/HeroSection.tsx :: HeroSection
  - packages/web/src/pages/landing/components/FAQSection.tsx :: FAQSection
  - packages/web/src/pages/landing/components/FinalCTASection.tsx :: FinalCTASection
  - packages/web/src/pages/landing/components/LandingFooter.tsx :: LandingFooter
  - packages/web/src/pages/landing/hooks/useScrollToFeatures.ts :: useScrollToFeatures
  - packages/web/src/app/App.tsx :: App
related: [auth, app-shell]
symptoms:
  - ログインしているのに、ランディングページが出る
  - ランディングページのボタンの影や背景の模様が出ていない
  - ランディングページに「Google連携に対応」とあるのに、Google でログインできない
---

# ランディングページ

## TL;DR・改修前の必読

- `/landing` の宣伝のページ。アプリの紹介と、新規登録（`/signup`）・ログイン（`/login`）への入口。ログインしていない人が保護された画面を開いたときと、存在しないパスを開いたときに、ここへ移る（auth の AC-01、02）
- 文言の大半は `landingContent.ts` にまとめてある。ページは認証の状態を見ない（ログインしていても同じものを出す）
- ⚠️ 文言を変えるときは `landingContent.ts` を直す。各節の小さな見出し（バッジ）は各部品の中に直接書いてある

## 目的と利用者

- 目的: 初めて来た人に、何ができるアプリかを伝えて新規登録に進めてもらう
- 利用者と使う場面: ログインしていない人。招待された人がリンクから開く

## 振る舞いと受け入れ基準

- **AC-landing-01**: `/landing` は、ヘッダー、ヒーロー、悩み、解決策、機能（`id="features"`）、使い方、活用シーン、特徴、よくある質問、最後の呼びかけ、フッターの順に出す。各節の見出し（「こんな悩み、ありませんか？」「主な機能」「かんたん4ステップ」「よくある質問」など）とよくある質問の文言は `landingContent.ts` を正とする。ログインなしで開け、ログインしていても同じものを出す
- **AC-landing-02**: ヘッダーは、ロゴと「Work Support」（`/landing` へのリンク）、テーマの切り替え、「ログイン」（`/login`）、「無料で始める」（`/signup`）
- **AC-landing-03**: ヒーローは「週報作成、まだ手作業ですか？」「工数を記録するだけで、週報が自動で完成。」と、「無料で始める」（`/signup`）、「機能を見る」（機能の節へなめらかにスクロール）。最後の呼びかけ「今すぐ始めましょう」の「無料で始める」も `/signup`。フッターは「ログイン」（`/login`）、「新規登録」（`/signup`）、「無料で始める」（`/signup`）と「© {今年} Work Support. All rights reserved.」
- **AC-landing-04**: よくある質問は 4 つで、押すと答えを開き、同時に開くのは 1 つだけ（もう一度押すと閉じる）
- **AC-landing-05**: ヒーローのボタンは `sm` 未満で縦に全幅、`sm` 以上で横に並べる。節ごとの列の数は次のとおり（テストの 3 幅で見たとき）

  | 節 | 375px | 768px | 1280px |
  | --- | --- | --- | --- |
  | 悩み | 1 | 2 | 2 |
  | 機能 | 1 | 2 | 3 |
  | 使い方 | 1 | 4 | 4 |
  | 活用シーン | 1 | 3 | 3 |
  | 特徴 | 1 | 2 | 4 |

  使い方のつなぎの線は、`md` 以上で横、未満で各カードの下に縦

## 画面と API

### 画面
- ルート: `/landing`（`packages/web/src/config/routes.ts`）
- 主な操作: 新規登録・ログインへのリンク、機能の節へのスクロール、よくある質問の開閉、テーマの切り替え

### API
該当なし（API を呼ばない）

## データ

- 文言: `packages/web/src/pages/landing/landingContent.ts`（`benefits` と `benefitIcon` は使われていない残り）
- テーマ: user-settings の AC-09（localStorage）

## 設計不変条件

- **INV-1**: ランディングページは、ログインしていなくても開けるルート（`AuthenticatedLayout` の外）に置く。破ると、未ログインの人の行き先（auth の AC-02）が保護された画面になり、行き来を繰り返す

## エラー時の挙動

該当なし（API を呼ばない）

## 既知の落とし穴

- **ログインしていても宣伝のページが出る**: 認証の状態を見ないので、ログイン済みの人が開いても「ログイン」「無料で始める」が出る。存在しないパスはログインしていてもここに移る（auth の要確認 1）
- **影と背景の模様が出ていない**: ヒーローのボタンの影、最後の呼びかけの影と模様、活用シーンの格子の模様は、`rgba(var(--primary), …)` で書いてあり、`--primary` が `oklch(...)` なので無効になって描かれない（コードから）
- **実装していない機能の文言**: 特徴の節に「メール/パスワード、Google連携に対応」とあるが、Google でのログインは実装していない。文言を消す予定（[v1.0.7-baseline](changes/v1.0.7-baseline.md) の人間の判断 2）
- **使い方のつなぎの線**: 動く線は、使っているアニメーション（`scale-x`）がどこにも定義されておらず見えない。`sm`〜`md` は 2 列なのに縦の線が各カードの下に出るので、つながる相手がずれる
- **リンクの中にボタン**: 「ログイン」「無料で始める」などは `<a>` の中に `<button>` を入れている（入れ子の操作要素。アクセシビリティの検査で指摘される）
- **よくある質問のアクセシビリティ**: ボタンに `aria-expanded` が無く、閉じた答えは透明にしてあるだけなので、読み上げでは読まれる
- **文言の誤り**: 使い方の 2 つ目の説明が「タスクごとに時間を入力を簡単に追加」（`landingContent.ts`）

## ポストモーテム

該当なし（git の履歴に、ランディングページの不具合の修正は無い）。

## テストとの対応

| AC | テスト | 種類 |
| --- | --- | --- |
| AC-landing-01〜05 | 未（P6。E2E で見出しとリンクの行き先、3 幅の表示） | E2E |

## 変更履歴

| バージョン | 日付 | 内容 | 改修の記録 |
| --- | --- | --- | --- |
| v1.0.7 | 2026-10-15 | 移行時点の基準 | [v1.0.7-baseline](changes/v1.0.7-baseline.md) |
