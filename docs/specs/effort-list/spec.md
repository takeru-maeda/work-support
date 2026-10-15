---
title: 工数一覧（絞り込み、並べ替え、ページ送り、集計）
feature: effort-list
status: current
updated: 2026-10-15
code:
  - packages/api/src/features/reports/index.ts :: reports
  - packages/api/src/features/reports/service.ts :: getWorkRecordListService
  - packages/api/src/features/reports/repository.ts :: getWorkRecordList
  - packages/api/src/features/reports/repository.ts :: WORK_RECORD_SORT_MAP
  - packages/shared/src/schemas/workRecords.ts :: WorkRecordListQuerySchema
  - packages/shared/src/schemas/workRecords.ts :: WorkRecordListResponseSchema
  - packages/web/src/pages/efforts/EffortsPage.tsx :: EffortsPage
  - packages/web/src/features/effort-list/hooks/useEffortList.ts :: useEffortList
  - packages/web/src/features/effort-list/hooks/useEffortList.ts :: mapSortToApi
  - packages/web/src/features/effort-list/hooks/modules/useEffortListFilters.ts :: useEffortListFilters
  - packages/web/src/features/effort-list/hooks/modules/useEffortListProjects.ts :: useEffortListProjects
  - packages/web/src/features/effort-list/hooks/modules/useEffortListData.ts :: useEffortListData
  - packages/web/src/features/effort-list/components/list/EffortsTableContainer.tsx :: EffortsTableContainer
  - packages/web/src/components/table-footer/TableFooter.tsx :: TableFooter
  - packages/web/src/components/filter/FilterAccordion.tsx :: FilterAccordion
  - packages/web/src/features/effort-list/components/list/EffortsFilterPanel.tsx :: EffortsFilterPanel
  - packages/web/src/features/effort-list/components/list/CommandFilterSelect.tsx :: CommandFilterSelect
  - packages/web/src/features/effort-list/components/list/EffortsTable.tsx :: EffortsTable
  - packages/web/src/features/effort-list/components/list/EffortsSummary.tsx :: EffortsSummary
  - packages/web/src/features/effort-list/storageKeys.ts :: getEffortListFilterStorageKey
  - packages/web/src/features/effort-list/api/workRecords.ts :: useWorkRecords
related: [effort-entry, effort-ingest-gas]
symptoms:
  - 工数一覧の集計が、絞り込んだ全体の合計と合わない
  - 工数一覧のページを送ると、同じ行が 2 回出る / 出ない行がある
  - 工数一覧で「工数データの取得に失敗しました」が出る / 何度も出る
  - 工数を登録しているのに「工数データがまだ登録されていません」と出る
  - 工数一覧の画面が真っ白になる
  - 案件を変えて絞り込むと、何も出てこない
---

# 工数一覧（絞り込み、並べ替え、ページ送り、集計）

## TL;DR・改修前の必読

- 工数一覧（`/efforts`）で、登録した工数を 1 タスク 1 行で一覧し、期間・案件・タスクで絞り込み、列で並べ替え、ページを送る。下に見積・実績・差分の合計を出す
- 一覧はサーバー（`GET /api/reports/work-records`）がビュー `work_record_diffs` から返す。**画面の「集計」は、表示中のページの行だけの合計**（絞り込んだ全体の合計ではない）
- ⚠️ 改修の前に [§既知の落とし穴](#既知の落とし穴) を読む。並べ替えの同じ値の行の順番が決まらず、ページ送りで重複や抜けが起きうる

## 目的と利用者

- 目的: 登録した工数を見返し、期間や案件ごとの見積と実績の差を確かめる
- 利用者と使う場面: 月末や週末に、期間を決めて案件ごとの工数を確かめる。登録の誤りを探す

## 振る舞いと受け入れ基準

### API（`GET /api/reports/work-records`、JWT）

- **AC-effort-list-01**: クエリは `startDate` / `endDate`（`YYYY-MM-DD`、どちらも省略可）、`projectId` / `taskId`（整数、省略可）、`sort`（既定 `-date`）、`page`（1 以上、既定 1）、`pageSize`（1〜500、既定 20）。形が違う、または開始日が終了日より後なら 400（`{ data, error: [...], success: false }`。開始日と終了日が同じなら通る）。トークンが無ければ 401
- **AC-effort-list-02**: そのユーザーの工数のうち、`work_date` が開始日以上・終了日以下（両端を含む）、案件 ID とタスク ID が一致するもの（指定したものだけ。`0` と空文字は指定なしと同じ。負の数は通り、0 件になる）を返す。タスクが案件に属していなければ 0 件。`page` に上限は無い
- **AC-effort-list-03**: 応答は `200 { items: [{ id, date, project, project_id, task, task_id, estimated_hours, hours, diff }], meta: { page, pageSize, total, totalPages } }`。`diff` は「実績 − 見積」で、見積が無ければ null。`total` は絞り込んだ全体の件数、`totalPages` は `total` が 0 なら 0、それ以外は `ceil(total ÷ pageSize)`。合計（集計）は返さない
- **AC-effort-list-04**: 並べ替えは `date` / `project` / `task` / `estimated_hours` / `hours` / `diff`（先頭に `-` で降順）。`project` は案件名 → タスク名（昇順）→ 日付（昇順）、`task` はタスク名 → 案件名（昇順）→ 日付（昇順）の順で並べる。それ以外は 1 つの列だけで並べる（同じ値の行の順番は決まらない）。null（見積、差分）は昇順で最後、降順で最初

### 画面（`/efforts`）

- **AC-effort-list-05**: 画面は「絞り込み条件」（最初は閉じている）、表とページ送り、集計の順。初めて開いたときは、期間・案件・タスクの指定なし、日付の降順、1 ページ 10 件
- **AC-effort-list-06**: 絞り込みは「開始日」「終了日」「案件を選択」「タスクを選択」（どちらも先頭に「すべて」がある）。案件とタスクの欄は検索でき、検索の文字に一致する項目が 1 つも無い（「すべて」も含めて）ときだけ、読み込み中なら「読み込み中です...」、そうでなければ「候補が見つかりません」を出す。タスクの候補は、案件を選んでいればその案件のタスク、選んでいなければ全案件のタスク（案件名は付かない）
- **AC-effort-list-13**: 「絞り込み」で、入力中の条件を反映して 1 ページ目に戻る（開始日が終了日より後なら入れ替えて送る）。「クリア」で条件・並べ替え・件数を初めの状態に戻す
- **AC-effort-list-07**: 表の列は「日付」「案件」「タスク」「見積(h)」「実績(h)」「差分(h)」。日付は `yyyy/MM/dd`、時間は小数第 2 位（`2.00`）、見積が無ければ「-」。差分は正なら「+」付きの赤、負なら緑、0 は色なし、見積が無ければ「-」
- **AC-effort-list-08**: どの列の見出しも押して並べ替えられる。押すたびに、昇順 → 降順 → 並べ替えなし（サーバーの既定の日付の降順。どの列も昇降の矢印ではなく中立の印になる）の順に変わり、1 ページ目に戻る。初めの状態（日付の降順）で「日付」を押すと、「並べ替えなし」になる
- **AC-effort-list-09**: 下のページ送りに件数（「{n}件」）を出し、1 ページの件数を 10 / 20 / 50 / 100 / 200 / 500 から選べる（変えると 1 ページ目に戻る）。今のページが全ページ数より大きくなったら、最後のページに寄せる。0 件のときは、ページ送りも件数の欄も出さない
- **AC-effort-list-10**: 集計は「見積合計」「実績合計」「差分合計」を、**表示中のページの行だけ**から出す。実績は全行の合計、見積は見積のある行の合計、差分は「見積のある行の実績の合計 − 見積の合計」。見積のある行が無ければ見積と差分は「-」。差分は正なら「+」付きの赤、負なら緑。時間は整数なら小数なし、小数第 1 位までならその桁、それ以外は小数第 2 位で、末尾に「h」。行が無ければ集計を出さない
- **AC-effort-list-11**: まだ取ったことの無い条件・ページを読み込む間は、表とページ送りの代わりに表の形の読み込み中の表示を出す（取ったことのある条件は、前の結果をすぐ出して裏で取り直す）
- **AC-effort-list-14**: 行が無ければ、絞り込みの条件があるとき「条件に一致する工数データは見つかりませんでした」「条件を変更して再度お試しください。」、無いとき「工数データがまだ登録されていません」「工数登録画面から工数を追加してください。」。取得に失敗したら「工数データの取得に失敗しました」のトーストと `error_logs`（前の結果があればそれを出したまま、無ければ上の 0 件の表示）。候補の取得に失敗したら「案件の取得に失敗しました」
- **AC-effort-list-12**: 適用した条件（開始日、終了日、案件、タスク）、並べ替え、1 ページの件数は、変わるたびに localStorage（キー `efforts:list:filters_<ユーザー ID>`）に保存し、次に開いたときに戻してから最初の取得をする。ページ番号は保存しない。「並べ替えなし」は保存されるが、戻すと日付の降順になる。壊れた JSON は無視する

## 画面と API

### 画面
- ルート: `/efforts`（ナビゲーションの「工数一覧」）。ページの見出しは「工数一覧」「登録された工数データの確認と検索」
- 主な操作: 絞り込み（「絞り込み」「クリア」）、列の見出しでの並べ替え、ページ送りと件数の切り替え

### API
| メソッドとパス | 認証 | 入力 | 出力 | 主なエラー |
| --- | --- | --- | --- | --- |
| `GET /api/reports/work-records` | JWT | `WorkRecordListQuerySchema` | `WorkRecordListResponseSchema` | 400、401、500 |

スキーマは `packages/shared/src/schemas/workRecords.ts`。案件とタスクの候補（`GET /api/projects`）は effort-entry の仕様。同じフォルダの `GET /api/reports/weekly` は weekly-report の仕様。全エンドポイントは [docs/reference/api.md](../../reference/api.md)。

## データ

- [work_record_diffs](../../reference/database.md#work_record_diffs): `work_records` に `tasks` と `projects` を内部結合し、案件名・タスク名と差分（見積が無ければ null）を付けたビュー（`security_invoker`）。`user_id` で絞る
- [work_records](../../reference/database.md#work_records): `(user_id, work_date)` の索引で期間の絞り込みを速くする
- 画面: 条件は localStorage（`efforts:list:filters_<ユーザー ID>`）。一覧は SWR（`keepPreviousData` で、条件を変えている間も前の行のデータを持ち続ける。表はキャッシュの無い条件では読み込み中の表示になるが、集計はその前の行から出る）

## 設計不変条件

- **INV-1**: 一覧の問い合わせは、トークンのユーザーの `user_id` で絞る（service role で接続しているので RLS に守られない。ビューの `security_invoker` も効かない）。破ると、他人の工数が見える
- **INV-2**: 一覧は必ずページに分けて取る（`range`）。破ると、件数が多いユーザーで PostgREST の `max_rows`（1000）で黙って切り捨てられる

## エラー時の挙動

- 入力の検証の失敗は 400（`{ data, error: [...], success: false }`）、DB の失敗は 500（`{ error, accessLogId }`）
- 画面は、どの失敗も「工数データの取得に失敗しました」のトーストだけ。前の結果があればそれを出したまま、無ければ 0 件の表示（絞り込みが無ければ「工数データがまだ登録されていません」）になる。SWR の既定の再試行で失敗が続くと、トーストと `error_logs` の記録が繰り返される（コードから。未確認）

## 既知の落とし穴

- **集計は表示中のページだけ**: 「見積合計」「実績合計」「差分合計」は、絞り込んだ全体ではなく、表示中のページの行の合計。1 ページの件数を変えると数字が変わる。旧ドキュメントの API は `aggregations` を返すとしていたが、実装されていない。P6 以降に、API で絞り込んだ全体の合計を返し、画面はそれを出すように直す予定（[v1.0.7-baseline](changes/v1.0.7-baseline.md) の人間の判断 1）
- **ページ送りで重複や抜けが起きうる**: `date`（既定）、`estimated_hours`、`hours`、`diff` の並べ替えは 1 つの列だけで、同じ値の行の順番が決まらない。同じ日の行は多いので、既定の並びでも起きうる。`project` / `task` の並びも最後に ID で決めていない
- **最後のページより先は 500**: PostgREST が 416 を返し、500 になる（ローカルの Supabase で確かめた）。画面はふつうページ数に寄せるが、別の画面で工数が減ったあとなどに起きうる。失敗すると前のページ数が残り、寄せられないまま失敗が続くことがある
- **案件を変えてもタスクの選択が残る**: 絞り込みで案件を変えても、前に選んだタスクが残る。欄は「タスクを選択」に戻って見えるが、「絞り込み」で送られ、0 件になる
- **案件を選ばないときのタスクの候補**: 全案件のタスクを案件名なしで並べるので、別の案件の同じ名前のタスクを見分けられない
- **保存した条件を確かめない**: localStorage の件数の値が壊れている（501 以上、数値でない）と、取得の前の検証で毎回失敗し、「クリア」するまでトーストが出続ける。並べ替えの値が壊れていても失敗はせず、知らない列は日付の降順、知らない向きは昇順として送る。日付の文字列が日付として読めないと、描画中の整形で例外になり、画面全体が落ちる（エラーの境界が無いため。コードから。未確認）。「クリア」で消したあと、条件のどれかが変わると初めの状態がすぐ保存し直される
- **読み込み中も、集計だけは前の条件の数字が出る**: キャッシュの無い条件・ページに変えると、表は読み込み中の表示になるが、集計は前の条件・前のページの行の合計を出したまま
- **最初の取得に失敗すると「まだ登録されていません」**: 前の結果が無いときに失敗すると、絞り込みが無ければ「工数データがまだ登録されていません」が出て、登録があるのに 0 件に見える
- **集計の小数の誤差**: 集計は浮動小数のまま足すので、見積 0.1 と 0.2・実績 0.3 と 0 のような組み合わせで、差分合計が「-0.00h」（緑）、0.1 + 0.2 が「0.30h」になる
- **時間の小数の桁が表と集計で違う**: 表は常に小数第 2 位（`2.00`）、集計は末尾の 0 を付けない（`2h`）
- **ブラウザの時差**: 保存した日付と表の日付を `new Date("YYYY-MM-DD")` で UTC の 0 時として読む。日本時間では問題ないが、UTC より西の時差の端末では表の日付が 1 日前に出て、保存した日付が開くたびに 1 日ずれる
- **候補の件数の上限**: 案件とタスクの候補は件数の上限なしで取るので、案件 × タスクが 1000 を超えると古い案件・タスクが候補から黙って落ちる（effort-entry の候補と同じ）

## ポストモーテム

該当なし（git の履歴に、工数一覧の不具合の修正は無い。`85485df` の「工数一覧の集計修正」は、絞り込みを 1 日から期間に変えた機能の変更）。

## テストとの対応

| AC | テスト | 種類 |
| --- | --- | --- |
| AC-effort-list-01〜04、INV-1、INV-2（API） | `packages/api/test/work-records.int.test.ts` | 結合 |
| AC-effort-list-01（入力の検証） | `packages/shared/src/schemas/workRecords.test.ts`（既定値、ID の数値への変換、開始日と終了日の前後、`pageSize` の上限） | 単体 |
| AC-effort-list-05〜14 | `packages/web/src/pages/efforts/EffortsPage.test.tsx` | 部品 |
| AC-effort-list-07 | `packages/e2e/tests/effort.spec.ts`（登録した工数が一覧に `2.00` / `1.50` で出ること） | E2E |

既知の落とし穴のうち、今の振る舞いをテストで固めたもの（P6 で直すときにテストを書き換える）: 集計を表示中のページの行だけから出す（AC-10）、並べ替えの同じ値の行の順番（AC-04 は値の重ならないデータで確かめている）。キャッシュの無い条件に変えたときに集計が前の値で出ること、最初の取得の失敗で「まだ登録されていません」が出ることは、直す改修で先に落ちるテストを書く。

## 変更履歴

| バージョン | 日付 | 内容 | 改修の記録 |
| --- | --- | --- | --- |
| v1.0.7 | 2026-10-15 | 移行時点の基準 | [v1.0.7-baseline](changes/v1.0.7-baseline.md) |
