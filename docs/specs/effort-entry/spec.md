---
title: 工数登録（Web の入力、案件とタスクの候補、undo / redo、完了メール）
feature: effort-entry
status: current
updated: 2026-10-15
code:
  - packages/api/src/features/effort/index.ts :: appEffort
  - packages/api/src/features/effort/service.ts :: saveStructuredEffortEntries
  - packages/api/src/features/effort/service.ts :: resolveProject
  - packages/api/src/features/effort/service.ts :: resolveTask
  - packages/api/src/features/effort/service.ts :: buildEffortCompletionEmail
  - packages/api/src/features/effort/service.ts :: sendEffortCompletionEmailIfNeeded
  - packages/api/src/features/effort/repository.ts :: insertWorkRecord
  - packages/api/src/features/effort/repository.ts :: refreshProjectsWithTasksView
  - packages/api/src/lib/mailer.ts :: sendEffortCompletionEmail
  - packages/api/src/features/projects/service.ts :: getProjectsWithTasks
  - packages/api/src/features/projects/repository.ts :: fetchProjectsWithTasks
  - packages/shared/src/schemas/effort.ts :: EffortEntriesRequestSchema
  - packages/shared/src/schemas/projects.ts :: ProjectsResponseSchema
  - packages/web/src/pages/efforts/EffortsNewPage.tsx :: EffortsNewPage
  - packages/web/src/features/effort-entry/components/EffortForm.tsx :: EffortForm
  - packages/web/src/features/effort-entry/components/entries/index.tsx :: EffortEntries
  - packages/web/src/features/effort-entry/components/entries/ProjectGroupCard.tsx :: ProjectGroupCard
  - packages/web/src/features/effort-entry/components/entries/EffortCombobox.tsx :: EffortCombobox
  - packages/web/src/features/effort-entry/components/entries/ProjectCombobox.tsx :: ProjectCombobox
  - packages/web/src/features/effort-entry/components/entries/TaskCombobox.tsx :: TaskCombobox
  - packages/web/src/features/effort-entry/components/entries/TaskRow.tsx :: TaskRow
  - packages/web/src/features/effort-entry/components/entries/DifferenceBadge.tsx :: DifferenceBadge
  - packages/web/src/features/effort-entry/components/ConfirmEffortSubmitDialog.tsx :: ConfirmEffortSubmitDialog
  - packages/web/src/features/effort-entry/hooks/modules/useEffortProjectsOptions.ts :: useEffortProjectsOptions
  - packages/web/src/lib/formatHours.ts :: formatWorkHours
  - packages/web/src/features/effort-entry/hooks/useEffortFormManager.ts :: useEffortFormManager
  - packages/web/src/features/effort-entry/hooks/modules/useEffortHistory.ts :: useEffortHistory
  - packages/web/src/features/effort-entry/hooks/modules/useEffortEntriesActions.ts :: useEffortEntriesActions
  - packages/web/src/features/effort-entry/hooks/modules/useEffortSubmission.ts :: useEffortSubmission
  - packages/web/src/features/effort-entry/hooks/modules/useEffortSummaryMetrics.ts :: useEffortSummaryMetrics
  - packages/web/src/features/effort-entry/utils/formHelpers.ts :: validateEffortEntry
  - packages/web/src/features/effort-entry/utils/formHelpers.ts :: mapFormEntryToRequest
  - packages/web/src/features/effort-entry/utils/projectGrouping.ts :: getProjectGroupKey
  - packages/web/src/api/projects.ts :: useProjectsWithTasks
related: [effort-draft, effort-ingest-gas, effort-list, user-settings]
symptoms:
  - 工数の送信に失敗したので送り直したら、工数が 2 重に登録された
  - 送信に失敗したのに、一部の工数だけ登録されている
  - 登録した新しい案件やタスクが、候補に出てこない
  - 工数登録の完了メールが届かない
  - 100 時間以上を入れると送信に失敗する
  - 大文字と小文字だけが違う案件が 2 つできた
  - 案件名を打っている途中で、候補の一覧が閉じる
  - 入力欄で Ctrl+Z（Cmd+Z）を押すと、ほかの欄の入力まで戻る
---

# 工数登録（Web の入力、案件とタスクの候補、undo / redo、完了メール）

## TL;DR・改修前の必読

- 工数登録画面（`/efforts/new`）で、日付と「案件 → タスク → 見積・実績」を入れて送信し、`work_records` に 1 タスク 1 行で保存する。新しい案件とタスクは名前から作る。送信のあと、設定が有効なら完了メールを送る
- 入力途中の内容の保存と復元は effort-draft、Google Form からの取り込み（`POST /api/effort`）は effort-ingest-gas の仕様。案件とタスクを名前から作る処理（`resolveProject` / `resolveTask` と `refreshProjectsWithTasksView`）は取り込みと別の実装だが、同じ表と候補の一覧（マテリアライズドビュー）を使う
- ⚠️ 改修の前に [§設計不変条件](#設計不変条件) と [§既知の落とし穴](#既知の落とし穴) を読む。**保存はまとめて行われない**（途中で失敗すると一部だけ残り、送り直すと 2 重になる）。候補の一覧は、案件かタスクを新しく作った送信の最後にだけ作り直す

## 目的と利用者

- 目的: 毎日の工数（案件・タスクごとの見積と実績）を記録し、工数一覧と週報の材料にする。登録の控えをメールで受け取る
- 利用者と使う場面: 1 日の終わりに、その日の作業を案件ごとにまとめて入れる。PC とスマートフォンの両方で使う

## 振る舞いと受け入れ基準

### API: 保存（`POST /api/effort/entries`、JWT）

- **AC-effort-entry-01**: 本文は `{ date: "YYYY-MM-DD", entries: [{ project_id, project_name, task_id, task_name, estimated_hours, hours }], memo?: string | null }`。`entries` は 1 タスク 1 要素の平らな配列。`project_id` / `project_name` / `task_id` / `task_name` / `estimated_hours` は null を許し、`hours` は数値が必須。形が違えば 400（`{ data, error: [...], success: false }`）、トークンが無ければ 401
- **AC-effort-entry-02**: 要素ごとに順に、案件を決める → タスクを決める → `work_records` に 1 行足す。すべて成功したら `201 { saved: [{ entry_id, project_id, task_id, hours, estimated_hours }] }`（`hours` と `estimated_hours` は DB で小数第 2 位に丸めた値）
- **AC-effort-entry-03**: 案件は、`project_id` があれば、そのユーザーの案件をその ID で探す（`project_name` は見ない。無いか他人の案件なら 400「指定した案件が見つかりませんでした。」）。`project_id` が無ければ、前後の空白を除いた `project_name` で、そのユーザーの案件を**大文字小文字を区別して**探し、無ければ作る（名前が空なら 400「新規案件を作成する場合は案件名が必要です。」）。ただし同じリクエストの中では、大文字小文字を区別せずに最初に決めた案件を使い回す
- **AC-effort-entry-04**: タスクは、`task_id` があれば、決めた案件の中をその ID で探す（無いか別の案件のタスクなら 400「指定したタスクが見つかりませんでした。」）。無ければ、前後の空白を除いた `task_name` で決めた案件の中を探し、無ければ作る（名前が空なら 400「新規タスクを作成する場合はタスク名が必要です。」）。同じリクエストの中の使い回しは案件と同じ
- **AC-effort-entry-05**: 次は 400 にする。`entries` が空（「工数の値が不正です。登録件数が0件でした。」）、見積が負（「見積工数は0以上を指定してください。」）、実績が負（「工数の時間は0以上を指定してください。」）。実績と見積に上限の検査は無い（100 以上で 500 になるのは不具合。[§既知の落とし穴](#既知の落とし穴)。テストでは 500 を期待値にしない）
- **AC-effort-entry-06**: 同じ日付で何度送っても、前の登録を置き換えずに行を足す（1 日を分けて登録できる。人間の判断 2）。同じ案件・同じタスクを 1 回の送信に 2 行入れても、まとめずに 2 行保存する（確かめた）
- **AC-effort-entry-07**: 1 回の送信で案件かタスクを 1 つでも新しく作ったときだけ、すべての行を保存したあとで候補の一覧（`projects_with_tasks_mv`）を作り直す。作り直しに失敗したら、行は保存済みのまま 500 を返す
- **AC-effort-entry-08**: メモは `work_records` には保存せず、完了メールにだけ使う

### API: 完了メール

- **AC-effort-entry-09**: 保存が成功し、ユーザーのメールアドレスがあり、ユーザー設定の `notify_effort_email` が `false` でない（設定の行が無いときも送る）とき、応答を返したあとで（`waitUntil`）、GAS のメール送信の宛先（`GAS_EMAIL_ENDPOINT`）に完了メールを頼む。メールの成否は応答（201）に影響しない
- **AC-effort-entry-10**: 件名は「`yyyy/MM/dd 工数を登録しました`」。本文は次の形（確かめた例。見積の無いタスクは `見積：-` で差分を付けない。案件別と全体の差分は「見積のあるタスクの実績の合計 − 見積の合計」で、見積が 1 つも無ければ `見積：-` で差分を付けない。時間は小数第 2 位までで末尾の 0 を付けない。メモは前後の空白を除いて空でなければ最後に付ける）

  ```
  【日付】
  2026/10/13

  【工数】
  ■案件A
  ・設計
  　見積：2h   実績：2.5h（+0.5h）
  ・実装
  　見積：-   実績：1h

  ■案件B
  ・打合せ
  　見積：1h   実績：0.33h（-0.67h）


  【集計】
  ■案件別
  ・案件A
  　見積：2h   実績：3.5h（+0.5h）
  ・案件B
  　見積：1h   実績：0.33h（-0.67h）

  ■全体
  見積：3h   実績：3.83h（-0.17h）

  【メモ】
  メモ
  ```

  差分が 0 なら `（±0h）`。案件は、決まった案件ごとに最初に出た順でまとめ（画面で同じ案件のカードを 2 つ作っても、メールでは 1 つになる）、案件の中のタスクは送信の順。日付は実行環境のタイムゾーンで整形する（本番の Workers は UTC）。行頭の字下げは全角の空白、`見積：` と `実績：` の間は半角の空白 3 つ

### API: 案件とタスクの候補（`GET /api/projects`、JWT）

- **AC-effort-entry-11**: そのユーザーの案件と、その中のタスクを `200 { projects: [{ id, name, created_at, tasks: [{ id, name, created_at }] }] }` で返す。案件もタスクも ID の降順（新しく作ったものが先）。タスクの無い案件は `tasks: []`。何も無ければ `{ projects: [] }`。候補の一覧（マテリアライズドビュー）から読むので、最後に作り直したときの内容になる

### 画面（`/efforts/new`）

- **AC-effort-entry-12**: 画面は「日付」（日付の選択と undo / redo のボタン）、「工数入力」、「集計」（エントリーが 1 件以上のとき）、「メモ」、「送信」の順。日付は最初は未選択
- **AC-effort-entry-13**: 「工数エントリーを追加」で案件のカードを 1 つ足す（タスクの行が 1 つ、見積は空、実績は 0）。カードの「タスクを追加」で同じ案件のタスクの行を足す。カードの × で案件ごと、行のごみ箱でタスクを消す（確認は出さない。最後のタスクを消すとカードも消える）。案件のカードは、つまみ（グリップ）をドラッグして並べ替えられる（タスクの行は並べ替えられない）
- **AC-effort-entry-14**: 案件とタスクの欄は、候補から選ぶか、名前を打ち込む。打ち込んだ文字はそのまま値になる。候補に無ければ「"{名前}" を追加」を出す。打ち込んだ名前が候補の名前と（大文字小文字を区別して）一致すると、その案件・タスクとして扱う。別のカードで使っている案件と、同じカードで使っているタスクは候補から外す（名前を打ち込めば同じものを入れられる）。案件欄を 1 文字でも変えると、そのカードの全タスクの名前と ID を空に戻す（見積と実績は残る）。タスクの候補は、カードの案件に ID があればその案件のタスク、無ければ**大文字小文字を区別せずに**名前の一致する案件のタスク。候補の取得に失敗したら「案件の取得に失敗しました」
- **AC-effort-entry-15**: 見積と実績は数値の欄（0.25 刻みの矢印、上限なし）。空にすると見積は「なし」、実績は未入力になる。各行に「実績 − 見積」の差を出す（見積が空なら出さない。0 は「±0」、正は赤、負は緑）
- **AC-effort-entry-16**: 集計は、案件ごと（「案件の ID（無ければ無し）と、小文字にした案件名」の組でまとめる。候補から選んだ案件と、同じ名前を打ち込んだ案件は別の行になり、大文字小文字だけが違う打ち込みの案件は 1 行になる）と全体の「見積」「実績」「差分」。実績は全タスクの合計、見積は見積のあるタスクの合計、差分は「見積のあるタスクの実績の合計 − 見積の合計」（見積が 1 つも無ければ「-」）。表示は整数なら小数なし、小数第 1 位までならその桁、それ以外は小数第 2 位（`0.30` のように末尾の 0 を残す）
- **AC-effort-entry-17**: 「送信」は、エントリーが 1 件以上あり、送信中でも下書きの読み込み中でもないときに押せる（候補の読み込み中でも押せる）。押すと、まず検証し、通ったときだけ確認（「工数を登録します」「よろしければ「送信する」をクリックしてください。」「キャンセル」「送信する」）を出す。「送信する」でもう一度同じ検証をする（ダイアログを開いている間にキーボードの undo で変わることがあるため）。検証は、日付が無ければ「日付を選択してください。」、エントリーが無ければ「工数エントリーを追加してください。」、案件・タスク（ID も名前も無い）・実績（未入力）が欠けた行があれば、その欄に「必須入力」を出して「入力内容を確認してください。」を出す。通らなければダイアログを出さず（2 回目なら送らず）に止める。負の値はここでは止めない
- **AC-effort-entry-18**: 送ると、ボタンは「送信中...」で押せなくなる。成功したら「工数を登録しました。」を出し、フォームを空（日付も未選択）に戻して undo の履歴を消し、候補を取り直す（下書きの扱いは effort-draft）。画面は移らない。失敗したら「工数の送信に失敗しました。」を出し、入力は残る。送信中も入力欄、追加・削除、キーボードの undo は使え、その間の編集は成功すると消える（effort-draft の既知の落とし穴「送信を待っている間の編集」）
- **AC-effort-entry-19**: undo / redo は、フォームの変更（日付、メモ、追加、削除、値の変更、並べ替え）を 1 回ごとに 1 歩として記録する（キー入力 1 文字ごとに 1 歩。上限なし）。新しい変更で redo の歩みは消える。ボタン（「元に戻す」「やり直す」）と、キーボードの Ctrl / Cmd + Z（元に戻す）、Ctrl / Cmd + Shift + Z と Ctrl / Cmd + Y（やり直す）で操作する。**キーボードは画面のどこでも効き、入力欄の中でも、ブラウザの入力欄の取り消しではなくフォーム全体の undo になる**（確かめた）。下書きの復元が終わったときと送信の成功のときに履歴を消す

## 画面と API

### 画面
- ルート: `/efforts/new`（ナビゲーションの「工数登録」）。ページの見出しは「工数登録」「作業内容と時間の記録」
- 主な操作: 日付の選択、案件のカードとタスクの行の追加・削除・並べ替え、案件とタスクの選択・入力、見積・実績・メモの入力、undo / redo、送信

### API
| メソッドとパス | 認証 | 入力 | 出力 | 主なエラー |
| --- | --- | --- | --- | --- |
| `POST /api/effort/entries` | JWT | `EffortEntriesRequestSchema` | `EffortEntriesResponseSchema`（201） | 400、401、500 |
| `GET /api/projects` | JWT | なし | `ProjectsResponseSchema` | 401、500 |

スキーマは `packages/shared/src/schemas/effort.ts` と `projects.ts`。メールの依頼の形は `email.ts`。全エンドポイントは [docs/reference/api.md](../../reference/api.md)。

## データ

- [work_records](../../reference/database.md#work_records): 1 タスク 1 行（`work_date`、`hours`、`estimated_hours`。どちらも `numeric(4,2)` で 100 未満）。同じ日・同じタスクの行が複数あってよい（一意の制約は無い）
- [projects](../../reference/database.md#projects) / [tasks](../../reference/database.md#tasks): 案件はユーザーごとに名前が一意、タスクは案件ごとに名前が一意（どちらも大文字小文字を区別する）。タスクには `user_id` が無く、案件を通してユーザーに属する
- [projects_with_tasks_mv](../../reference/database.md#projects_with_tasks_mv): 案件とタスクの候補の一覧（マテリアライズドビュー）。`refresh_projects_with_tasks_mv()` で全体を作り直す
- [user_settings](../../reference/database.md#user_settings) の `notify_effort_email`: 完了メールを送るか（行が無ければ送る）
- 画面: フォームの内容は部品の状態（undo / redo の履歴は画面の中だけ）。候補は SWR（キー `projects-with-tasks`、ユーザー単位）

## 設計不変条件

- **INV-1**: 案件はそのユーザーの中だけで探し、タスクはそのユーザーの案件の中だけで探す。`work_records` にはトークンのユーザーの ID を付ける（service role で接続しているので RLS に守られない）。破ると、他人の案件やタスクに工数が付く
- **INV-2**: 案件かタスクを新しく作ったら、候補の一覧を作り直す。破ると、作った案件・タスクが候補に出ず、次の登録で同じ名前を打ち込むことになる（名前で同じものに当たるので 2 重にはならないが、id での選択ができない）。作り直しは全ユーザー分をまとめて行う
- **INV-3**: 完了メールの成否は、登録の成否に影響させない（応答のあとで送る）。破ると、メールの不調で登録が失敗に見え、送り直しで 2 重になる
- **INV-4**: 送信の成功のあとに、下書きを消し、フォームを空に戻す順番は effort-draft の INV-2、INV-3 に従う（登録した内容が下書きとして復活しないため）

## エラー時の挙動

- 入力の検証の失敗は 400（`{ data, error: [...], success: false }`）。業務の検証（案件・タスクが無い、負の値など）は 400 で `{ error: <日本語のメッセージ>, accessLogId }`。DB の失敗は 500
- 画面は、送信の失敗をどれも「工数の送信に失敗しました。」の 1 つで知らせる（サーバーのメッセージは出さない）
- 完了メールの失敗は、利用者にも `error_logs` にも残らない（[§既知の落とし穴](#既知の落とし穴)）

## 既知の落とし穴

- **保存はまとめて行われない**: 要素ごとに別々の問い合わせで保存する。途中の要素が失敗すると、それより前の行は保存されたまま 400 / 500 を返す（確かめた）。画面は「工数の送信に失敗しました。」を出して入力を残すので、そのまま送り直すと前の行が 2 重になる。実績の検査は案件を決めたあとなので、失敗した要素の新しい案件も作られたまま残る。全行を保存したあとに候補の一覧の作り直しが失敗したとき（500）や、保存は済んだのに応答が届かなかったときも、画面は同じく失敗を出して入力を残すので、送り直すと**全行**が 2 重になる（このとき完了メールも送られない）。P6 以降に、まとめて保存する（全部保存するか全部保存しないか）ように直す予定（[v1.0.7-baseline](changes/v1.0.7-baseline.md) の人間の判断 1）
- **大文字小文字だけが違う案件で、タスクの候補を選ぶと 400**: 既存の「案件A」があるところで「案件a」と打つと、案件は ID の無い新しい案件のまま、タスクの候補には「案件A」のタスクが出る（AC-14）。そこから選んで送ると、サーバーは「案件a」を新しく作り、その中に無いタスクの ID で 400「指定したタスクが見つかりませんでした。」を返し、「案件a」は作られたまま残る（API の側はローカルの Supabase で確かめた。画面の側はコードから）。同じ送信の前の要素で「案件A」が決まっていれば、送信の中の使い回しで「案件A」に付き、400 にはならない
- **失敗した送信で作った案件は、候補にすぐ出ない**: 作り直しは最後にだけ行うので、途中で失敗すると作った案件・タスクは候補に出ず、別の送信で作り直されたときに現れる（確かめた）
- **100 時間以上は 500**: 上限の検査が無く、DB の桁あふれで 500 になる（確かめた）。画面も上限を設けていない
- **負の値は画面では止めない**: 欄の `min` は効かず、送ってからサーバーが 400 にし、画面は「工数の送信に失敗しました。」だけを出す。見積が負の場合も同じ
- **大文字小文字の扱いがそろっていない**: DB と、別の送信どうしは区別する（「案件a」は「案件A」とは別の案件になる。確かめた）が、同じ送信の中では区別せず最初のものにまとめる。画面の候補との一致は区別し、集計のまとまりは区別しない。effort-ingest-gas は v1.1.2 で、1 回の送信の中でも「区別する」にそろえた（この経路はまだ）
- **同じ送信の中でタスクの ID の使い回しが案件を確かめない**: 前の要素で使ったタスクの ID を、後の要素が別の案件の ID と組み合わせて送ると、案件を確かめずにそのタスクに保存し、応答とメールは後の案件として扱う（画面からは起きない）
- **完了メールの失敗が記録されない**: 送信の失敗を捕まえず、`error_logs` に書かない（旧ドキュメントは「`error_logs` に記録する」）。GAS が JSON 以外を返したときの扱いも無い
- **メールの数字は送った値**: メールは送った値をそのまま使い、DB は小数第 2 位に丸める。小数第 3 位以下を送ると、メールと保存した値がずれる
- **メールの【集計】の前の空行が 2 行**（確かめた。旧ドキュメントの例は 1 行）
- **候補の一覧は全体を作り直す**: 作り直しの間は全ユーザーの読み出しが待たされる。案件やタスクを消す処理（アカウントの削除など）では作り直さない
- **同じ案件・タスクを画面で 2 つ入れられる**: 候補から外れていても、名前を打ち込めば同じ案件のカードや同じタスクの行を足せる。送ると別の行として保存される（AC-06）
- **案件名を打っている途中で一覧が閉じる**: 打ち込んだ名前が既存の案件と一致した瞬間に、カードが作り直されて候補の一覧が閉じる（確かめた）。既存の案件「確認」があると、「確認案件」と打つ途中で閉じる
- **キーボードの undo が入力欄の取り消しを奪う**: 入力欄の中でも Ctrl / Cmd + Z がフォーム全体の undo になり、Mac の Cmd + Y も奪う。確認のダイアログを開いている間も効く。入力欄の中でフォーム全体の undo になるのは仕様とし、ダイアログを開いている間と送信中だけ効かないように P6 で直す予定（人間の判断 3）
- **開発用サーバーでは undo の 1 歩が 2 回ずつ記録される**: 履歴の記録が状態の更新の中にあり、React の StrictMode（開発時だけ）の二重呼び出しで 2 回入る。開発中は 1 回の undo で戻らないことがある（確かめた）。本番のビルドでは二重呼び出しが無い
- **履歴に上限が無い**: キー入力 1 文字ごとに 1 歩増える。案件のカードを消すときと、案件欄に 1 文字打つとき（カードの全タスクを更新する）は、タスクの数だけ歩みが増える。その途中まで 1 歩だけ戻すと、同じカードのタスクの案件の ID がそろわず、カードが 2 枚に分かれて見えることがある（コードから。未確認）
- **案件名の入れ直しで「必須入力」が残ることがある**: 案件を変えるとカードの全タスクを更新するが、2 つ目以降のタスクの検査がやり直されないことがある（コードから。未確認）
- **読み込み中の日付の選択は仮のもの**: effort-draft の既知の落とし穴を参照（P6 で直す予定）
- **集計の案件名が「未設定の案件」のまま**: 下書きから案件 ID だけで戻した行は、候補の読み込みが終わっても名前が更新されないことがある（コードの `TODO(P6)`）
- **差分の表示の小数**: 0.1 + 0.2 と 0.3 のような計算の誤差で、差が 0 にならず「+0.00h」になることがある

## ポストモーテム

該当なし（git の履歴に、工数登録の画面と保存の不具合の修正は無い。下書きの不具合 `a8a5c14` は effort-draft のポストモーテム）。

## テストとの対応

| AC | テスト | 種類 |
| --- | --- | --- |
| AC-effort-entry-01〜11、INV-1〜3（API） | `packages/api/test/effort-entries.int.test.ts`（メールは `test/setup.ts` が横取りした内容で確かめる。日付は本番と同じ UTC） | 結合 |
| AC-effort-entry-12〜19 | `packages/web/src/features/effort-entry/components/EffortForm.test.tsx`（フォームの初期の内容は、サーバーの下書きとして渡す） | 部品 |
| AC-effort-entry-12〜14、17、18 | `packages/e2e/tests/effort.spec.ts`（案件とタスクを打ち込んで登録し、工数一覧に出ること）、`screens.spec.ts`（見出し） | E2E |
| 案件のカードのドラッグでの並べ替え（AC-13）、送信中の編集（AC-18） | 未（並べ替えは E2E で足す。送信中の編集は P6 で直すときに先に落ちるテストを書く） | — |

既知の落とし穴のうち、今の振る舞いをテストで固めたもの（P6 で直すときにテストを書き換える）: 1 回の送信の中で大文字小文字だけが違う名前をまとめる（AC-03）、検証で負の値を止めない（AC-17）。

## 変更履歴

| バージョン | 日付 | 内容 | 改修の記録 |
| --- | --- | --- | --- |
| v1.0.7 | 2026-10-15 | 移行時点の基準 | [v1.0.7-baseline](changes/v1.0.7-baseline.md) |
