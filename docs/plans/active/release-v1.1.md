---
title: 本番への反映（v1.1.0 / v1.1.1）
status: draft
created: 2026-10-14
updated: 2026-10-14
approved_at:
branch: chore/harness-migration
scope:                 # /release でバージョンをそろえるときに触る範囲だけ
  - "package.json"
  - "packages/*/package.json"
---

# 本番への反映（v1.1.0 / v1.1.1）

<!--
本番に出すのは人間（デプロイ、マージ、本番 DB への SQL）。エージェントは手順と確認の材料をそろえるだけ。
各手順の「確認」が済んでから次へ進む。問題が出たら、その手順の「戻し方」で戻して止まる。
-->

## 現在地

- **フェーズ**: 手順書の作成（draft）。人間のレビュー待ち
- **次にやること**: 手順書のレビュー → 0. 事前の確認
- **ブロッカー**: なし

## 1. 目的

`chore/harness-migration` に溜まった変更のうち、本番の挙動に関わるものを、壊さずに本番へ出す。

| 何が | どこに出るか | 出し方 | 中身 |
| --- | --- | --- | --- |
| web | Vercel（`https://work-support-app.com`） | main へのマージで自動 | P2 の lint の修正（下記）。画面の見た目と API の契約は変えていない |
| API（v1.1.0） | Cloudflare Workers（`https://work-support-api.com`） | 人間が `pnpm -F api run deploy` | 認証が公開鍵方式（JWKS）のトークンにも対応。今の HS256 のトークンはそのまま通る（[改修の記録](../../specs/platform/changes/v1.1.0-auth-asymmetric-jwt.md)） |
| DB（v1.1.1） | 本番の Supabase | 人間が SQL エディタで実行 | プロフィール画像の保存先の権限を本人のフォルダに絞る（[改修の記録](../../specs/profile/changes/v1.1.1-avatar-storage-own-folder.md)） |

3 つは互いに依存しない（API の契約、shared のスキーマ、画像の保存先の形は変えていない）。**1 つずつ出し、そのたびに確かめる**ことで、問題が出たときにどれが原因かを切り分けられるようにする。

### web で挙動が変わりうる箇所（P2、`8f991a2`）

フックの依存配列の修正（挙動を変えないものだけを直した）。画面ごとに、開発用の環境で一度触って確かめる。

| 画面 | 変えたフック |
| --- | --- |
| パスワードの再設定 | `useResetPasswordManager` |
| 工数登録 | `useEffortSubmission`、`useEffortSummaryMetrics`（2 つは理由付きで lint を外しただけ） |
| 工数一覧 | `useEffortList` |
| 目標（現在、過去） | `useGoalsData`、`usePastGoalFilters`、`usePastGoals` |
| プロフィール | `useProfileManager` |
| トースト（全画面） | `use-toast` |

## 2. 決定事項

| # | 論点 | 決定 |
| --- | --- | --- |
| R1 | バージョン | **v1.1.1**（`/release` で package.json を 1.0.7 → 1.1.1 にそろえる）。CHANGELOG は `[1.1.0]`（認証、開発の進め方）と `[1.1.1]`（画像の権限）の 2 つの見出しに分け、同じ日付にする。改修の記録のバージョンとファイル名はそのまま（付け直さない） |
| R2 | 出す順番 | API → web → DB（下の 4 章）。API は後方互換なので先に出しても今の web で動く。DB の権限は最後に、画面からの画像の操作で確かめる |
| R3 | 本番 DB への SQL | `supabase db push` は使わない（本番のマイグレーションの履歴に基準のマイグレーションが無い見込みで、基準から流そうとする）。新しいマイグレーションの SQL だけを SQL エディタで `begin; ... commit;` で包んで実行する |

## 3. 完成形

- 本番の web と API が v1.1.1 で動き、ログイン、工数登録、目標、週報、プロフィール画像の変更が今までどおり使える
- 本番の avatars のポリシーが、本人のフォルダに絞った 4 つだけになっている
- `CHANGELOG.md` と package.json のバージョンが v1.1.1、改修の記録の `released_in` が埋まっている

## 4. フェーズと進捗

### 0. 事前の確認（本番には触らない）
- [ ] **CI**: main への PR で、`check` と `db` のジョブが緑
- [ ] **Vercel のプレビュー**: 同じ PR で、Vercel のプレビューのビルドが成功している。⚠️ P2 でルートの `package.json` に `engines.node: ">=24"` を足し、依存の版を pnpm の catalog（`"catalog:"`）でそろえるようにした。Vercel の Node の版や pnpm の版によっては、ここで失敗する。失敗したら本番に出す前に直す（Vercel の Project Settings → Node.js Version を 24.x に、など）
- [ ] **開発用の環境での動作確認**: 1 章の表の画面を一通り触る（ログイン、工数登録、工数一覧、目標の現在と過去、週報、プロフィール画像の変更、パスワードの再設定のメールの画面まで）。開発用には v1.1.1 の DB の権限も適用済み（2026-10-14）
- [ ] **本番の署名の方式**: Supabase のダッシュボード（本番）→ Project Settings → JWT Keys で、今の署名の方式を見る。HS256（Legacy JWT secret）のままなら、今回の API はそのまま通る。**この反映が終わるまで、署名の鍵を切り替えない**
- [ ] **本番の画像の置き場所**（読み取りだけ）: SQL エディタで、本人のフォルダの外の画像が 0 件であることを確かめる（v1.1.1 の改修の記録の「本番と開発用への適用」の 2）

### 1. バージョンをそろえる（エージェント + 人間）
- [ ] 人間が `/release` を呼ぶ（R1 のとおり v1.1.1 で、CHANGELOG を 2 つの見出しに分ける、と伝える）
- [ ] エージェントが package.json、CHANGELOG、改修の記録の `released_in` を更新し、型チェックとビルドを確かめる
- [ ] 人間がレビューしてコミット、PR に push。CI と Vercel のプレビューが緑のままであることを確かめる

### 2. API を出す（人間）
- [ ] **出し方**: PR をマージする前に、`chore/harness-migration` を手元に取り出した状態で、リポジトリのルートで `pnpm -F api run deploy`
  - マージを先にしてもよいが、そのときは web も同時に出るので、切り分けのため API を先にする
- [ ] **確認**: `https://work-support-app.com` に今の web でログインし、ホーム、工数一覧、目標を開く（401 にならない）。Cloudflare のダッシュボード → Workers → work-support → Logs で、エラーが増えていないこと
- [ ] **戻し方**: `pnpm --filter api exec wrangler rollback`（直前の版に戻る）、または Cloudflare のダッシュボード → Deployments から前の版を選ぶ

### 3. web を出す（人間）
- [ ] **出し方**: PR を main にマージする（Vercel が自動で本番に出す）
- [ ] **確認**: Vercel のダッシュボードでビルドとデプロイが成功。本番のデプロイのコミットが、main の最新（マージのコミット）と一致している。本番の画面で、1 章の表の画面を一通り触る（バージョンは画面に出ない。エラーの記録 `error_logs.app_version` に 1.1.1 が入る）
- [ ] **戻し方**: Vercel のダッシュボード → Deployments → 1 つ前のデプロイの「Promote to Production」（Instant Rollback）。main の履歴は戻さなくてよい

### 4. DB の権限を変える（人間）
- [ ] **出し方**: 本番の SQL エディタで、`packages/api/supabase/migrations/20261014000000_restrict_avatar_storage_to_own_folder.sql` の中身を `begin;` と `commit;` で包んで実行する
  - 古いポリシーが名前の違いで残っていると、最後の検査がエラーで止め、全体が取り消される。そのときはエラーの文に出た名前を控えて止まる（エージェントに相談する）
- [ ] **確認**: 読み取りだけで `select policyname, cmd from pg_policies where schemaname = 'storage' and tablename = 'objects';` を実行し、avatars のポリシーが `Users can ... their own avatars` の 4 つだけ。本番の画面で、プロフィール画像の設定と、拡張子の違う画像への差し替えを試す
- [ ] **戻し方**: 下の SQL で元の 4 つに戻す（権限の穴も元に戻るので、原因を直したらすぐに出し直す）

  ```sql
  begin;
  drop policy if exists "Users can read their own avatars" on storage.objects;
  drop policy if exists "Users can upload their own avatars" on storage.objects;
  drop policy if exists "Users can update their own avatars" on storage.objects;
  drop policy if exists "Users can delete their own avatars" on storage.objects;
  create policy "Allow authenticated users to manage avatars 1oj01fe_0" on storage.objects for select to authenticated using (bucket_id = 'avatars');
  create policy "Allow authenticated users to manage avatars 1oj01fe_1" on storage.objects for insert to authenticated with check (bucket_id = 'avatars');
  create policy "Allow authenticated users to manage avatars 1oj01fe_2" on storage.objects for update to authenticated using (bucket_id = 'avatars');
  create policy "Allow authenticated users to manage avatars 1oj01fe_3" on storage.objects for delete to authenticated using (bucket_id = 'avatars');
  commit;
  ```

### 5. 後片付け（エージェント）
- [ ] 改修の記録（v1.1.0、v1.1.1）に本番への反映の日付と確認の結果を書く
- [ ] `docs/steering/deployment.md` の「テスト用の Supabase は… P3 で整備」を今の姿（自動テストはローカルの Supabase、開発用はクラウド）に直す
- [ ] この計画書を `status: done` にして `docs/plans/completed/` へ移す

## 5. リスクと注意点

- **web のビルドの環境**（0 章）: 本番で初めて失敗すると、Vercel は前の版を出し続けるので画面は止まらないが、マージ後に main と本番がずれる。必ず PR のプレビューで先に確かめる
- **API の認証**: HS256 のトークンの検証は前と同じ処理（共有シークレット）を通る。違いは、許す署名の方式を HS256 / ES256 / RS256 に限ったこと（前は jose の既定で、シークレットに合う方式なら通していた）。Supabase の HS256 のトークンには影響しない
- **本番の署名の鍵の切り替え**: 今回の API を出す前に切り替えると、全員が 401 になる（platform の spec.md の「既知の落とし穴」）
- **出す時間帯**: 利用者が少ない時間に、1 つずつ。各手順のあとで確認が済んでから次へ

## 6. 決定ログ

| 日付 | 決定 | 理由 |
| --- | --- | --- |
| 2026-10-14 | R1〜R3 を提案（人間のレビュー待ち） | 3 つの出し先が独立しているので、1 つずつ出して切り分けられるようにする。本番の DB はマイグレーションの履歴が無い見込みなので、新しい SQL だけを流す |
