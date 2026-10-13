# packages/api — エージェント規約（正本）

Hono 4 + Cloudflare Workers の API。Supabase（PostgreSQL）に service role キーで接続する。横断ルールはルートの `CLAUDE.md`、構成のパターンは `docs/steering/structure.md`。`AGENTS.md` はこのファイルへのシンボリックリンク。

> autonomous-impl の各工程スキルは、このファイルの節を名前で参照する。節の名前を変えない。

## 開発コマンド

- 依存のインストール: リポジトリのルートで `pnpm install`
- 開発サーバー: ルートで `pnpm dev:api`（`wrangler dev`、localhost:8787。Swagger UI は `/ui`）
- 環境変数: `.dev.vars`（git に入れない。項目は `.dev.vars.example`）。**エージェントは読まない**

## ビルド・テスト・型チェックの鉄則

- 型チェック: `pnpm --filter api run typecheck`（数秒で終わる。編集のたびに回してよい）
- lint と整形: ルートで `pnpm lint` / `pnpm format:check`（エラー 0 を保つ）。編集したファイルは hook が自動で整形と lint の修正をかける
- 単体テスト（DB を使わない、`*.test.ts`）: `pnpm --filter api exec vitest run <path> --reporter=dot`
- 結合テスト（DB を使う、`*.int.test.ts`）: ルートで `pnpm db:start`（ローカルの Supabase。初回は数分）→ `pnpm test:int`。接続先はローカルの Supabase だけで、`.dev.vars` は読まない。テスト用ユーザーの作り方とトークンは `test/helpers.ts` と `test/tokens.ts`
- デプロイ（`pnpm -F api run deploy`）とシークレットの変更は人間が行う

## 参照 grep の対象パス

識別子やスキーマ、カラム名、文字列 ID を変えたら、次の範囲で残っている参照を確かめる（api だけでなく web と shared も）:

```bash
rg '<トークン>' packages/api/src packages/shared/src packages/web/src
```

## バグ調査の入口

- 仮説を立てる前に `docs/specs/incidents.md` を引き、該当する `docs/specs/<feature>/spec.md` の「設計不変条件」と「ポストモーテム」を読む
- ログ: エラーは `error_logs`、リクエストは `access_logs`。レスポンスの `accessLogId` でたどれる（DB を直接見るのは人間に頼む）

## テスト方針

- 方針の正典は `docs/steering/testing.md`
- service の業務ロジックは、repository を差し替えて単体テストする（supabase クライアントを引数で受け取る作りを使う）
- ルートは `test/helpers.ts` の `callApi`（`app.request` に、ローカルの Supabase の環境変数と `waitUntil` の代わりを渡す）で通してテストする（`*.int.test.ts`）

## ドキュメントの更新先

完了報告では、次のそれぞれについて「更新した / 不要（理由）」を言い切る。

1. 該当する `docs/specs/<feature>/spec.md`（API の表、データ、不変条件、テストとの対応、変更履歴）と frontmatter の `code` / `symptoms`
2. 改修の記録（`docs/specs/<feature>/changes/v<X.Y.Z>-<slug>.md`）の検証結果
3. バグ修正なら: ポストモーテム、`docs/specs/incidents.md`、再発防止テスト
4. `CHANGELOG.md` の Unreleased
5. steering（新しいパターンや技術の変更があるときだけ。`steering` スキルの差分モード）
6. `docs/testing/manual-checklist.md`（手動でしか確かめられない挙動が増減したとき）
7. `docs/reference/`（自動生成。API のルート、説明、入力、応答を変えたら `pnpm api:docs`、DB のスキーマを変えたら `pnpm db:types`。作り直し忘れは `pnpm check` と CI が止める）

## 注意事項

- service role キーで接続するため RLS に守られない。**すべてのクエリに `user_id` の条件を入れる**。ユーザー ID は `c.get("user")` から取る
- エラーは `AppError` で投げる。レスポンスの形は `globalErrorHandler` が決める（`docs/steering/error-handling.md`）
- 入出力のスキーマは `packages/shared/src/schemas` に置き、api 側で重複して定義しない
- ローカルの API（`pnpm dev:api`）は `.dev.vars` の DB（2026-10-13 からクラウドの開発用。人が画面を触って確かめる環境）につながり、**どのリクエストも `access_logs` に書き込む**。起動して待ち受けを確かめるだけならよいが、リクエストを送る動作確認は事前にユーザーへ確認する。自動の確認は結合テスト（ローカルの Supabase）で行う
- 取り消せない操作の例（実行前にユーザーへ確認）: マイグレーションの適用、`supabase db push` / `reset`、データの一括更新・削除、`wrangler deploy`、`wrangler secret`、メールの送信を伴う動作確認
