---
title: ハーネス構築と仕様書駆動ワークフローへの移行
status: in_progress    # draft → approved → in_progress → done
created: 2026-10-10
updated: 2026-10-10
approved_at: 2026-10-10
branch: chore/harness-migration
scope:                 # P2 の lint の一括修正と依存の整理、P4 のテスト、P7 の構造の整理で packages 全体を触るため
  - "packages/**"
  - "package.json"
  - "pnpm-lock.yaml"
---

# ハーネス構築と仕様書駆動ワークフローへの移行

## 現在地

- **フェーズ**: P1（指示系の一本化とドキュメントの移設）の作業が完了。人間のレビュー待ち
- **次にやること**: P1 のレビューとコミット（人間）。その後 P2（機械的強制の土台）
- **ブロッカー**: なし（Context7 は `mcp__context7__resolve-library-id` / `mcp__context7__query-docs` で使えることを 2026-10-10 に確認した）

---

## 1. 目的

AI エージェントが次の流れを自律的に進められるようにする。

1. 改修ドキュメント（仕様の差分、影響範囲、実装計画）を作成する
2. 人間が承認する
3. 実装、検証、リファクタ、ドキュメントの同期を行う

人間は出力をほとんど指摘なしでレビューし、そのままコミットできる状態を目指す。

そのために、次の 2 つを整える。

- **Guides（事前に方向を示すもの）**: 地図としての CLAUDE.md、steering、機能ごとの仕様書、スキル、パス単位のルール
- **Sensors（事後に間違いを検出するもの）**: lint、型チェック、単体・結合テスト、E2E テスト、hooks、CI、バグ点検用のサブエージェント、`/code-review`

**ハーネスは使いながら鍛えていくもの**とする。作業中に見つかったハーネスの不具合や穴、人間のレビューで出た指摘は、エージェントが改善案として提案する。改善はできる限りルールの追記ではなく、Sensor（lint・テスト・hook）への変換で行う（6 章を参照）。

参考にしたもの:
- OpenAI「Harness engineering」
- Anthropic「Effective harnesses for long-running agents」「Harness design for long-running apps」
- Böckeler「Harness engineering」（martinfowler.com）
- Hashimoto「Engineer the Harness」
- moon-voice の `autonomous-impl`（最新版。工程の土台にする）
- bridge-api の `autonomous-impl`（設計の承認ゲート、Stop hook）

## 2. 決定事項

| # | 論点 | 決定 |
|---|---|---|
| D1 | 仕様書の型 | 機能ごとに `docs/specs/<feature>/spec.md`（現在の姿）を作り、同じフォルダの `changes/` にバージョンごとの改修ドキュメントを置く。これとは別に `CHANGELOG.md` も作る |
| D2 | 承認対象 | 改修ドキュメント 1 枚。中身は背景、仕様の差分、影響範囲、受け入れ基準、実装計画、テスト方針。承認は 1 回 |
| D3 | 承認の判定 | 改修ドキュメントの frontmatter の `status` で判定する。承認済みの改修も計画もないときは、hook で `packages/` 配下の編集を止める |
| D4 | ツール | Claude Code に一本化する。`.kiro` / `.cursor` / `.agent` / `AI_AGENT_GUIDE.md` は廃止する。`AGENTS.md` は `CLAUDE.md` へのシンボリックリンクにする |
| D5 | テスト | 基盤、E2E（Playwright）、既存機能の広いテストまで入れる |
| D6 | テスト DB | クラウドにある既存の開発用 Supabase（本番とは別のアカウント）を使う。削除はせず、DB の中身だけを本番から作った基準のマイグレーションで作り直す（2026-10-13 に変更） |
| D7 | スキーマ | 本番のスキーマをマイグレーションとして取り込み、以後はマイグレーションで管理する |
| D8 | CI / ブランチ | GitHub Actions を導入する。AI は作業ブランチで作業し、コミットは人間がレビューしてから行う |
| D9 | 移行範囲 | lint の一括修正、`@docs` → `docs/` への改名、依存関係の整理、構造の不整合の解消 |
| D10 | 仕様書の粒度 | 振る舞いと設計の要点まで書く（受け入れ基準、設計不変条件、ポストモーテムを含む）。詳細な実装はコードを正とする |
| D11 | 大きなタスク | 通常の改修とは別に、`docs/plans/active/` に計画書を作り、進捗と決定ログもそこで管理する |
| D12 | 実装フロー | moon-voice の `autonomous-impl` を土台にする。**`autonomous-impl` は工程の順番、ゲート、原則だけを持つ司令塔とし、各工程の手順は工程ごとのスキル（`impl-*`）に分ける**。司令塔が順番どおりに工程スキルを呼ぶ。設計の工程は「改修ドキュメントの作成 → 承認」に置き換える（3.2 を参照） |
| D13 | 仕様レビュー | `spec-reviewer` は M 以上の改修だけで使う。見るのは影響範囲の漏れ、既存の仕様やコードとの矛盾、受け入れ基準がテストで確かめられるかに限る。指摘するだけで、修正は親エージェントが行う |
| D14 | ファイル名 | `docs/specs/<feature>/changes/v<X.Y.Z>-<slug>.md`。起票時に SemVer で次のバージョンを決める。リリース時にずれていたらファイル名を直す |
| D15 | steering | `docs/steering/` に移す。ファイル構成はそのまま残し、中身だけ整理する。product、tech、structure は CLAUDE.md から毎回読み込み、それ以外は path 付きのルールから必要なときに参照する。`/kiro:steering` はほぼそのまま日本語に訳して、`steering` スキルとして移植する |
| D16 | 外部スキル | `npx skills` でリポジトリ内（`.claude/skills` と `skills-lock.json`）に入れる。採用する前に中身を読んで確認する |
| D17 | リファクタ | 親エージェントが連続したコンテキストのまま行う（`refactor` スキルを使う）。サブエージェントには任せない |
| D19 | ライブラリの確認 | Context7 は `mcp__context7__resolve-library-id` → `mcp__context7__query-docs` の順で使う。スキル、エージェント（`bug-reviewer` などの tools の許可リスト）、ルールでは、このツール名で書く。Context7 で見つからないときはネット検索を使う |
| D20 | 全体像の文書 | テーブルの全体像（ER 図つき）は `docs/reference/database.md`、エンドポイントの全体像は `docs/reference/api.md` に置く。**コードから自動で作る**（DB は `packages/shared/src/types/db.ts`、API は OpenAPI 定義）。テーブルの目的や担当する機能など、自動で作れない説明だけを印で区切った場所に手で書く。生成し直した結果とずれていたら、自己点検と CI で失敗にする。ER 図にはログ用のテーブルも含める |
| D18 | バグ調査の入口 | `docs/specs/incidents.md`（症状から原因へたどる索引）を作る。各仕様書には「設計不変条件」と「ポストモーテム」の節を設ける。バグ調査はまず incidents.md から始める |

## 3. 完成形の全体像

### 3.1 ディレクトリ

```
CLAUDE.md                      # 地図（150 行以内）。AGENTS.md はここへのシンボリックリンク
                               # 中身: 言語ルール、ハーネスの原則、地図、steering の読み込み（@import）、実装フローへの導線
packages/api/CLAUDE.md         # api 固有の事実の正本（moon-voice の apps/*/AGENTS.md と同じ節構成。3.3 を参照）
packages/web/CLAUDE.md         # web 固有の事実の正本（UI 変更の手順を含む）
CHANGELOG.md
skills-lock.json               # 外部スキルのバージョン固定
.claude/
  settings.json                # permissions と hooks
  hooks/                       # spec-gate / guard-bash / format-on-edit / verify-gate（3.4 を参照）
  skills/
    autonomous-impl/           # ★ 司令塔: 工程の順番、ゲート、原則、規模の判定、完了条件（3.2 を参照）
    impl-investigate/          # 工程 0: 仕様の把握、incidents、バージョンの確認
    impl-spec/                 # 工程 1: 改修ドキュメントの作成、spec-reviewer、承認の依頼
    impl-tdd/                  # 工程 2: TDD による実装
    impl-bug-check/            # 工程 3: 機械チェック、bug-reviewer への依頼、指摘の振り分け
    impl-verify/               # 工程 4: 影響範囲のテスト、E2E、UI の 3 幅確認
    impl-refactor/             # 工程 5: リファクタと後片付け（refactor スキルを使う）
    impl-review/               # 工程 6: /code-review と指摘の振り分け
    impl-docs/                 # 工程 7: spec、incidents、CHANGELOG などの更新
    impl-complete/             # 工程 8: 完了ゲート、完了報告、ハーネス改善の提案
    plan/                      # 大きなタスクの計画書の起票と進捗管理
    release/                   # バージョン確定、CHANGELOG の確定、changes の確定
    steering/                  # /kiro:steering と steering-custom を日本語化して移植。通常モード（全体の同期。定期的な掃除で使う）と差分モード（工程 7 から、改修の差分だけを渡して使う）を持つ
    spec-backfill/             # 旧ドキュメントとコードから仕様書を作る（移行期間だけ使う）
    <外部スキル>/               # 3.5 を参照
  agents/
    bug-reviewer.md            # moon-voice 版を移植（重要度と確信度を付け、確信度 80 以上だけ報告。ライブラリの誤用は Context7 で照合）
    spec-reviewer.md           # D13 の範囲だけを見る
  rules/                       # paths: で対象を絞る。発火点チェックリストを置き、正典は steering を参照する
    api.md / web.md / shared.md / tests.md / migrations.md
docs/
  README.md                    # 索引
  steering/                    # product / tech / structure / api-standards / authentication / database /
                               # deployment / error-handling / security / testing / ui-design（新設）
                               # + 書き方の原則とテンプレートは `.claude/skills/steering/references/` に置く（steering 自体にエージェント用の道具の話を混ぜないため）
  specs/
    README.md                  # 機能の索引
    incidents.md               # 症状から原因へたどる索引
    _template/spec.md, change.md
    <feature>/
      spec.md                  # 現在の姿
      changes/
        v1.0.8-<slug>.md       # 改修ドキュメント（承認の対象であり、履歴でもある）
  plans/
    _template.md
    active/ | completed/       # 大きなタスクの計画書（この文書）
  harness/
    improvements.md            # ハーネス改善の提案と、対応したものの記録
  adr/                         # 設計判断の記録。書き換えず、覆すときは新しい ADR を追加する
  testing/manual-checklist.md  # 自動テストで確認できない挙動のチェックリスト
  guides/                      # 既存の規約類のうち、lint で強制できないものだけ残す
  reference/                   # コードから自動で作る全体像（D20）
    database.md                # ER 図（Mermaid）、テーブルとビューの列。説明の欄だけ手書き
    api.md                     # エンドポイントの一覧（メソッド、パス、認証、機能、入出力のスキーマ）。説明の欄だけ手書き
```

### 3.2 改修フロー（司令塔の `autonomous-impl` と、工程ごとのスキル `impl-*`）

**構成**
- `autonomous-impl`（司令塔）が持つのは、原則、工程の順番、人間を止める条件、規模の判定、完了条件だけ。各工程では「`impl-xxx` スキルを読み込んでから実施する」と指示する。
- 工程ごとのスキルが持つのは、その工程の詳しい手順。共通の形は次のとおり。
  - **入口条件**: 前の工程が改修ドキュメントの工程チェックリストで完了になっていること。完了していなければ司令塔に戻る。
  - **手順**
  - **出口条件**: チェックリストに印を付け、次の工程を明記する。
- 工程スキルは**同じコンテキストの中で読み込む**（`context: fork` は使わない）。リファクタやドキュメントの更新を、文脈を持った親エージェントのまま行うため。
- 工程スキルが単独で勝手に起動しないように、description に「autonomous-impl の工程 N から呼ぶ」と明記し、スラッシュメニューからも隠す（frontmatter の設定は P1 で動作を確認する）。

**順番をどう守るか**
- 順番を決めるのは司令塔だけにする。
- 工程スキルどうしは、改修ドキュメントの工程チェックリストを通じてつながる。各工程の入口条件で、前の工程が終わっているかを確認する。
- hook（`spec-gate`、`verify-gate`）が、承認前の実装と、検証しないままの終了を機械的に止める。
- 承認待ちの間にセッションが分かれても、改修ドキュメントの `status` と工程チェックリストを見て、続きから再開する。

**moon-voice のスキルから改善する点**

| # | moon-voice の今の形 | 改善 |
|---|---|---|
| 1 | 142 行の 1 ファイルに全工程が入っていて、毎回すべてを読み込む | 司令塔は短くし、各工程の詳細はその工程に入ったときだけ読み込む（コンテキストの節約と、工程ごとの改善のしやすさ） |
| 2 | 進捗は TodoWrite だけで管理し、セッションをまたぐと消えやすい | 改修ドキュメントの工程チェックリストに記録する（ファイルに残るので、コンパクションやセッションをまたいでも消えない） |
| 3 | Stop hook がなく、検証を飛ばしても止められない | `verify-gate`（bridge-api の方式）と `spec-gate` で機械的に止める |
| 4 | 完了の証拠は完了報告の中にしかない | 改修ドキュメントの「検証結果」に、実行したコマンド、結果、スクリーンショットを残す |
| 5 | `.claude/rules` の paths の glob が、ディレクトリ移動のあとで何にもマッチしなくなっていた（rules が読み込まれない） | **ハーネスの自己点検スクリプト**を作り、CI で回す。確認する内容は、rules の glob がファイルにマッチするか、スキルや CLAUDE.md が参照しているパスや節が存在するか、工程スキルがすべて揃っているか |
| 6 | 使われていない古いエージェント（design-architect など）が残っている | 移植しない。使うのは `bug-reviewer` と `spec-reviewer` だけ |
| 7 | 再発防止の提案は、エージェントの指摘から出たものだけ | 人間のレビューで出た指摘も含め、`docs/harness/improvements.md` に記録して管理する |

**工程の一覧**（各行の要点が、その工程スキルの中身になる）

| # | 工程 | 担当 | 要点（moon-voice から引き継ぐ / 今回新しく足す） |
|---|---|---|---|
| 0 | 仕様の把握 | 親 | **バグのときは、仮説を立てる前に `incidents.md` を引き、該当する仕様書の「設計不変条件」と「ポストモーテム」を読む**。広く読む必要があるときは Explore に任せ、結論だけを受け取る（コンテキストを汚さないため）。**外部のライブラリやフレームワークに関わるときは、まず package.json と lock で実際のバージョンを確認し、Context7 かネット検索でそのバージョンの正しい使い方を確かめる** |
| 1 | 改修ドキュメントの作成 | 親 | 手本にする既存コードを `file:line` で 1〜2 例挙げる。**影響範囲を調べる**: 変更対象を参照している箇所を grep でたどり、機能、API と shared のスキーマ、DB、画面、テスト、ドキュメントへの影響を洗い出す。受け入れ基準（AC）は 3〜7 個で、正常系、異常系、境界、非機能を含める。**UI の変更は、Playwright MCP で今の画面と手本の画面を確認し、`frontend-design` と `ui-design.md` を読み、既存コンポーネントを流用できるか、レスポンシブをどう作るかを計画に書く** |
| 1b | 仕様レビュー（M 以上） | `spec-reviewer` | D13 の範囲だけを見る。指摘を反映するのは親 |
| ★ | **承認ゲート** | 人間 | 改修ドキュメントを提示する。人間が「承認」と言ったら `status: approved` にする。ここで止まる |
| 2 | TDD による実装 | 親 | Red → Green → 小さなリファクタ。既存コードを変えるときは、触る前に今の挙動をテストで固定する（特性化テスト） |
| 3 | バグの自己点検 | 親と `bug-reviewer` | 3a: 型チェックと lint。3b: バグ点検エージェントに渡すのは、仕様、承認済みの計画、AC、変更ファイルの一覧だけ（実装の意図は渡さない）。見る観点は正しさ、アーキテクチャ、ライブラリの誤用。3c: 指摘を重要度で振り分けて直す。差し戻しは最大 3 周 |
| 4 | 動作検証 | 親 | 成功は静かに、失敗だけを詳しく出す。**影響範囲は参照を grep して決め**、その範囲のテストを実行する。UI の変更は実際に起動して画面を確認し、**375px、768px、1280px の 3 幅**で崩れがないかを確かめ、手本の画面と見比べる。E2E も回す |
| 5 | リファクタリング | **親** | `refactor` スキルを使い、コードスメルを名指ししてから変換を当てる。デバッグ用のコードや一時ファイルも片付け、diff をそのままレビューに出せる状態にする。1 回変換するたびにテストが緑であることを確認する |
| 6 | コードレビュー | `/code-review` | effort は規模に合わせる（S は low、M は medium、L は high）。**CONFIRMED** で改修範囲内の Critical / Major は直す。**PLAUSIBLE** は親がコードを読んで確かめてから判断し、直さないときは理由を検証結果に残す。範囲外の指摘は記録だけする（bug-reviewer の「確信度 80 以上だけ」と考え方を揃える。CONFIRMED / PLAUSIBLE の扱いは P1 で実際の動作を確かめる） |
| 7 | ドキュメントの更新 | **親** | `spec.md` を現在の姿に更新する（変更履歴の欄に改修ドキュメントへのリンクを追加）。バグ修正なら、ポストモーテム、incidents.md、再発防止テストの 3 点を揃える。ほかに manual-checklist と `CHANGELOG.md` の Unreleased も更新する。**steering は、まず更新が必要かを判断する**（新しいパターン、規約、技術の変更があるときだけ必要。既存のパターンに沿っただけなら「不要」）。必要なら `steering` スキルを**差分モード**で呼び、今回の改修ドキュメントと差分だけを渡して、影響する steering ファイルを追記を基本として更新する |
| 8 | 完了ゲートと完了報告 | 親 | すべての AC を満たし、最後にもう一度テストなどを全部回して緑であること。指摘の Critical と Major がゼロであること。ドキュメントの更新先を 1 つずつ「更新した / 不要（理由）」と言い切ること。改修ドキュメントに検証結果（実行したコマンド、スクリーンショット）を書いて `status: done` にする。**ハーネス改善の提案**（6 章）も出す |

**途中で人間を止める条件**（moon-voice と同じ）:
- 仕様に関わる判断が分かれるとき
- 取り消せない操作をするとき（DB のスキーマ変更やデータの一括変更、デプロイ、メール送信、`reset --hard`、force push）
- 2〜3 回試しても解決しないとき

**規模の分け方**:
- **XS**（誤字、定数、コメントなど）: 改修ドキュメントは作らず、CHANGELOG にだけ書く。公開 API やビルドに触れるなら S 以上として扱う
- **S**: 改修ドキュメントは短くてよい。独立したレビューは 3b か 6 のどちらか 1 回でよい
- **M**: 全工程を通す。`spec-reviewer` を使い、TodoWrite で進捗を管理し、中断するときはチェックポイントを残す
- **L**: 全工程を通し、3b は観点を分けて複数回行う。複数の機能にまたがるときは `plan` スキルを使う

**スコープ外**: コミット（人間が行う）、リポジトリ全体の経年劣化への対応（CI と定期的な掃除に任せる）

### 3.3 パッケージごとの CLAUDE.md の固定の節

moon-voice の `apps/*/AGENTS.md` と同じく、スキルから節の名前で参照する。
- 開発コマンド
- ビルド・テスト・型チェックの鉄則
- 参照 grep の対象パス
- バグ調査の入口
- UI 変更の手順（web のみ。手本の画面、トークン、共通部品の置き場所、3 幅の確認）
- テスト方針
- ドキュメントの更新先（完了ゲートで 1 つずつ言い切る一覧）
- 取り消せない操作の例

### 3.4 Hooks

| Hook | タイミング | 内容 |
|---|---|---|
| `spec-gate` | PreToolUse（Edit/Write） | `packages/` 配下を編集するときに、`approved` か `in_progress` の改修ドキュメント、または `scope:` に編集先を含む計画書があるかを確認する。なければ**人に確認を求める**（理由と対処を表示。XS はその場で人が許可すれば通る） |
| `guard-bash` | PreToolUse（Bash） | settings.json の deny / ask を補う。秘密情報のファイルへの接触、`--no-verify`、force push を止め、人間の未ステージの差分を消す・隠す操作（`reset --hard`、`restore`、`clean`、`stash` など）と複合コマンドの中のステージに確認を求める |
| `format-on-edit` | PostToolUse | 編集したファイルに eslint --fix と prettier をかけ、直らなかったエラーを返す |
| `record-bash-changes` | Pre / PostToolUse（Bash） | Bash で変わったファイルを、実行の前後の比較で「このセッションで触ったファイル」に記録する |
| `verify-gate` | Stop | このセッションで触ったパッケージだけを対象に、型チェック、lint、関連する単体テストを実行する。Bash で変えたファイルも対象に含める（bridge-api の方式）。`stop_hook_active` を見て無限ループを防ぐ |

### 3.5 外部スキル（2026-10-10 に導入済み。`.claude/skills/` と `skills-lock.json`）

| 用途 | スキル |
|---|---|
| UI とデザイン | `anthropics/skills@frontend-design`、`vercel-labs/agent-skills@web-design-guidelines`、`shadcn-ui/ui@shadcn` |
| React | `vercel-labs/agent-skills@vercel-react-best-practices`、`vercel-labs/agent-skills@vercel-composition-patterns` |
| API と実行基盤 | `honojs/skills@hono`（検索で見つけた `yusukebe/hono-skill` はリポジトリにスキルがなかったため、Hono 公式のものに差し替え）、`cloudflare/skills@workers-best-practices`、`cloudflare/skills@wrangler` |
| DB | `supabase/agent-skills@supabase`、`supabase/agent-skills@supabase-postgres-best-practices` |
| テスト | `antfu/skills@vitest`、`currents-dev/playwright-best-practices-skill@playwright-best-practices` |
| リファクタ | `github/awesome-copilot@refactor`（moon-voice と同じもの） |

### 3.6 テンプレートの概要

**`spec.md`**（moon-voice の design doc テンプレートに仕様の要素を足したもの）
```
---
title / feature / status: current / updated / code: [path :: symbol] / related / symptoms
---
## TL;DR・改修前の必読
## 目的と利用者
## 振る舞いと受け入れ基準   … AC-<feature>-NN。テストからこの ID を参照する
## 画面と API              … ルート、エンドポイント、入出力の要点
## データ
## 設計不変条件            … INV-n。破ったときに何が起きるかも書く
## エラー時の挙動
## 既知の落とし穴
## ポストモーテム          … 日付、症状、真因、対策、再発時に確認すること
## テストとの対応          … AC からテストへの対応表と、手動で確認する項目
## 変更履歴                … バージョン、日付、改修ドキュメントへのリンク
```

**`changes/v<X.Y.Z>-<slug>.md`**
```
---
title / version / size: XS|S|M|L / status: draft|approved|in_progress|done
features: [主となる機能, 関連する機能…] / created / approved_at / completed_at
---
## 背景と目的
## 仕様の変更            … spec.md への差分と、追加・変更・削除する AC
## 影響範囲              … 参照箇所の grep 結果の要約、機能、API と shared のスキーマ、DB、画面、テスト、ドキュメント
## 実装計画              … 手本にする既存コード（file:line）、新規作成・変更するファイル、設計方針、代替案とトレードオフ
## UI 方針（UI の変更時） … 手本の画面、流用するコンポーネント、レスポンシブの方針
## テスト方針
## 対象外
## 工程チェックリスト     … 0〜8 の各工程。再開するときの目印にする
## 検証結果              … 完了時に記入（コマンドの結果、スクリーンショット、見送った minor の指摘）
```

## 4. フェーズと進捗

> 各フェーズの終わりに人間がレビューしてコミットする。チェックは AI が更新する。

### P0. 計画
- [x] 現状調査（リポジトリ、参考リポジトリ 3 つ、ハーネスエンジニアリングの文献）
- [x] 方針のヒアリング（第 1 回、第 2 回）
- [x] find-skills による候補の検索
- [x] この計画の承認（2026-10-10）

### P1. 指示系の一本化とドキュメントの移設
- [x] `@docs/` を `docs/` に移す（`git mv`）
- [x] `.kiro/steering/*` を `docs/steering/` に移し、中身を整理する（古い記述を直す。例: `effort_drafts` → `work_entry_drafts`、BalletProof の記述）
- [x] `ui-design.md` を新しく作る（手本の画面、トークン、共通部品の置き場所、ブレークポイント）
- [x] `steering` スキルを作る（`/kiro:steering` と `steering-custom` を日本語に訳し、principles とテンプレートも一緒に移す）
- [x] ルート、api、web の CLAUDE.md を作り、`AGENTS.md` をシンボリックリンクにする
- [x] `.claude/rules/` を作る
- [x] `.kiro/`、`.cursor/`、`.agent/`、`AI_AGENT_GUIDE.md` を削除する
- [x] テンプレート（spec、change、plan）、README の索引、`incidents.md`、`harness/improvements.md`、`CHANGELOG.md` を作る。あわせて `docs/README.md`、`docs/adr/README.md`、`docs/legacy/README.md`、`docs/testing/manual-checklist.md`、ルートとパッケージの README を更新
- [x] 外部スキルを導入する（3.5。承認を前倒しして 2026-10-10 に実施）
- [x] 外部スキルの中身を監査し、プロジェクトの方針と食い違う点を上書きするルールを書く（2026-10-10 に前倒しで実施。`docs/harness/third-party-skills.md`、`.claude/rules/third-party-skills.md`、`.claude/settings.json` の deny / ask）
- [x] 発動しやすすぎる外部スキルの調整（`skillOverrides` などを検討する）。`settings.json` の `skillOverrides` で 6 つを `name-only` にし、使う場面を各 rules に明記
- [x] 司令塔と工程スキル（`autonomous-impl` と `impl-*`）の最小限の版、`bug-reviewer`、`spec-reviewer` を作る。あわせて `plan`、`release`、`commit` スキルも作成（`spec-backfill` は P5 で作る）
- [x] ハーネスの自己点検スクリプトを作る（3.2 の改善点 5）。`scripts/harness-check.mjs`
- [ ] P1 のレビューとコミット（人間）

> P1 で確かめたこと / 持ち越したこと:
> - 工程スキル（`user-invocable: false`）はモデルのスキル一覧に出ており、司令塔から呼べる。`commit` / `release`（`disable-model-invocation: true`）はモデルの一覧に出ない。スラッシュメニューで隠れているかは人間が確認する
> - `/code-review` の CONFIRMED / PLAUSIBLE と effort の挙動は、P8 の試運転で実際の差分に回して確かめる
> - `settings.json` は今回のセッションの途中で作ったため、`/hooks` を開くかセッションを再起動して読み込み直す必要がある

### P2. 機械的強制の土台
- [x] ESLint 設定を flat config に一本化し、`.eslintrc.json` を削除する（整形は Prettier に分け、`eslint-plugin-prettier` は外した。`import/no-extraneous-dependencies` と `consistent-type-imports` を追加）
- [x] lint と format を一括で自動修正する（整形だけの独立したコミットにし、`.git-blame-ignore-revs` に登録する）。残りは手で直す（自動修正は 38115da。import 以外のコードが変わっていないことを構文解析で確かめた。手で直したのは全角空白 2 件、未使用の変数 1 件、フックの依存配列 10 件）
- [x] ルートの scripts を揃える: `typecheck` / `lint` / `format` / `test` / `harness:check` / `check`（`test:e2e` は Playwright を入れる P4 で足す）
- [x] 依存関係を整理する: `date-fns` のバージョン固定、ルートの不要な依存の削除、TypeScript のバージョン統一、`.env.example` への改名、`verbatimModuleSyntax` の有効化
  - [x] `date-fns` を `^4.1.0` に固定。ルートの依存を lint と整形の道具だけにし、宣言なしで使われていた `@supabase/supabase-js` / `dayjs` / `zod` を使うパッケージに宣言した。共通のバージョン（TypeScript 5.9、Vitest、zod、dayjs、supabase-js）は `pnpm-workspace.yaml` の catalog にまとめた。`packages/web/.env example` を `.env.example` に改名し、コードが使う項目に合わせた
  - [x] `verbatimModuleSyntax` を api と shared で有効にする（型の再 export 24 件に `type` を付けた）
- [x] hooks を実装する（spec-gate、guard-bash、format-on-edit、verify-gate、record-bash-changes）と `settings.json` の permissions。判定のロジックは `.claude/hooks/hooks.test.mjs` でテストし、`pnpm harness:check` で回す
- [x] GitHub Actions を作る（`.github/workflows/ci.yml`。lint、整形、型チェック、単体テスト、ハーネスの自己点検）
- [x] api の `vitest.config.ts` が `.dev.vars`（本番の接続情報）を読む問題を止める（読み込みを外した。テスト用 DB とつなぐのは P3 / P4）
- [x] 使っていない依存（`resend` など）を消す（api: `resend`、`@hono/zod-validator`、`ngrok`、`ts-node`、`dotenv`。web: `@hookform/resolvers`、`uuid`、`tailwindcss-animate`。ルート: `tsx` など）

### P3. スキーマ管理とテスト用 DB
- [x] 本番のスキーマを取り込む。`db pull` は本番の migration 履歴に書き込むおそれがあるため、読み取りのみの `supabase db dump --db-url`（Session pooler 経由）を人間が実行した。Supabase CLI はルートの devDependencies に入れ、`packages/api/supabase/config.toml` を作った
- [x] 取り込んだ結果と既存のマイグレーション、`db.ts` との差分を確認し、基準となるマイグレーションを決める（`20261013000000_baseline.sql`。本番の public スキーマに、avatars バケットと storage ポリシーを足した。手書きの `0000_initial_schema.sql` は RLS の有効化などが欠けていたので削除）
- [x] `db.ts` を作り直し、今の `db.ts` と差が無いことを確かめた。本番は別のアカウントにあるため、型の生成は本番と同じスキーマにした開発用から行う（`pnpm db:types`）
- [x] 基準のマイグレーションでマテリアライズドビューが未更新のまま作られる欠陥を、更新するマイグレーションの追加で直した（`20261013010000_populate_projects_with_tasks_mv.sql`。H-010）
- [ ] avatars の storage ポリシーを自分のフォルダ（`avatars/<user_id>/`）に絞る。今は、認証済みのユーザーなら他人の画像も上書き・削除できる。挙動が変わるので、改修の記録を通して行う
- [x] 開発用 Supabase との差分を確認し、必要なら適用する。⚠️ 実行前に確認を取る
  - [x] 差分の確認（開発用には、案件とタスクのマテリアライズドビュー、`access_logs.method` が無く、`goal_progress_histories.recorded_at` が日付型だった）
  - [x] 開発用の DB を基準のマイグレーションで作り直す（`supabase db reset --db-url`。人間が実行した）。作り直したあとの public / auth / storage の書き出しが、本番と一字一句同じになったことを確かめた（2026-10-13）
- [ ] テスト用の環境変数と GitHub Secrets の設計（設定は人間が行う）
- [ ] テストデータの方針: 実行ごとに一意なテストユーザーを作り、終わったら片付ける。CI とローカルが同時に走っても衝突しないようにする
- [ ] `docs/reference/database.md` を作る（D20）。`db.ts` を最新にしたあと、ER 図（Mermaid の `erDiagram`。ログ用のテーブルも含む）とテーブル・ビューの列をスクリプトで作る。テーブルの目的と担当する機能は手書きの欄に書く。生成し直した結果とのずれを自己点検と CI で検出する

### P4. テスト基盤
- [ ] api: Vitest と `app.request` で結合テストを書けるようにする（認証ヘルパー、データの用意と後片付け）
- [ ] マイグレーションの検査: ローカルの Supabase（Docker）にマイグレーションからまっさらな DB を作り、新規ユーザーで主な API（案件の一覧、工数の登録、目標、週報）を通すテストを CI で回す（H-010。基準のマイグレーションでマテリアライズドビューが未更新のまま作られ、案件の一覧が 500 になった）
- [ ] shared: 単体テスト
- [ ] web: Vitest、Testing Library、MSW
- [ ] E2E: Playwright（テストアカウント、主要な画面の通し動作、3 幅）
- [ ] Playwright MCP で開発サーバーの画面を確認する手順を `packages/web/CLAUDE.md` に書く（ログイン方法も含む）
- [ ] CI に単体・結合テストと E2E を追加する
- [ ] `docs/reference/api.md` を作る（D20）。テストの仕組みの中で API の OpenAPI 定義を取り出し、エンドポイントの一覧をスクリプトで作る。`describeRoute` が無いルートは一覧に出ないので、漏れを検出する。ずれは自己点検と CI で検出する
- [ ] `impl-docs`（工程 7）とパッケージの CLAUDE.md の「ドキュメントの更新先」に、「DB のスキーマか API を変えたら `docs/reference/` を作り直す」を加える

### P5. 仕様書への変換（機能ごと）
旧要件定義書、旧詳細設計書、**実際のコード**を照らし合わせて `spec-backfill` スキルで作る。食い違いがあるときはコードを正とし、気になる点は「要確認」として人間に聞く。各機能の `changes/` には、移行時点の基準となる `v1.0.7-baseline.md` を置き、それまでの経緯を git log から要約する。

| # | 機能（仮の ID） | spec | レビュー |
|---|---|---|---|
| 1 | auth（ログイン、新規登録、パスワード再設定、ログアウト、AuthGuard） | [ ] | [ ] |
| 2 | landing（未ログイン時のルーティングを含む） | [ ] | [ ] |
| 3 | app-shell（ヘッダー、モバイルの下部ナビ、PWA） | [ ] | [ ] |
| 4 | effort-entry（工数登録、undo/redo、完了メール） | [ ] | [ ] |
| 5 | effort-draft（下書きの同期と競合制御） | [ ] | [ ] |
| 6 | effort-ingest-gas（GAS / Google Form からのテキスト取り込み） | [ ] | [ ] |
| 7 | effort-list（工数一覧） | [ ] | [ ] |
| 8 | goals-current（現在の目標、重みの合計 100% ルール、前週の進捗） | [ ] | [ ] |
| 9 | goals-add（目標の追加） | [ ] | [ ] |
| 10 | goals-history（過去の目標） | [ ] | [ ] |
| 11 | missions | [ ] | [ ] |
| 12 | weekly-report（週報） | [ ] | [ ] |
| 13 | profile（アバター、アカウント削除） | [ ] | [ ] |
| 14 | user-settings（ユーザー設定） | [ ] | [ ] |
| 15 | platform（ログ、エラー処理、認証ミドルウェア、CORS、OpenAPI、メール送信） | [ ] | [ ] |

- [ ] 直近のバグ修正（例: a8a5c14 の下書き同期の競合）を、ポストモーテムと incidents.md に初期データとして登録する
- [ ] `spec-backfill` スキルを作る（変換の手順。旧ドキュメントとコードの照合、食い違いの扱い、baseline の記録）
- [ ] 各機能の `spec.md` の「画面と API」「データ」から、`docs/reference/` の該当箇所へリンクする（一覧を spec に重複して書かない）
- [ ] 全機能の変換が終わったら、旧 requirements、design、tasks（`docs/legacy/`）を削除し、`packages/*/README.md` の旧ドキュメントへの参照を `docs/specs/` に直す

### P6. 既存機能のテスト（仕様書の AC をテストにする）
- [ ] 機能ごとに AC からテストへの対応表を埋める（優先順: effort-ingest-gas → effort-draft → goals → weekly-report → その他）
- [ ] P2 で保留にしたフックの依存配列の 2 件を、テストを書いてから改修の記録を通して直す（コードに `TODO(P6)` の印）
  - `useEffortSummaryMetrics`: `projectOptions` の読み込みが終わっても案件名が更新されない可能性
  - `useEffortSubmission`: `cancelSync`（`useEffortDraftSync` で毎回作り直される）が依存に無い
- [ ] 主要な画面の E2E シナリオ

### P7. 構造の整理（テストを安全網にして行う）
- [ ] web の `services/` を `features/` に統合する
- [ ] 重複したファイルを解消し、ファイル名の付け方を統一する
- [ ] 層のルールを ESLint で強制する（エラーメッセージに直し方を書く）

### P8. ワークフローの仕上げと試運転
- [ ] `autonomous-impl` と `impl-*`、`plan`、`release`、`bug-reviewer`、`spec-reviewer` を仕上げる（P1〜P7 で実際に使ったことを反映する）
- [ ] 実際の小さな改修を 1 件、新しいフローで最後まで通す
- [ ] 振り返り（`harness/improvements.md` を見直す）をし、この計画を `completed/` に移す

> 補足: `autonomous-impl` と hooks は P1〜P2 の時点で最小限の版を作る。その後の作業で実際に使いながら鍛え、P8 で仕上げる。

## 5. リスクと注意点

- **テスト用 Supabase の共有**: 実行ごとに一意なユーザーを作り、終わったら片付けることで、データの衝突を防ぐ。
- **lint の一括修正で差分が大きくなる**: 整形だけの独立したコミットにし、`.git-blame-ignore-revs` に登録する。
- **spec-gate が厳しすぎると作業が止まる**: XS の例外と、承認済みの計画書による許可で対応する。誤検知は `harness/improvements.md` に記録して直す。
- **外部スキルの品質と安全性**: スキルの中身はそのままエージェントへの指示になる。導入する前に全文を読み、プロジェクトの規約と矛盾するものは採用しないか、上書きのルールを書く。
- **CLAUDE.md とルールが肥大化する**: 1 行ごとに「これを消したらミスが起きるか」を問う。繰り返し起きる違反は、文章を足すのではなく lint や hook に移す。

## 6. ハーネス改善のしくみ

- エージェントは、作業中に見つけた**ハーネスの不具合や穴**を `docs/harness/improvements.md` に記録し、完了報告で提案する。例: hook の誤検知や検出漏れ、足りないルールや手本、古くなった steering や仕様書、スキルの工程の穴、遅いテストや不安定なテスト。
- 提案には、**どこで直すか**を書く。
  - 事前に方向を示すもの: steering、rules、スキル、手本の追加
  - 事後に検出するもの: lint ルール、テスト、hook、CI
  - 決定的に判定できるものは、後者を優先する。
- **人間のレビューで出た指摘も同じ流れに乗せる**。指摘を受けたら、修正に加えて「どうすれば次回から構造的に防げるか」を提案する。
- 定期的に（例えば P8 以降は月 1 回）、steering とコードのずれ、使われていないコード、ルールの肥大化を掃除する。

## 7. 決定ログ

| 日付 | 決定 | 理由 |
|---|---|---|
| 2026-10-10 | D1〜D11 | 第 1 回のヒアリング |
| 2026-10-10 | D12〜D18、改修ドキュメントを `docs/specs/<feature>/changes/` に置くことに変更、steering は統合せずに移すことに変更 | 第 2 回のヒアリング。工程の順番を確実に守るため、moon-voice のスキルを土台にした |
| 2026-10-10 | D12 を「司令塔と工程スキル」の構成に変更 | ユーザーの提案。順番は司令塔、工程チェックリスト、hook の 3 段で守る。工程の詳細は必要なときだけ読み込む |
| 2026-10-10 | 外部スキル 13 個を導入（作業ブランチ `chore/harness-migration`） | ユーザーが導入を承認した |
| 2026-10-10 | 工程 6 は `/code-review` の effort と CONFIRMED / PLAUSIBLE で指摘を絞る。工程 7 の steering の更新は、`steering` スキルの差分モードで行う | ユーザーの指摘。確信度の扱いを bug-reviewer と揃え、steering の更新を提案だけで終わらせない |
| 2026-10-10 | 計画を承認。P1 に着手 | ユーザーの承認 |
| 2026-10-10 | 旧要件定義書・旧詳細設計書・旧タスクリストは、P5 で変換するまで `docs/legacy/specs/` に置く | 変換の元として必要。新しい `docs/specs/` と混ざらないように分けた |
| 2026-10-10 | steering の書き方の原則とテンプレートは、`docs/steering/` ではなく `steering` スキルの `references/` に置く | steering 自体には、エージェント用の道具の話を混ぜない（旧 kiro の原則と同じ） |
| 2026-10-10 | steering を整理する中で、コードとの食い違いを直した（成功レスポンスは共通の包み方が無い、下書きの競合は 200 + `applied: false`、テーブル名、メールは GAS 経由で `resend` は未使用、effort の service が user-settings の repository を直接呼んでいる） | コードを正とする方針。直すべきコードの問題は P2 / P7 に回した |
| 2026-10-10 | 外部スキルのうち 6 つを `skillOverrides` で `name-only` にし、使う場面を各 rules に書いた | 関係するファイルに触れるたびに読み込まれ、コンテキストを圧迫するのを防ぐ |
| 2026-10-10 | `/commit` 用の `commit` スキルを追加（旧 `.agent/workflows/commit.md` の移植） | ユーザーがコミットを頼むときの書式をそろえる |
| 2026-10-10 | P1 の成果物を、文脈を持たないサブエージェントでレビューし、20 件の指摘を反映（S の改修で省いた工程の印の付け方、hook ができるまでの spec-gate の扱いと XS の手順、計画書の `scope:`、bug-reviewer への差分の渡し方、S は 3b を省き 6 を必ず回す、`/code-review` の重要度は親が付ける、done からの再開、改修の記録の `released_in:`、settings.json の deny / ask の追加、steering の事実誤り） | 作る人と判定する人を分ける。自己点検スクリプトにも、チェックリストと工程スキルの一致、skillOverrides の確認を追加した |
| 2026-10-10 | D20: テーブル（ER 図つき）とエンドポイントの全体像を `docs/reference/` に置く。コードから自動で作り、ずれは CI で止める。database.md は P3、api.md は P4 で作る | ユーザーの要望（人間の開発者が全体を把握しやすい）。手書きの旧設計書（`docs/legacy/specs/design/05-api.md`、`09-database.md`）が古くなったのと同じことを、自動生成で防ぐ |
| 2026-10-10 | P2: 整形は Prettier だけが担い、ESLint では見ない（`eslint-plugin-prettier` を外した）。CI では `prettier --check` を回す | typescript-eslint の推奨。lint の出力が整形の指摘で埋もれず、速い |
| 2026-10-10 | P2: spec-gate は、根拠が無いとき止めずに人へ確認を求める。XS はその場で人が許可すれば通る | ユーザーの選択。XS のたびに改修の記録を作らずに済み、それでも人の目は必ず通る |
| 2026-10-10 | P2: react-hooks/exhaustive-deps の 12 件は、挙動が変わらないものだけ P2 で直し、挙動が変わりうるものは理由付きの eslint-disable にして P6 でテストを書いてから直す。ルールは error のまま | ユーザーの選択。テストが無いまま依存配列を変えると、再実行の増加などで挙動が変わる |
| 2026-10-10 | P2: 共通の依存のバージョンは pnpm の catalog でそろえる。各パッケージは自分の `package.json` に書いた依存だけを使う（`import/no-extraneous-dependencies`） | 依存の整理で、web と api がルートの依存を宣言なしで使っていたことが分かった。lint で再発を防ぐ |
| 2026-10-10 | P2: hook のセッション記録は `node_modules/.cache/claude-hooks/` に置く | `/tmp` は誰でも書き込める。bridge-api の方式（固定のパス）は保ちつつ、リポジトリの中に置く |
| 2026-10-13 | P2: フックの依存配列 12 件のうち 10 件は挙動を変えずに直した（useState の setter を足す、`?? []` を useMemo で包む、オブジェクトから値を取り出してから使う、早期 return で守られた effect に依存を足す）。2 件は理由と `TODO(P6)` を書いて lint の対象から外した。ルールは error に上げた | 決定どおり。直せないものは数を絞り、場所と理由を残した |
| 2026-10-13 | D6 を変更: 開発用 Supabase は削除せずに DB の中身だけ作り直す。Supabase Branching は使わない | ユーザーの判断。プロジェクトを作り直すと、認証の設定や URL・キーの差し替えが必要になる。Branching は有料で、データも複製されない |
| 2026-10-13 | P3: 本番のスキーマは `db pull` ではなく `db dump --db-url` で取り込む。接続文字列（パスワード）は人間がターミナルで扱う | `db pull` は本番の migration 履歴テーブルへの書き込みを求める。dump は読み取りのみ |
