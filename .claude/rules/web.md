---
paths:
  - "packages/web/src/**/*.{ts,tsx}"
---

# Web 実装のチェックリスト

`packages/web/src` を編集するときに読み込まれる要点。正典は `docs/steering/structure.md` と `docs/steering/ui-design.md`。手順は `packages/web/CLAUDE.md` の「UI 変更の手順」。

- **UI を変えるときは、実装の前に `docs/steering/ui-design.md` と `frontend-design` スキルを読み、Playwright MCP で今の画面を確認する**。実装の後に 375 / 768 / 1280px で確認する
- ページは `PageLayout` で包む。独自の横幅、余白、色を持ち込まない（色は `globals.css` のトークン）
- まず `components/ui/`（shadcn）と `components/` の共通部品を使う。同じ UI を 2 か所目で作るときは共通部品に切り出す
- 読み込み中（Skeleton）、0 件（`EmptyState`）、エラー（トースト + `reportUiError`）を必ず用意する
- API の呼び出しは `features/<feature>/api/`（`apiClient` + SWR）に置く。複数の機能から使うものは `api/` に置く。コンポーネントから axios を直接呼ばない
- 入出力の型は `@shared/schemas/*` から取る
- ページ（`pages/`）にはロジックを書かず、`features/<feature>/hooks` に置く。純粋なロジックは `features/<feature>/utils` に切り出してテストする
- import はパスエイリアス `@/` を使う。相対パスは同じ機能の中だけ
- 型だけの import は `import type`
- 使う外部スキル: UI の方針は `frontend-design`、shadcn のコンポーネントの使い方や追加は `shadcn`、React の性能や書き方は `vercel-react-best-practices`（個別のルールファイルだけ読む）、コンポーネントの設計は `vercel-composition-patterns`、アクセシビリティの確認は `web-design-guidelines`
