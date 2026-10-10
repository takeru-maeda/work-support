# packages/web — エージェント規約（正本）

React 19 + Vite 7 + React Router 6 の SPA（Vercel にデプロイ）。UI は shadcn/ui（radix, new-york）+ Tailwind CSS 4。横断ルールはルートの `CLAUDE.md`、構成のパターンは `docs/steering/structure.md`。`AGENTS.md` はこのファイルへのシンボリックリンク。

> autonomous-impl の各工程スキルは、このファイルの節を名前で参照する。節の名前を変えない。

## 開発コマンド

- 依存のインストール: リポジトリのルートで `pnpm install`
- 開発サーバー: ルートで `pnpm dev:web`（Vite、localhost:5173）。API も使う画面は `pnpm dev:api` も起動する
- 環境変数: `.env`（git に入れない）。**エージェントは読まない**。フロントエンドに公開する値は `VITE_` を付ける（ビルドに埋め込まれて誰でも見られるため、秘密情報を置かない）

## ビルド・テスト・型チェックの鉄則

- 型チェック: `pnpm --filter web exec tsc -p tsconfig.app.json --noEmit`（数秒で終わる）
- ビルド: `pnpm --filter web build`（`tsc -b && vite build`）
- lint: `pnpm exec eslint packages/web/src`（P2 で既存のエラーを一掃するまでは、**今回触ったファイルだけ**を対象にする）
- テスト: Vitest + Testing Library + MSW は移行計画の P4 で整備する。それまでは、純粋なロジック（`utils/`、計算）の単体テストを `pnpm --filter web exec vitest run <path>` で書く
- shadcn の CLI は、どのサブコマンドも実行前にユーザーへ確認する（`.claude/rules/third-party-skills.md`）

## 参照 grep の対象パス

```bash
rg '<トークン>' packages/web/src packages/shared/src packages/api/src
```

ルート名やナビゲーションを変えたら `src/config/routes.ts` と `src/config/navigation.ts` の参照も確かめる。

## バグ調査の入口

- 仮説を立てる前に `docs/specs/incidents.md` を引き、該当する `docs/specs/<feature>/spec.md` の「設計不変条件」と「ポストモーテム」を読む
- 画面の不具合は、Playwright MCP で実際に開いて再現させてから仮説を立てる（コンソールとネットワークも見る）

## UI 変更の手順

UI を変える改修では、実装の前に必ず次を行う。

1. `docs/steering/ui-design.md` と `frontend-design` スキルを読み込む
2. 開発サーバーを起動し、**Playwright MCP で今の画面と手本の画面を開いて確認する**
   - ログインが必要な画面は、テスト用のアカウントでログインする（アカウントの用意は移行計画の P4。用意できるまではユーザーに確認方法を聞く）
3. 手本の画面を 1 つ選び、器（`PageLayout`、幅、余白）をそろえる。独自の幅や色を持ち込まない
4. 既存の部品（`components/ui/`、`components/` の共通部品）を流用する。2 か所目で同じ UI を作るときは共通部品に切り出す
5. 実装の後、**375px / 768px / 1280px の 3 幅**でスクリーンショットを撮り、手本と見比べる。崩れがあれば直して撮り直す
6. 一時ファイル（`.playwright-mcp/` など）を残さない

## テスト方針

- 方針の正典は `docs/steering/testing.md`
- 純粋なロジックは `features/<feature>/utils/` に切り出して単体テストする
- フックとコンポーネントは Testing Library + MSW、画面の通しは Playwright（P4 で整備）

## ドキュメントの更新先

完了報告では、次のそれぞれについて「更新した / 不要（理由）」を言い切る。

1. 該当する `docs/specs/<feature>/spec.md`（画面、振る舞い、不変条件、テストとの対応、変更履歴）と frontmatter の `code` / `symptoms`
2. 改修の記録の検証結果（UI の変更ならスクリーンショット）
3. バグ修正なら: ポストモーテム、`docs/specs/incidents.md`、再発防止テスト
4. `CHANGELOG.md` の Unreleased
5. steering（新しいパターンや部品の置き場を作ったときだけ。`ui-design.md` を含む。`steering` スキルの差分モード）
6. `docs/testing/manual-checklist.md`（PWA、端末依存など、手動でしか確かめられない挙動が増減したとき）

## 注意事項

- API の呼び出しは `src/services/<feature>.ts`（axios の `apiClient` + SWR）に置く。コンポーネントから axios を直接呼ばない
- 入出力の型は `@shared/schemas/*` から取る。web 側で同じ型を定義し直さない
- 工数登録の下書きは端末間で同期している（`useEffortDraftSync`）。下書きや保存処理を変えるときは、effort-draft の仕様書の不変条件を必ず読む
- 取り消せない操作の例（実行前にユーザーへ確認）: アカウント削除などの操作を実際のアカウントで試すこと、本番の API に向けた動作確認
