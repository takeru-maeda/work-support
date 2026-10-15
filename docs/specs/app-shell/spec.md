---
title: アプリの枠（ヘッダー、スマートフォンの下のナビ、ホーム、ページの器）
feature: app-shell
status: current
updated: 2026-10-15
code:
  - packages/web/src/components/layout/AuthenticatedLayout.tsx :: AuthenticatedLayout
  - packages/web/src/components/layout/header/AppHeader.tsx :: AppHeader
  - packages/web/src/components/layout/header/AppHeaderDesktopNav.tsx :: AppHeaderDesktopNav
  - packages/web/src/components/layout/header/AppHeaderHomeLink.tsx :: AppHeaderHomeLink
  - packages/web/src/components/layout/header/AppHeaderUserMenu.tsx :: AppHeaderUserMenu
  - packages/web/src/components/layout/MobileBottomNav.tsx :: MobileBottomNav
  - packages/web/src/components/layout/PageLayout.tsx :: PageLayout
  - packages/web/src/config/navigation.ts :: MAIN_NAVIGATION
  - packages/web/src/config/routes.ts :: ROUTES
  - packages/web/src/pages/home/HomePage.tsx :: HomePage
  - packages/web/src/pages/home/components/HomeFeatureCard.tsx :: HomeFeatureCard
  - packages/web/src/app/App.tsx :: App
  - packages/web/index.html
related: [auth, user-settings, landing, profile]
symptoms:
  - iPhone でホーム画面に追加して開くと、下のナビが画面の下の丸みで切れる
  - 目標の追加の画面で、ナビのどこも選ばれていない
  - 画面が真っ白になる
---

# アプリの枠（ヘッダー、スマートフォンの下のナビ、ホーム、ページの器）

## TL;DR・改修前の必読

- ログイン後の全画面に共通の枠。上に固定のヘッダー（ロゴ、PC のナビ、テーマの切り替え、ユーザーメニュー）、スマートフォンの幅では下に固定のナビ。ホーム（`/`）は各機能へのカードを並べる
- ナビの項目は `config/navigation.ts` の `MAIN_NAVIGATION` だけで決まり、PC のナビ、下のナビ、ホームのカードが同じ一覧を使う
- PWA（manifest、Service Worker）は**入っていない**。iPhone のホーム画面への追加は、`apple-touch-icon` だけで対応している
- ⚠️ 下のナビの位置を変えるときは [§ポストモーテム](#ポストモーテム) を読む（iPhone の画面の丸みで切れた）

## 目的と利用者

- 目的: どの画面からでも主な機能に 1 回で移れるようにし、画面ごとの見た目をそろえる
- 利用者と使う場面: PC とスマートフォン（ホーム画面に追加した iPhone を含む）で使う

## 振る舞いと受け入れ基準

- **AC-app-shell-01**: 保護された画面（auth の AC-01）は、上に固定のヘッダー（中身の高さ 64px（`h-16`）と下の線）、本文（上に 64px、`md` 未満では下にも 64px の余白）、`md` 未満の幅では下に固定のナビを出す
- **AC-app-shell-02**: ヘッダーは、ロゴと「Work Support」（`/` へのリンク。ロゴの画像が読めなければ代わりの印）、`md` 以上ではナビ（ホーム、工数登録、工数一覧、目標管理、週報出力）、テーマの切り替え（user-settings の AC-09）、ユーザーメニュー。`md` 未満ではナビを出さない
- **AC-app-shell-03**: ナビは、今のパスと項目のパスが**完全に一致**する項目を選ばれた状態にする（PC は文字の色 `text-foreground`、下のナビは主色 `text-primary`。`aria-current` は付けない）。`/goals/add` などの下の階層では、どれも選ばれない
- **AC-app-shell-04**: ユーザーメニューのボタンは、プロフィール画像があれば画像、無ければ名前の頭文字（取れなければ「U」）、名前が無ければ人の印（読み上げは「ユーザーメニュー」）。開くと「プロフィール」（`/profile`）、「設定」（`/settings`）、「ログアウト」（auth の AC-11）
- **AC-app-shell-05**: 下のナビは、`MAIN_NAVIGATION` の 5 つを印と名前で並べる。下に固定の余白（`pb-3`）を取る
- **AC-app-shell-06**: ホーム（`/`）は、見出し「Work Support」と「ようこそ、{名前}さん」（名前が無ければ「ようこそ」）、ホーム以外のナビの 4 項目のカード（名前と説明。工数登録「日々の作業内容と時間を記録」、工数一覧「登録された工数データの確認」、目標管理「目標設定と進捗管理」、週報出力「週次レポートの作成」）。カードは 2 列、`lg` 以上で 4 列
- **AC-app-shell-07**: ホームとプロフィール以外の各画面（工数登録、工数一覧、目標管理、目標の追加、週報出力、設定）は `PageLayout` で包み、見出し（h1）と説明、任意の「戻る」ボタン、保存中のスピナーを同じ位置に出す。ホームは中央寄せの独自の見出し、プロフィールは `PageContainer` と独自の見出し（profile の AC-09）
- **AC-app-shell-08**: トーストは画面の上の中央に出し、テーマに合わせる。ページの言語は日本語（`lang="ja"`）、タイトルは「Work Support」、アイコンとホーム画面に追加したときのアイコンは `/logo.png`。拡大は止めている（`user-scalable=no`）

## 画面と API

### 画面
- ルート: `/`（ホーム）。ヘッダーと下のナビは保護された全画面
- 主な操作: ナビでの移動、ユーザーメニュー、テーマの切り替え

### API
該当なし（枠は API を呼ばない。ユーザーの確かめは auth）

## データ

- ナビの一覧: `packages/web/src/config/navigation.ts`（`MAIN_NAVIGATION`）、ルートの一覧: `config/routes.ts`
- ユーザーの名前と画像: ユーザーのストア（auth）
- ホスティング: Vercel。`packages/web/vercel.json` が全パスを SPA に回す

## 設計不変条件

- **INV-1**: ナビの項目は `MAIN_NAVIGATION` の 1 か所で決める（PC のナビ、下のナビ、ホームのカードが同じ一覧を使う）。破ると、画面によって行ける機能が食い違う
- **INV-2**: 下のナビは、画面の下の端との間に余白を取る（ホーム画面に追加した iPhone の、画面の丸みで切れないように）。破ると、ポストモーテムの症状が戻る

## エラー時の挙動

- 画面全体のエラーの受け止め（ErrorBoundary、`errorElement`、`window.onerror`、`unhandledrejection`）は無い。描画中の例外は画面全体を消し（真っ白）、どこにも記録されない

## 既知の落とし穴

- **PWA は入っていない**: manifest、Service Worker、オフライン対応、更新の案内は無い。`apple-mobile-web-app-capable` も無い。ホーム画面に追加したときの見え方は端末で手で確かめる（`docs/testing/manual-checklist.md`）
- **ページの器がそろっていない**: ホームとプロフィールは `PageLayout` を使わず、見出しの位置と形が違う
- **本文の最後がナビに隠れうる**: 下のナビの高さ（項目、印、文字、`pb-3`、線）は計算でおよそ 69px で、本文の下の余白（64px）より大きい（測っていない）
- **選ばれた状態が読み上げで分からない**: `aria-current` を付けず、色だけで示す
- **下のナビの余白が固定**: `pb-3` の固定で、`env(safe-area-inset-bottom)` を使っていない。端末によっては足りない・多すぎる
- **下の階層でナビが選ばれない**: 選ばれた状態は完全一致なので、`/goals/add` ではどれも選ばれない
- **画面全体のエラーの受け止めが無い**: 描画中の例外で真っ白になる
- **拡大を止めている**: `user-scalable=no` はアクセシビリティの基準（WCAG 1.4.4）に反する（iOS は多くの場合無視する）
- **届かない代わりの画像**: `/placeholder-user.svg` の代わりの画像は届かず、ファイルも無い
- **アイコンの型**: `index.html` のアイコンの `type` が `image/svg+xml` だが、中身は PNG

## ポストモーテム

### 2026-01-13 症状「iPhone でホーム画面に追加して開くと、下のナビが画面の下の丸みで切れる」（`5eb29b9`）
- **真因**: コミットの説明によると、ホーム画面に追加して開くと全画面で表示され、画面の下の丸み（と操作のバー）の部分まで描かれた。下のナビを画面の下の端にぴったり置いていたので、項目の下側が丸みに重なって切れた。なお `index.html` には、全画面で開く指定（`apple-mobile-web-app-capable`）も安全な領域まで描く指定（`viewport-fit=cover`）も、これまで一度も入っていない（git の履歴で確かめた）。全画面になるのは iOS 側の扱いによる
- **対策**: 下のナビに固定の余白（`pb-3`）を足して、項目を少し上に置いた（INV-2）。安全な領域（`env(safe-area-inset-bottom)`）は使っていない
- **再発時に確認すること**: 下のナビの余白を消していないか。ホーム画面に追加した iPhone で、下のナビが切れずに押せるか（手で確かめる）。端末や iOS の版を変えたら、固定の余白で足りているか。`viewport-fit=cover` を足すときは、安全な領域（`env(safe-area-inset-bottom)`）を使う
- **改修の記録**: なし（移行前の修正。経緯は [v1.0.7-baseline](changes/v1.0.7-baseline.md)）

## テストとの対応

| AC | テスト | 種類 |
| --- | --- | --- |
| AC-app-shell-02〜06、INV-1 | `packages/web/src/components/layout/AppShell.test.tsx`（選ばれた状態はクラスで確かめる。`md` での出し分けは CSS なので部品テストでは見ない） | 部品 |
| AC-app-shell-01、06、07 | `packages/e2e/tests/screens.spec.ts`（主な画面の h1 の見出し、横のはみ出しが無いこと、ページのエラーが無いこと。375 / 768 / 1280px） | E2E |
| AC-app-shell-08 | 未（`index.html` の内容。P6 で直すとき（拡大の停止）に確かめる） | — |
| INV-2、ホーム画面に追加したときの見え方 | 手動（`docs/testing/manual-checklist.md` の M-001） | 手動 |

既知の落とし穴のうち、今の振る舞いをテストで固めたもの（P6 で直すときにテストを書き換える）: 下の階層ではナビがどれも選ばれない（AC-03）。

## 変更履歴

| バージョン | 日付 | 内容 | 改修の記録 |
| --- | --- | --- | --- |
| v1.0.7 | 2026-10-15 | 移行時点の基準 | [v1.0.7-baseline](changes/v1.0.7-baseline.md) |
