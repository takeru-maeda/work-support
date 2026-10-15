---
title: 週報の出力
feature: weekly-report
status: current
updated: 2026-10-14
code:
  - packages/api/src/features/reports/index.ts :: reports
  - packages/api/src/features/reports/service.ts :: generateFormattedReport
  - packages/api/src/features/reports/service.ts :: getWeekRange
  - packages/api/src/features/reports/service.ts :: getStartOfWeekGoals
  - packages/api/src/features/reports/service.ts :: calculateGoalSummary
  - packages/api/src/features/reports/service.ts :: calculateExpectedProgress
  - packages/api/src/features/reports/service.ts :: formatWeeklyReport
  - packages/api/src/features/reports/service.ts :: formatDailyWorkStatus
  - packages/api/src/features/reports/service.ts :: formatProjectWorkStatus
  - packages/api/src/features/reports/service.ts :: getLearnStatusFormat
  - packages/api/src/features/reports/service.ts :: formatGoalStatus
  - packages/api/src/features/reports/service.ts :: getDiffFormat
  - packages/api/src/features/reports/service.ts :: getUpDownFormat
  - packages/api/src/features/reports/service.ts :: formatNumber
  - packages/api/src/features/reports/repository.ts :: getWorkRecordsForReport
  - packages/api/src/features/reports/repository.ts :: getGoalsForReport
  - packages/api/src/features/reports/repository.ts :: getGoalProgressHistories
  - packages/shared/src/schemas/reports.ts :: WeeklyReportQuerySchema
  - packages/shared/src/utils/goalProgress.ts :: calculateGoalSummaries
  - packages/web/src/pages/reports/WeeklyReportPage.tsx :: WeeklyReportPage
  - packages/web/src/features/reports/components/weekly-report/index.tsx :: WeeklyReport
  - packages/web/src/features/reports/components/weekly-report/WeeklyReportControls.tsx :: WeeklyReportControls
  - packages/web/src/features/reports/components/weekly-report/WeeklyReportPreview.tsx :: WeeklyReportPreview
  - packages/web/src/features/reports/api/weeklyReport.ts :: getWeeklyReport
  - packages/web/src/features/reports/hooks/useWeeklyReport.ts :: useWeeklyReport
  - packages/web/src/features/reports/api/weeklyReport.ts :: useWeeklyReportMutation
related: [goals, missions, effort-entry]
symptoms:
  - 週報の日別の時間が「3.3000000000000003h」のように長い小数になる
  - 週報の平均が日別の時間と合わない / 合計が日別の時間の合計より大きい
  - 過去の週の週報で、目標の進捗が今の値になっている
  - 週報の目標の差分や期待値がおかしい
  - 週報の「コピー」を押しても何も起きない
  - 日付を変えたのに、前の週の週報が表示されたまま
---

# 週報の出力

## TL;DR・改修前の必読

- 週報の画面（`/weekly-report`）で日付を選んで「出力」を押すと、その日を含む週の工数と目標の進捗から、週報の雛形のテキストを作って表示する。利用者はそれをコピーして、社内の週報に貼る
- 本文はサーバー（`GET /api/reports/weekly`）が組み立てる。節は「日別業務状況」「案件別業務状況」「学習状況(Udemy)」（中身は固定の空欄）「目標進捗状況」。**ミッションは本文に入らない**（同じ画面の上の編集欄は missions の仕様）
- ⚠️ 改修の前に [§設計不変条件](#設計不変条件) と [§既知の落とし穴](#既知の落とし穴) を読む。週の境目と進捗の履歴の使い方は、目標管理（goals）の前週からの差分とそろえる必要がある。日付の計算は実行環境のタイムゾーン（本番は UTC）に依存する

## 目的と利用者

- 目的: 毎週の週報の定型の部分（工数の集計、目標の進捗）を自動で組み立て、手で書く時間を減らす
- 利用者と使う場面: 週の終わりに週報を書くとき、その週の日付を選んで出力し、コピーして貼る。足りない部分（学習状況など）は貼ったあとに手で埋める

## 振る舞いと受け入れ基準

### API（`GET /api/reports/weekly`、JWT）

- **AC-weekly-report-01**: `?date=YYYY-MM-DD` を受け取り、`200 { weeklyReport: <テキスト> }` を返す。`date` が無い・形が違えば 400、トークンが無ければ 401。読むのはトークンのユーザーの工数と目標だけ（ほかのユーザーのものは混ざらない）
- **AC-weekly-report-02**: 対象の週は、`date` を含む週の月曜〜日曜（日曜を選ぶと、その日で終わる週）。日付の計算は実行環境のタイムゾーンで行う（本番の Workers は UTC）
- **AC-weekly-report-03**: 本文は、次の節をこの順に、2 行の空行をはさんで並べる。「`<日別業務状況>`」「`<案件別業務状況>`」（その週に工数が無ければ節ごと省く）「`<学習状況(Udemy)>`」「`<目標進捗状況>`」。各節は末尾の空白を除く。工数も目標も無い週は、次の全文になる（例: `date=2026-10-14`）

  ```
  <日別業務状況>
  10/12(月)：在宅 0h
  10/13(火)：在宅 0h
  10/14(水)：在宅 0h
  10/15(木)：在宅 0h
  10/16(金)：在宅 0h
  平均：0h/日
  合計：0h


  <学習状況(Udemy)>
  ■
  >進捗率：% (+%)


  <目標進捗状況>
  検討中
  ```

- **AC-weekly-report-04**: 日別業務状況は、月〜金の 5 行を「`MM/DD(曜)：在宅 {時間}h`」で出す（「在宅」は固定の文字。工数が無い日は `0h`）。日ごとの時間は丸めずにそのまま足した値を出す。続けて「`平均：{x}h/日`」と「`合計：{x}h`」を出す。合計は**土日を含む**週全体の時間、平均は合計を「月〜金のうち時間が 0 より大きい日の数」で割った値（その日数が 0 なら 0）。平均と合計は `toFixed(1)` で小数第 1 位にし（2 進数で表せない値は四捨五入と向きが変わることがある。例: 1.45 → 1.4）、整数なら小数点を付けない
- **AC-weekly-report-05**: 案件別業務状況は、案件ごとに「`■{案件名}（合計：{時間}h）`」、その下にタスクごとに「`>・{タスク名}：{時間}h`」を出す。時間は土日を含む週全体の合計で、小数第 2 位までに丸める（末尾の 0 は付けない）。案件は案件の ID の降順、タスクはタスクの ID の降順（つまり新しく作ったものが上）。案件と案件の間は 1 行空ける
- **AC-weekly-report-06**: 学習状況は、中身の無い固定の 3 行（「`<学習状況(Udemy)>`」「`■`」「`>進捗率：% (+%)`」）を出す
- **AC-weekly-report-07**: 目標進捗状況の対象は、期間がその週（月曜〜日曜）と重なる目標すべて（`start_date <= 日曜` かつ `end_date >= 月曜`）。対象が無いか、重みの合計が 0 なら、見出しの下に「`検討中`」だけを出す
- **AC-weekly-report-08**: 対象があれば、「`=============================`」で挟んで全体の 4 行を出す。「`全体`」（単純平均が 100 なら「`全体【達成】`」）、「`>進捗率：{単純平均}%{差分}`」、「`>加重達成率：{加重平均}%{差分}`」、「`>期待値：{期待値}%({↑|↓|→}{差の絶対値}%)`」。続けて空行のあと、目標ごとに重みの降順で「`■{目標名}[{重み}]`」「`>進捗率：{進捗率}%{差分}`」（進捗率が 100 なら末尾に「`【達成】`」）を出す。目標と目標の間は 1 行空ける。単純平均と加重平均は `calculateGoalSummaries`（`toFixed(1)` で小数第 1 位）。「全体【達成】」は丸めたあとの単純平均が 100 のとき（99.95 以上なら、100% でない目標があってもなりうる）。**目標ごとの進捗率と重みは丸めずに出す**（DB は小数第 2 位まで。例: `[33.33]`、`33.33%`）
- **AC-weekly-report-09**: 差分は、0 より大きいときだけ「`(+{x}%)`」を付け、0 以下なら何も付けない。目標ごとの差分は「今の進捗率 − 週の始まりの進捗率」。週の始まりの進捗率は、月曜 0:00（実行環境のタイムゾーン）より前のいちばん新しい履歴の値で、履歴が無ければ 0。全体の差分は、今の値で出した平均から、週の始まりの値で出した平均を引いたもの（どちらも小数第 1 位に丸めた値どうしの差）。週の始まりの平均にも**今の重み**を使う
- **AC-weekly-report-10**: 期待値は、対象の目標の**どれか 1 つ**（DB が最初に返したもの）の期間から、次の式で出す（日付と時刻は実行環境のタイムゾーン）
  - 全期間の日数 = 終了日 − 開始日（終了日を含まない差。1 未満なら 1）
  - 経過日数 = 開始日の 0:00 から**リクエストの時点**までの日数（日単位に切り捨て。0 未満なら 0）
  - 期待値 = 経過日数 ÷ 全期間の日数 × 100（100 で頭打ち）を `toFixed(1)` で小数第 1 位にしたもの。例: 期間 2026-01-01〜2026-01-31、リクエストが 2026-01-16 12:00 → 15 ÷ 30 × 100 = 50.0
  - 矢印と差は「丸めた加重平均 − 丸める前の期待値」を小数第 1 位に丸めた値で決める。正なら `↑`、負なら `↓`（差は絶対値で出す）、0 なら `(→0%)`。表示どうしの差と 0.1 ずれることがある

### 画面（`/weekly-report` の「週報出力」）

- **AC-weekly-report-11**: 日付の選択は、最初は端末の今日。選んだ日を含む週を「`yyyy/MM/dd - yyyy/MM/dd`」（月曜〜日曜）で表示する。日付を選んでも、出力はしない
- **AC-weekly-report-12**: 「出力」を押すと、選んだ日付（端末のタイムゾーンの日付）で `GET /api/reports/weekly` を呼ぶ。待っている間はボタンが「出力中...」で押せない。成功したら本文を等幅の枠に表示する（前の表示を置き換える）。失敗したら表示中の本文を消し、「週報の取得に失敗しました: {エラーの文}」を出し（例: 500 なら「週報の取得に失敗しました: Request failed with status code 500」）、`error_logs` に送る（トーストは出さない）
- **AC-weekly-report-13**: 「コピー」を押すと、本文をクリップボードに入れ、ボタンを 2 秒間「コピー済み」にする。クリップボードに入れられなかったときは、利用者には何も知らせない（`error_logs` に送る）

## 画面と API

### 画面
- ルート: `/weekly-report`（`packages/web/src/config/routes.ts`。ナビゲーションの「週報出力」）。ページの見出しは「週報出力」「ミッションの更新と週報の出力」
- 画面の上はミッションの編集（missions の仕様）、下が週報の出力（この仕様）。主な操作は、日付の選択、「出力」、「コピー」

### API
| メソッドとパス | 認証 | 入力 | 出力 | 主なエラー |
| --- | --- | --- | --- | --- |
| `GET /api/reports/weekly` | JWT | `WeeklyReportQuerySchema` | `WeeklyReportResponseSchema` | 400、401、500 |

スキーマは `packages/shared/src/schemas/reports.ts`。同じフォルダの `GET /api/reports/work-records` は工数一覧（effort-list）の仕様。全エンドポイントは [docs/reference/api.md](../../reference/api.md)。

## データ

- [work_records](../../reference/database.md#work_records): `work_date`（date）が対象の週の月曜〜日曜の行。案件名とタスク名は `projects` / `tasks` から取る
- [goals](../../reference/database.md#goals): 期間が対象の週と重なる行
- [goal_progress_histories](../../reference/database.md#goal_progress_histories): 週の始まりの進捗率を出すのに使う（履歴の書き方は goals の仕様）
- 画面の状態: 本文は画面の中だけに持つ（ほかの画面に移ると消える）。SWR は `useSWRMutation`（キー `weekly-report_<ユーザー ID>`）で、自動では取り直さない

## 設計不変条件

- **INV-1**: 週の境目は、目標管理の「前週からの差分」と同じ時点にする（今はどちらも実行環境のタイムゾーンの月曜 0:00。本番は UTC）。破ると、目標の画面と週報で「今週の伸び」が食い違う。直すときは goals と同じ改修で変える（[goals の仕様](../goals/spec.md)）
- **INV-2**: 目標の差分は、goals の進捗の履歴（`goal_progress_histories`）だけから出す。履歴は、進捗率を変える更新のたびに goals の API が残す（goals の INV-2）。破ると（履歴を残さずに進捗率を変える経路ができると）、差分が黙って誤る。今も、goals の `PUT` は目標の更新と履歴の追加が別々なので、履歴の追加だけが失敗するとこの状態になる（goals の既知の落とし穴）
- **INV-3**: 工数と目標はトークンのユーザーの `user_id` で絞る。進捗の履歴は `user_id` で絞らず、ユーザーで絞った目標の ID で絞る（「すべてのクエリに `user_id`」の規約の例外。goals 側は `goals!inner(user_id)` で絞っており、守り方がそろっていない）。この順番を崩すと、他人の履歴を読む
- **INV-4**: 本文の書式（見出し、行の形、記号）は、利用者がそのまま社内の週報に貼る前提のもの。変えると利用者の手直しが増える。変えるときは改修の記録で明示し、人間に確かめる

## エラー時の挙動

- 入力の検証の失敗は 400（`{ data, error: [...], success: false }` の形。`globalErrorHandler` の形ではない）。DB の失敗は 500（`{ error, accessLogId }`）
- 画面: 「週報の取得に失敗しました: 」のあとに、axios や検証のエラーの文（英語のことが多い）をそのまま出す

## 既知の落とし穴

- **土日の工数**: 合計・平均・案件別には土日の時間が入るが、日別の行は月〜金だけ。平均は「月〜金の働いた日数」で割るので、土日に働くと平均が大きくなる（月曜 1 時間、土日 30 時間で「平均：31h/日」。ローカルの Supabase で確かめた）。旧ドキュメントの対象は月〜金だけ。土日に工数がある日は日別の行にも出し、平均の分母にも数えるように、P6 以降に直す予定（[v1.0.7-baseline](changes/v1.0.7-baseline.md) の人間の判断 1）
- **日別の時間の小数**: 丸めずに足すので、1.1 と 2.2 の日は「`3.3000000000000003h`」になる（確かめた）。P6 で直す予定（人間の判断 4）
- **実行環境のタイムゾーン**: 週の計算は `setHours` / `getDay` を使うので、実行環境のタイムゾーンで結果が変わる。本番（UTC）では月曜〜日曜だが、日本時間で動かすと DB の絞り込みが「前の週の日曜〜その週の土曜」になる。前の週の日曜の工数がその週に入り、その週の日曜の工数は翌週の週報に回る（テストの環境で確かめた）。テストは `TZ=UTC` に固定して書く
- **履歴の無い目標の差分は今の進捗率まるごと**: 週の始まりより前の履歴が無い目標は、週の始まりを 0 とするので、差分が今の進捗率になる。目標の画面の前週からの差分は、同じ場合に今の進捗率で代用する（差分 0）ので、**今は画面と週報で食い違う**（goals を 0 にそろえる予定。goals の人間の判断 2）。履歴の仕組みより前に進捗を入れた古い目標は、週報の差分が大きく出る
- **週の途中の重みの変更がさかのぼって効く**: 重みには履歴が無いので、週の始まりの加重平均にも今の重みを使う。週の途中で重みを変えると、全体の加重達成率の差分が変わる
- **週の境目が UTC**: 週の始まりの進捗率の締め切りは UTC の月曜 0:00（日本時間の月曜 9:00）。日本時間の月曜 0:00〜9:00 の更新は「週の始まりより前」になる。goals と同じ改修で日本時間に直す予定
- **過去の週の目標の値が今の値**: 目標ごとの進捗率と全体の平均は、対象の週の終わりの値ではなく、**今の値**を使う。過去の週を出力すると、目標の進捗と差分がその週の実際と違う。週報はその週に出すものとして、これは仕様とする（人間の判断 2）
- **期待値**: 対象の目標のうちどれか 1 つの期間だけで計算し、対象の週ではなく**リクエストの時点**までの日数を使う。旧ドキュメントは「目標ごとの期待値の加重平均」。過去の週を出しても、期待値は今日の値になる（人間の判断 2 で、仕様とする）
- **2 つの期間にまたがる週**: 期間の切り替わりの週は、前後の期間の目標がまとめて対象になり、重みの合計が 100 を超え、平均も混ざる
- **減った差分は出ない**: 進捗率が下がっても差分を付けない（「`(-x%)`」は出ない）
- **進捗の履歴を件数の上限なしで取っている**: 対象の目標の、週の終わりまでの履歴を新しい順にすべて取る。PostgREST の `max_rows`（ローカルの設定は 1000）を超えると古い履歴から切り捨てられ、週の始まりより前の履歴が落ちると、週の始まりの値が 0 になり差分が大きく出る。goals と同じく P6 で直す予定
- **目標の並び**: 重みが同じ目標の順番は決まらない（DB の返す順）。期待値に使う目標も決まらない
- **学習状況は固定の空欄**: 中身はコードに書いた固定の文字。貼ったあとに利用者が手で書く前提（人間の判断 3。ミッションも本文に入れない）
- **画面: 日付を変えても前の本文が残る**: 日付を変えたあと「出力」を押すまで、前の週の本文が新しい週の表示の下に残る。コピーすると前の週の本文が入る
- **画面: コピーの失敗を知らせない**: HTTPS でない、権限が無いなどでコピーできなくても、ボタンは変わらず、何も表示しない
- **旧ドキュメントとの書式の違い**: 旧ドキュメントの例にある、全体の進捗率の「`[285.2/300]`」、加重達成率の「`[59.6,20,10]`」、「メイン / サブ①」の見出しは出ない（目標名に書けば出る）。期待値の前の空白も無い

## ポストモーテム

該当なし（git の履歴に、週報の不具合の修正は無い）。

## テストとの対応

| AC | テスト | 種類 |
| --- | --- | --- |
| AC-weekly-report-01〜10、INV-3 | `packages/api/test/weekly-report.int.test.ts`（本番と同じ UTC で回す。期待値はリクエストの時点で変わるので、目標の期間を今日からの相対で作る） | 結合 |
| AC-weekly-report-08（平均の計算） | `packages/shared/src/utils/goalProgress.test.ts` | 単体 |
| AC-weekly-report-11〜13 | `packages/web/src/features/reports/components/weekly-report/WeeklyReport.test.tsx`（端末の今日は Date だけを偽にして固定する） | 部品 |

既知の落とし穴のうち、今の振る舞いをテストで固めたもの（P6 で直すときにテストを書き換える）: 土日の工数を合計にだけ含め日別に出さない、日別の時間を丸めない（AC-04）、履歴の無い目標の週の始まりを 0 にする（AC-09）。INV-1（週の境目を goals とそろえる）は、日本時間に直す改修で両方のテストを書き換える。

## 変更履歴

| バージョン | 日付 | 内容 | 改修の記録 |
| --- | --- | --- | --- |
| v1.0.7 | 2026-10-14 | 移行時点の基準 | [v1.0.7-baseline](changes/v1.0.7-baseline.md) |
