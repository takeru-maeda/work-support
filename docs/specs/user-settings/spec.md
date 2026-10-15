---
title: ユーザー設定（工数登録のメール通知、テーマ）
feature: user-settings
status: current
updated: 2026-10-15
code:
  - packages/api/src/features/user-settings/index.ts :: userSettings
  - packages/api/src/features/user-settings/repository.ts :: getUserSettingsByUserId
  - packages/api/src/features/user-settings/repository.ts :: createUserSettings
  - packages/api/src/features/user-settings/repository.ts :: updateUserSettings
  - packages/shared/src/schemas/userSettings.ts :: UpdateUserSettingsRequestSchema
  - packages/web/src/services/userSettings.ts :: ensureUserSettings
  - packages/web/src/services/userSettings.ts :: getUserSettings
  - packages/api/src/features/effort/service.ts :: sendEffortCompletionEmailIfNeeded
  - packages/web/src/services/userSettings.ts :: updateUserSettings
  - packages/web/src/store/userSettings.ts :: useUserSettingsStore
  - packages/web/src/features/auth/components/AuthGuard.tsx :: AuthGuard
  - packages/web/src/pages/settings/SettingsPage.tsx :: SettingsPage
  - packages/web/src/store/theme.ts :: useThemeStore
  - packages/web/src/app/providers/ThemeProvider.tsx :: ThemeProvider
  - packages/web/src/components/shared/ThemeToggle.tsx :: ThemeToggle
related: [effort-entry, auth, app-shell]
symptoms:
  - 設定の画面で「設定の取得に失敗しました」が出て、スイッチを押せない
  - メール通知を切ったのに、工数登録の完了メールが届く
  - ダークテーマなのに、開いた直後に一瞬白い画面が出る
---

# ユーザー設定（工数登録のメール通知、テーマ）

## TL;DR・改修前の必読

- 設定の画面（`/settings`）で、工数登録の完了メールを送るかどうか（`user_settings.notify_effort_email`）を切り替える。テーマ（ライト / ダーク）はヘッダーの切り替えボタンで変え、このブラウザにだけ保存する（サーバーには保存しない）
- 設定の行（ユーザーごとに 1 行）は、サインアップのときではなく、**ログインして最初に保護された画面を開いたとき**に web が作る（`AuthGuard` → `ensureUserSettings`）。行が無いあいだも、完了メールは送る側に倒す
- ⚠️ 改修の前に [§設計不変条件](#設計不変条件) と [§ポストモーテム](#ポストモーテム) を読む。初期化をサインアップに戻すと、トークンの無い呼び出しになって失敗する（2025-11 に起きた）

## 目的と利用者

- 目的: 工数登録のたびに届く完了メールを止められるようにする。画面の明るさを好みに合わせる
- 利用者と使う場面: メールが不要な利用者が設定の画面で切る。暗い場所で使う利用者がダークにする

## 振る舞いと受け入れ基準

### API（`/api/user-settings`、JWT）

- **AC-user-settings-01**: `GET` は、そのユーザーの設定の行があれば `200 { user_settings: { id, notify_effort_email, updated_at } }`、無ければ `404 { error: "User settings not found", accessLogId }`
- **AC-user-settings-02**: `POST`（本文は見ない）は、行があればその行を `200` で返し、無ければ `notify_effort_email: true` で作って `201` で返す
- **AC-user-settings-03**: `PUT { notifyEffortEmail: boolean }` は、行の `notify_effort_email` と `updated_at`（サーバーの時刻）を上書きして `200` で返す。行が無ければ `404`（作らない）。`notifyEffortEmail` が無い、真偽値でない、スネークケース（`notify_effort_email`）で送ったときは 400（`{ data, error: [...], success: false }`）
- **AC-user-settings-04**: どの操作も、トークンのユーザーの行だけを読み書きする。トークンが無ければ 401。行はユーザーごとに 1 行（`user_id` が一意）で、アカウントを消すと一緒に消える

### 画面と初期化

- **AC-user-settings-05**: 保護された画面を開くたびに（画面を移るたびにも）、`AuthGuard` が `GET` し、404 なら `POST` して、結果を設定のストアに入れる。終わるまで（失敗のときは `error_logs` への送信も含めて）、最初に開いたときは画面の形の読み込み中の表示を出す。失敗したら、ストアの設定はそのまま（初めてなら無し、前に取れていればその値）にして「初期化済み」にし、`error_logs` に送る。ユーザーがいなければ（未ログイン）、設定のストアを空にする
- **AC-user-settings-06**: 設定の画面（「設定」「アプリケーションの設定を管理」）に「通知設定」のカードがあり、スイッチ「工数登録時のメール通知」（説明「工数登録時、登録内容をメールで通知します」）を出す。スイッチは、ストアに設定があればその値、無いあいだはオンで表示する。初期化が済むまでと、設定が無いときと、保存中は押せない。初期化が済んで設定が無ければ「設定の取得に失敗しました。時間を空けて再度お試しください。」を出す
- **AC-user-settings-07**: スイッチを押すと、すぐ表示を切り替えてから `PUT` する。成功したらストアを更新する。失敗したら表示を元に戻し、「設定の更新に失敗しました。時間を空けて再度お試しください。」を出して `error_logs` に送る（トーストは出さない）
- **AC-user-settings-08**: Web の工数登録（`POST /api/effort/entries`）の完了メールは、設定の行が無いときと `notify_effort_email` が `true` のときに送り、`false` のときだけ送らない（effort-entry の AC-09）。設定の取得そのものが失敗したら送らない。GAS からの取り込みは、設定に関係なく完了メールを送らない

### テーマ

- **AC-user-settings-09**: ヘッダー（ログイン後の画面とランディングページ）の切り替えボタン（「テーマ切り替え」）で、ライトとダークを切り替える（「システムに合わせる」は無い）。既定はライト。選んだテーマは localStorage（キー `work-support-theme`）に保存し、次に開いたときに戻す。`<html>` に `light` / `dark` のクラスを付け、トーストもそのテーマで出す

## 画面と API

### 画面
- ルート: `/settings`（ヘッダーのユーザーメニューの「設定」）。テーマの切り替えはヘッダー（app-shell）
- 主な操作: メール通知のスイッチ

### API
| メソッドとパス | 認証 | 入力 | 出力 | 主なエラー |
| --- | --- | --- | --- | --- |
| `GET /api/user-settings` | JWT | なし | `UserSettingsResponseSchema` | 401、404、500 |
| `POST /api/user-settings` | JWT | なし | `UserSettingsResponseSchema`（201 / 200） | 401、500 |
| `PUT /api/user-settings` | JWT | `UpdateUserSettingsRequestSchema` | `UserSettingsResponseSchema` | 400、401、404、500 |

スキーマは `packages/shared/src/schemas/userSettings.ts`。全エンドポイントは [docs/reference/api.md](../../reference/api.md)。

## データ

- [user_settings](../../reference/database.md#user_settings): ユーザーごとに 1 行（`user_id` が一意、`auth.users` の削除で消える）。`notify_effort_email` の既定は `true`。`updated_at` はアプリが更新する（トリガーは無い）
- ブラウザ: 設定のストア（Zustand。`settings` と `initialized`。保存しない）、テーマ（Zustand の `persist`、localStorage の `work-support-theme`）

## 設計不変条件

- **INV-1**: 設定の行は、ログインして最初に保護された画面を開いたとき（トークンがあるとき）に作る。サインアップの直後に作らない。破ると、メールの確認が要る設定ではトークンが無く、作成が 401 で失敗する（ポストモーテム）
- **INV-2**: 行が無いときの完了メールは「送る」に倒す（既定が有効なので）。破ると、設定を一度も開いていない利用者にメールが届かなくなる
- **INV-3**: どのクエリも、トークンのユーザーの `user_id` で絞る（service role で接続しているので RLS に守られない）

## エラー時の挙動

- 初期化の失敗: 利用者には設定の画面でだけ見える（「設定の取得に失敗しました。…」）。`error_logs` に「Failed to ensure user settings」
- 初めてのユーザーの最初の `GET` の 404 は、毎回 `error_logs` に ERROR として残る（正常な流れの一部なのに）。`PUT` の 404 も同じ（画面からは押せないので、まれ）
- 保存の失敗: 画面の中の文と `error_logs`

## 既知の落とし穴

- **作成を同時に 2 回送ると片方が 500**: `POST` は「読んで無ければ作る」を 2 回の問い合わせで行うので、同時に 2 回来ると片方が一意の制約で 500 になる（ローカルの Supabase で確かめた）。開発時の StrictMode の二重実行や、初めてのログインで 2 つのタブを開いたときに起きうる。行はできるので害は小さいが、`error_logs` に残る
- **画面を移るたびに取り直す**: `AuthGuard` の確かめ（`supabase.auth.getUser()`）と設定の `GET` が、保護された画面を移るたびに走る（`useNavigate` が変わるため。`pnpm dev:local` で確かめた）
- **初期化の失敗で前の値が残る**: 2 回目以降の初期化（画面を移るたびに走る）が失敗しても、ストアの前の値が残り、設定の画面は失敗を出さずに前の値で押せる
- **ログアウトで設定のストアを消さない**: ヘッダーのログアウトもアカウントの削除も、設定のストアを消さない（消すのは、未ログインで保護された画面を開いたときだけ）。同じタブで別のユーザーがログインし、その初期化に失敗すると、前のユーザーの値が表示される（保存は新しいユーザーの行に行く）
- **設定の取得の失敗で完了メールが黙って送られない**: 完了メールを送る前の設定の取得が DB のエラーで失敗すると、メールは送られず、記録にも残らない（effort-entry の「完了メールの失敗が記録されない」と同じ）
- **行が無いと画面から直せない**: 初期化に失敗すると、スイッチは押せないまま。`PUT` は行を作らないので、画面を開き直すまで直らない
- **テーマのちらつき**: テーマのクラスは React が描画したあとで付けるので、ダークの利用者は開いた直後に一瞬ライトの画面を見る（手で確かめる項目）
- **使っていないもの**: SWR の `useUserSettings` は使われておらず、作成と更新のあとの `mutate` は空振りになる

## ポストモーテム

### 2025-11-17 症状「新規登録のたびに設定の作成が失敗し、設定の画面を開くまで設定ができない」（`91bc403`）
- **真因**: サインアップの直後に設定を作っていた。メールの確認が要る設定では、サインアップの時点でセッション（トークン）が無く、`POST /api/user-settings` が 401 で失敗していた（エラーは `error_logs` に送るだけで利用者には見えない）。設定の画面が開くたびに自分で取得と作成をして補っていた
- **対策**: 初期化を「ログインして最初に保護された画面を開いたとき」（`AuthGuard` → `ensureUserSettings`）に移し、結果をストアに入れて各画面はストアだけを見るようにした（INV-1）。何度呼んでもよいように、`POST` が行があれば 200 を返す作り（修正の前からあった）を使う
- **再発時に確認すること**: `createUserSettings` を `ensureUserSettings` の外から呼んでいないか。`error_logs` に「Failed to ensure user settings」や `POST /api/user-settings` の 401 が出ていないか。ログインしたことがあるのに設定の行が無いユーザーがいないか
- **改修の記録**: なし（移行前の修正。経緯は [v1.0.7-baseline](changes/v1.0.7-baseline.md)）

## テストとの対応

| AC | テスト | 種類 |
| --- | --- | --- |
| AC-user-settings-01〜04、INV-3 | `packages/api/test/user-settings.int.test.ts`（AC-01 の行の無いユーザーは `fresh-user.int.test.ts` でも） | 結合 |
| AC-user-settings-05、INV-1 | `packages/web/src/app/App.test.tsx`（`AuthGuard` の初期化） | 部品 |
| AC-user-settings-06、07 | `packages/web/src/pages/settings/SettingsPage.test.tsx` | 部品 |
| AC-user-settings-08、INV-2 | `packages/api/test/effort-entries.int.test.ts`（行が無い・true・false）、`gas-effort.int.test.ts`（GAS は送らない） | 結合 |
| AC-user-settings-09 | `packages/web/src/components/layout/AppShell.test.tsx`（「テーマ切り替え」） | 部品 |
| テーマのちらつき | 手動（`docs/testing/manual-checklist.md` の M-002） | 手動 |

## 変更履歴

| バージョン | 日付 | 内容 | 改修の記録 |
| --- | --- | --- | --- |
| v1.0.7 | 2026-10-15 | 移行時点の基準 | [v1.0.7-baseline](changes/v1.0.7-baseline.md) |
