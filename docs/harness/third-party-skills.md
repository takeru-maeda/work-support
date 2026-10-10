# 外部スキルの管理

外部スキルは `npx skills add <owner/repo> -s <skill> -a claude-code -y` で `.claude/skills/` に入れ、`skills-lock.json` でバージョンを固定する。スキルの中身はそのままエージェントへの指示になるので、**入れる前と更新したあとに、必ず全文を読んで確認する**。

## ステージの扱い

外部スキルは自分で書いたものではないので、入れたらステージしてよい（人間が未ステージの差分で見るのは、このリポジトリで手を入れた部分だけで足りる）。

1. `npx skills add` で入れたスキルのフォルダと `skills-lock.json` をステージする
2. このリポジトリで手を入れたファイル（`[work-support patch]`）は、**インストールしたままの元の内容**をステージし、修正は未ステージの差分として残す。元の内容は、一時フォルダで同じスキルを入れ直して取り出し、`git hash-object -w` と `git update-index --cacheinfo` でステージに入れる
3. このリポジトリで新しく足したファイル（例: `web-design-guidelines/guidelines.md`）はステージしない

## 導入済み（2026-10-10）

| スキル | 入手元 | 扱い |
|---|---|---|
| frontend-design | anthropics/skills | そのまま使う（同じものがユーザー単位のプラグインにもあるが、リポジトリ内にも置いて環境をそろえる） |
| web-design-guidelines | vercel-labs/agent-skills | **手を入れた**: 確認項目のファイルをコミット固定のコピーにした |
| shadcn | shadcn-ui/ui | **手を入れた**: `allowed-tools` と、読み込み時の自動実行を削除 |
| vercel-react-best-practices | vercel-labs/agent-skills | 上書きルールあり（Next.js 専用のルールは使わない） |
| vercel-composition-patterns | vercel-labs/agent-skills | そのまま使う |
| hono | honojs/skills | 上書きルールあり（v4、CLI を使わない） |
| workers-best-practices | cloudflare/skills | 上書きルールあり |
| wrangler | cloudflare/skills | 上書きルールあり、deny 設定あり |
| supabase | supabase/agent-skills | 上書きルールあり（DB を直接変更しない） |
| supabase-postgres-best-practices | supabase/agent-skills | 上書きルールあり |
| vitest | antfu/skills | 上書きルールあり（v5 向けの内容。実際は 3.2） |
| playwright-best-practices | currents-dev/playwright-best-practices-skill | 上書きルールあり |
| refactor | github/awesome-copilot | **手を入れた**: コミットの指示を削除 |

上書きルールは `.claude/rules/third-party-skills.md` にある。機械的に止める設定は `.claude/settings.json` にある。

## このリポジトリで手を入れた箇所（`[work-support patch]` の印が目印）

| ファイル | 変更内容 | 理由 |
|---|---|---|
| `shadcn/SKILL.md` | frontmatter の `allowed-tools`（shadcn CLI のすべてのサブコマンドを確認なしで実行できる設定）を削除。読み込み時に `npx shadcn@latest info --json` を自動で実行する行を削除 | 既存コンポーネントの上書きと、バージョンを固定していないパッケージの自動実行を防ぐ |
| `web-design-guidelines/SKILL.md`、`guidelines.md` | 実行のたびに GitHub の main ブランチから取得していた確認項目を、コミット `434b7f9` の固定コピー `guidelines.md` に置き換え。日本語の UI と SPA 向けの注記を追加 | 外部の内容がそのまま指示になる経路をふさぐ |
| `refactor/SKILL.md` | コミットやブランチ作成の指示を、テストが通っていることの確認に置き換え | コミットは人間が行うため |

## 監査の要点（2026-10-10）
- 隠し文字、プロンプトインジェクション、テレメトリ、外部への送信はなかった。
- 危険度が高い指摘は 3 件で、上の表の手を入れた箇所で対応済み。
- 発動しやすすぎるスキル（`supabase`、`supabase-postgres-best-practices`、`hono`、`shadcn`、`vercel-react-best-practices`、`playwright-best-practices`）は、`settings.json` の `skillOverrides` で `name-only`（説明文を一覧に出さない）にした。使う場面は `.claude/rules/` の api / web / tests / migrations に名前で書いてある。
