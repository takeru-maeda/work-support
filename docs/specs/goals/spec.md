---
title: 目標管理（現在の目標、目標の追加、過去の目標）
feature: goals
status: current
updated: 2026-10-14
code:
  - packages/api/src/features/goals/index.ts :: goals
  - packages/api/src/features/goals/service.ts :: updateGoalService
  - packages/api/src/features/goals/service.ts :: getPreviousWeekProgressService
  - packages/api/src/features/goals/service.ts :: getPreviousWeekSunday
  - packages/api/src/features/goals/repository.ts :: getLatestGoals
  - packages/api/src/features/goals/repository.ts :: getGoalProgressHistoriesUntil
  - packages/api/src/features/goals/repository.ts :: searchGoals
  - packages/shared/src/schemas/goals.ts :: GoalHistoryQuerySchema
  - packages/shared/src/utils/goalProgress.ts :: calculateGoalSummaries
  - packages/web/src/services/goals.ts :: useCurrentGoals
  - packages/web/src/features/goals/hooks/useGoalsTableManager.ts :: useGoalsTableManager
  - packages/web/src/features/goals/hooks/modules/current/useGoalsEditingState.ts :: useGoalsEditingState
  - packages/web/src/features/goals/hooks/modules/current/usePreviousWeekSummary.ts :: usePreviousWeekSummary
  - packages/web/src/features/goals/hooks/modules/add/useAddGoalPeriodValidation.ts :: useAddGoalPeriodValidation
  - packages/web/src/features/goals/hooks/modules/add/useAddGoalMetrics.ts :: useAddGoalMetrics
  - packages/web/src/features/goals/hooks/modules/add/useAddGoalSave.ts :: useAddGoalSave
  - packages/web/src/features/goals/hooks/modules/add/useGoalDraft.ts :: useGoalDraft
  - packages/web/src/features/goals/hooks/usePastGoals.ts :: usePastGoals
  - packages/web/src/features/goals/hooks/modules/past/usePastGoalFilters.ts :: usePastGoalFilters
related: [weekly-report]
symptoms:
  - 日曜日に更新した進捗が、翌週の「前週からの差分」に入らない
  - 月曜日の朝（9 時より前）に更新した進捗が、前週の分として扱われる
  - 前週から進捗を上げたのに、差分が +0.0% のまま
  - 目標を追加したら、今の目標が一覧から消えた / 一部しか保存されていない
  - 過去の目標の検索で、キーワードに「,」を入れるとエラーになる
  - 過去の目標の検索でエラーのトーストが何度も出る
  - 内容のダイアログや削除のあとで、表で編集していた値が元に戻る
  - 目標の更新に失敗したら、保存していない編集が消えた
---

# 目標管理（現在の目標、目標の追加、過去の目標）

## TL;DR・改修前の必読

- 期間（開始日〜終了日）ごとに複数の目標と重み（合計 100%）を決め、進捗率を更新して、前週からの伸びを見る機能。画面は目標管理（`/goals`。現在の目標と過去の目標）と目標の追加（`/goals/add`）
- 「現在の目標」は、**終了日がいちばん未来の期間の目標の全部**（今日の日付とは関係ない）。新しい期間を追加すると、それまでの目標は過去の目標になり、編集できなくなる
- 前週からの差分は、進捗を変えるたびに残す履歴（`goal_progress_histories`）から出す。週報（weekly-report）も同じ履歴を使う
- ⚠️ 改修の前に [§設計不変条件](#設計不変条件) と [§既知の落とし穴](#既知の落とし穴) を読む。**重みの合計 100%、期間の前後関係、期間を変えないことは、web の画面だけが守っている**（API は受け付ける）。週の境目は UTC で計算している（日本時間の月曜 9 時）

## 目的と利用者

- 目的: 期間の目標と重要度を決め、進捗を週ごとに振り返る。週報の「目標進捗状況」の材料にもなる
- 利用者と使う場面: 期の初めに目標を立て、毎週の振り返りで進捗率を更新し、前週からの伸びを見る。過去の期間の目標を検索して見返す

## 振る舞いと受け入れ基準

### 現在の目標（`/goals` の「目標進捗」）

- **AC-goals-01**: `GET /api/goals/current` は、そのユーザーの目標のうち、`end_date` がいちばん未来の日付と等しい目標をすべて返す。今日の日付や `start_date` は見ない（終了日が同じなら開始日が違っても同じ期間として返す）。目標が無ければ `{ goals: [] }`
- **AC-goals-02**: 画面は、期間（目標の開始日の最小〜終了日の最大）、「全体進捗」（進捗率の単純平均）と「加重進捗」（Σ 進捗率×重み ÷ Σ 重み）を小数第 1 位で出す。重みの合計が 0 のときはどちらも 0.0%。表で編集中の値（保存前）で計算し直す。目標が無ければ「目標が設定されていません」を出す
- **AC-goals-03**: 表では、目標名・重み・進捗率をその場で編集できる（保存するまで画面の中だけ）。進捗率は小数を受け付け、範囲の外は 0 / 100 にする。重みは整数に切り捨て、0 未満は 0 にする（1 行の上限は無いが、100 を超えると合計が 100 にならないので保存できない）
- **AC-goals-04**: 「更新」は、変更がある（目標名・重み・進捗率のどれかが元と違う）かつ、重みの合計が 100 のときだけ押せる。合計が 100 でなければ「⚠️ トータルウェイト: {n}% / (100%になるようにしてください)」を出す。目標名が空でも押せる（AC-05 の失敗になる）
- **AC-goals-05**: 「更新」を押すと、変更のある目標ごとに、順に `PUT /api/goals/:id { title, weight, progress }` を送る。全部成功したら「目標を更新しました」を出して一覧を取り直す。途中で失敗したら「目標の更新に失敗しました。時間を空けて再度お試しください。」を出し、失敗より前の目標は保存済みのまま残る。1 件ごとの成功のたびに一覧を取り直して表をサーバーの値に戻すので、**1 件目で失敗したときだけ編集中の値が残り、2 件目以降で失敗すると、まだ保存していない編集は消える**。目標名が空の目標は、送る前に検証で失敗する（それより前の目標は保存される）
- **AC-goals-06**: `PUT /api/goals/:id` は、本文にある項目だけを変える。本文に `progress` があれば、変わっていなくても、更新のあとに履歴を 1 行残す（`progress` は更新後の値、`recorded_at` はサーバーの現在時刻）。`progress` が無ければ履歴は残さない。応答は `200 { updated }`。重みと進捗率は小数第 2 位に丸めて保存する。本文が空（`{}`）なら、目標があっても `400 "Goal not found for the given user and id"`
- **AC-goals-07**: 目の印で内容のダイアログを開き、「保存」で `PUT /api/goals/:id { content }` を送る。成功なら「内容を更新しました」、失敗なら「内容の更新に失敗しました。時間を空けて再度お試しください。」を出す。どちらでもダイアログは閉じる
- **AC-goals-08**: ごみ箱の印で削除の確認を出す。入力欄の値（前後の空白を除く）が目標名と一致したときだけ「削除する」を押せる。照らし合わせるのは**表で編集中の目標名**（保存前の値）。押すと `DELETE /api/goals/:id`（`204`）を送り、「目標を削除しました」を出す。目標の進捗の履歴も一緒に消える。失敗したら「目標の削除に失敗しました。時間を空けて再度お試しください。」
- **AC-goals-09**: 画面は、目標があるとき、端末の今日の日付を `referenceDate` にして `GET /api/goals/progress/previous-week` を呼び、全体進捗と加重進捗の横に前週からの差分（`+x.x%` は緑、`-x.x%` は赤、`+0.0%` は灰色）を出す。前週の値は、応答の目標ごとの進捗と、**保存済みの重み**で計算する（応答に無い目標は保存済みの進捗率で数える）。今の値（AC-02）は編集中の値で計算するので、表で重みや進捗率を変えると差分も変わる。取得に失敗したら「前週の進捗取得に失敗しました。時間を空けて再度お試しください。」を出し、差分は +0.0%
- **AC-goals-10**: `GET /api/goals/progress/previous-week?referenceDate=YYYY-MM-DD` は、`referenceDate` を含む週（月曜始まり。日付と時刻は実行環境のタイムゾーンで計算し、本番の Workers では UTC）の前の日曜日を `previousWeekEnd` として、そのユーザーの**すべての目標**（現在の期間に限らない）について次の値を返す（`goal_id` の昇順）
  - その日曜日の 23:59:59.999（UTC）までの履歴があれば、いちばん新しい履歴の値（`source: "history"`、`recorded_at` は履歴の時刻の UTC の日付）
  - 履歴が無く、目標の作成がその日曜日の 0:00（UTC）より後なら 0（`source: "goal"`、`recorded_at` は作成日）
  - 履歴が無く、それより前に作った目標なら、**今の**進捗率（`source: "goal"`、`recorded_at` は `previousWeekEnd`）。週報とは扱いが違う（[§既知の落とし穴](#既知の落とし穴)）

### 目標の追加（`/goals/add`）

- **AC-goals-11**: 開始日と終了日の両方を選ぶまで保存できない。終了日が開始日と同じか前なら「終了日は開始日より未来の日付を選択してください。」、開始日が現在の目標の終了日と同じか前なら「開始日は既存目標の終了日（yyyy/MM/dd）より未来の日付を選択してください。」を出し、保存できない。期間の欄の下に「現在の目標期間の終了日（yyyy/MM/dd）よりも未来の日付を選択してください。」を出す
- **AC-goals-12**: 目標の行（目標名、内容、重み）を足したり消したりできる。最後の 1 行は消せない。重みの合計を「{n}% / 100%」で出し、合計が 100 を超えたら「トータルウェイトが100%を超えています。調整してください。」を出す。「保存」は、期間が正しく、重みの合計がちょうど 100 で、すべての行の重みが 0 より大きいときだけ押せる
- **AC-goals-13**: 「保存」を押すと「目標を保存してもよろしいですか？」の確認を出す（「新しい目標を保存すると、現在の最新目標は編集できなくなります。」「保存すると指定した期間の目標は新しく追加することができません。また、期間の更新を行うことはできません。」）。「はい」で、目標名（前後の空白を除いて判定する。保存するのは入力そのまま）が空でなく重みが 0 より大きい行だけを、1 行ずつ順に `POST /api/goals` で作る。進捗率は 0 で作られ、履歴は残さない。全部成功したら「目標を保存しました」を出し、入力途中の内容を消して `/goals` に戻る。途中で失敗したら「目標の保存に失敗しました。時間を空けて再度お試しください。」を出し、入力は残る（失敗より前の目標は作られたまま）
- **AC-goals-14**: 入力途中の内容（期間と行）は、変わるたびにブラウザ（localStorage のキー `goals:add:draft_<ユーザー ID>`）に保存し、次に開いたときに戻す。何も入っていない（日付も、目標名も内容も無く、重みがすべて 0）ときはキーを消す。「キャンセル」や戻るでは消さない。壊れた JSON なら空から始める

### 過去の目標（`/goals` の「過去の目標履歴」）

- **AC-goals-15**: `GET /api/goals/history` は、そのユーザーの目標（現在の期間も含む）を次の条件で絞って返す。`query` は目標名か内容の部分一致（大文字小文字を区別しない）、`startDate` は `start_date >= startDate`、`endDate` は `end_date <= endDate`、`minProgress` / `maxProgress` は進捗率の下限・上限（両端を含む、0〜100）。`minProgress > maxProgress` は 400。`query` の `%` と `_` はワイルドカードとして働く
- **AC-goals-16**: 並び順は `sort`（`title` / `weight` / `progress` / `start_date` / `end_date`、先頭に `-` で降順）、既定は `-end_date`。一覧に無い `sort` は 400。`page` は既定 1、`pageSize` は既定 20 で 1〜100。応答は `{ items, meta: { page, pageSize, total, totalPages }, aggregations: { totalCount } }`
- **AC-goals-17**: 画面は、現在の期間の目標を出さない。終了日の条件が空なら、現在の目標の開始日の最小の前日を `endDate` として送り、さらに応答から終了日が現在の期間の終了日より前のものだけを出す（件数もその分を引く）。1 ページの件数の既定は 10。現在の目標の読み込みが終わる前や失敗したときは除かないので、現在の期間の目標も出る
- **AC-goals-18**: 絞り込みの条件（目標名、開始日、終了日、進捗率の下限・上限。進捗率は整数に切り捨てる）は「適用」で反映し、1 ページ目に戻る。「クリア」で条件・並び順・件数を初期に戻す。列の見出しを押すと、昇順 → 降順 → 並べ替えなし の順に変わり、1 ページ目に戻る。条件・並び順・1 ページの件数（ページ番号は除く）は localStorage（キー `goals:past:filters_<ユーザー ID>`）に保存し、次に開いたときに戻してから最初の検索をする。「クリア」でキーを消す
- **AC-goals-19**: 行を押すと、内容を読むだけのダイアログを出す。内容が空なら「内容が設定されていません。」。該当が無ければ「該当する目標は見つかりませんでした」を出す

### 共通（API）

- **AC-goals-20**: どの API も、トークンのユーザーの目標だけを読み書きする。トークンが無ければ 401。`PUT` / `DELETE` で、目標が無いか別のユーザーの目標なら `400 "Goal not found for the given user and id"`（404 ではない）
- **AC-goals-21**: `POST /api/goals` の本文は `{ title（1 文字以上）, content（文字列。null や省略は 400）, start_date, end_date（YYYY-MM-DD）, weight（0〜100） }`。作った目標を `201 { created }` で返す（重みは小数第 2 位に丸める）。**期間の前後、既存の期間との重なり、重みの合計は確かめない**（逆の期間でも作れる）
- **AC-goals-22**: `PUT /api/goals/:id` は、`start_date` / `end_date` も受け付けて変える（画面からは送らない）。`updated_at` は作ったときのまま変わらない

## 画面と API

### 画面
- ルート: `/goals`（目標管理。「目標進捗」と「過去の目標履歴」の 2 つのカード）、`/goals/add`（目標を追加）。`packages/web/src/config/routes.ts`
- 主な操作: 表での目標名・重み・進捗率の編集と「更新」、内容のダイアログ、削除（目標名の入力で確認）、「追加」から目標の追加、過去の目標の絞り込み・並べ替え・ページ送り

### API
| メソッドとパス | 認証 | 入力 | 出力 | 主なエラー |
| --- | --- | --- | --- | --- |
| `GET /api/goals/current` | JWT | なし | `GetGoalResponseSchema` | 401、500 |
| `POST /api/goals` | JWT | `CreateGoalRequestSchema` | `CreateGoalResponseSchema`（201） | 400、401、500 |
| `PUT /api/goals/:id` | JWT | `UpdateGoalRequestSchema` | `UpdateGoalResponseSchema` | 400（検証、目標が無い）、401、500 |
| `DELETE /api/goals/:id` | JWT | なし | 204 | 400（目標が無い）、401、500 |
| `GET /api/goals/progress/previous-week` | JWT | `GoalPreviousWeekQuerySchema` | `GoalPreviousWeekProgressSchema` | 400、401、500 |
| `GET /api/goals/history` | JWT | `GoalHistoryQuerySchema` | `GoalHistoryResponseSchema` | 400、401、500 |

スキーマは `packages/shared/src/schemas/goals.ts`。全エンドポイントは [docs/reference/api.md](../../reference/api.md)。

## データ

- [goals](../../reference/database.md#goals): 1 行が 1 つの目標。同じ `end_date` の目標の集まりを 1 つの期間として扱う（期間を表す別の表は無い）。`weight` と `progress` は行ごとに 0〜100 の CHECK だけ。重みの合計や期間の重なりの制約は DB に無い
- [goal_progress_histories](../../reference/database.md#goal_progress_histories): 進捗の履歴。`recorded_at`（timestamptz、サーバーの現在時刻）で、ある時点までの最新の値を取る。目標を消すと一緒に消える（CASCADE）
- ブラウザ: `goals:add:draft_<ユーザー ID>`（追加の入力途中）、`goals:past:filters_<ユーザー ID>`（過去の目標の条件）。どちらも localStorage
- SWR のキーはユーザー単位（`/api/goals/current_<ユーザー ID>` など）。作成・更新・削除のあとに取り直すのは現在の目標だけ

## 設計不変条件

- **INV-1**: 「現在の目標」は、終了日がいちばん未来の期間の目標の全部で、新しい期間は現在の期間の終了日より後に始める。破ると（現在の期間より後に終わる目標を 1 つでも作ると）、それまでの目標が全部「過去」に回って編集できなくなる。期間が重なると、過去の目標の画面の「現在の期間を除く」計算もずれる。**守っているのは追加の画面（AC-goals-11）だけ**
- **INV-2**: 目標は進捗率 0 で作り、進捗率を変える更新では必ず履歴を残す（`PUT` に `progress` を含める）。週報の差分はこの履歴だけから出す。目標の画面の前週の値も履歴から出し、履歴が無いときだけ今の進捗率で代用する（AC-goals-10。0 に直す予定）。破ると（履歴を残さずに `progress` を変える経路を作ると）、差分が黙って 0 や誤った値になる
- **INV-3**: 1 つの期間の重みの合計は 100（追加の画面と表の「更新」で守る）。合計が 100 でなくても加重進捗は重みの比で計算されるので、エラーにはならず、数字の意味だけが変わる。**API は合計を確かめない**
- **INV-4**: 期間（`start_date` / `end_date`）は作ったあとに変えない（確認のダイアログで利用者にそう約束している）。破ると INV-1 と同じことが起きる。**API は変更を受け付ける**（AC-goals-22）ので、画面から期間を送らないことで守っている
- **INV-5**: どのクエリも、トークンのユーザーの `user_id` で絞る（service role で接続しているので RLS に守られない）。履歴の追加だけは `user_id` を見ないが、直前の `user_id` で絞った更新が成功したときだけ走る。この順番を崩すと、他人の目標に履歴を足せてしまう

## エラー時の挙動

- 取得の失敗: 「目標の取得に失敗しました。」「前週の進捗取得に失敗しました。」「過去目標の取得に失敗しました。」（いずれも「時間を空けて再度お試しください。」付き）のトーストと `error_logs`
- 保存の失敗: AC-goals-05、07、08、13 のトースト。どれも 1 件ずつ順に送るので、**途中で失敗すると一部だけ保存される**（元に戻さない）
- API の入力の検証の失敗は 400（`{ success: false, error: [...] }` の形。`globalErrorHandler` の形ではない）。DB の失敗は 500

## 既知の落とし穴

- **週の境目が UTC**: 前週の日曜日の判定と履歴の締め切りを UTC で計算しているため、日本時間では「月曜 9:00 より前」の更新が前週の分になる（コードに `TODO: 時差が怪しい`）。週報も同じく UTC の月曜 0:00 で区切る。P6 以降に日本時間の月曜 0:00 に直す予定（[v1.0.7-baseline](changes/v1.0.7-baseline.md) の人間の判断 1）
- **前週の進捗の履歴を件数の上限なしで取っている**: そのユーザーの全目標の、前週の日曜日までの履歴を一度に取る。PostgREST の `max_rows`（ローカルの設定は 1000。クラウドの値は未確認）を超えると、`goal_id` の大きい目標（新しい期間＝今の目標）の履歴から切り捨てられ、その目標は「履歴なし」として前週の値が今の値になり、差分が黙って +0.0% になる。履歴は「更新」のたびに増えるので、長く使うほど近づく。P6 で直す予定（目標ごとに最新の 1 件だけ取る、など）
- **作成の判定と締め切りの時刻がずれている**: 「今週作った目標」の判定は日曜日の 0:00（UTC）、履歴の締め切りは日曜日の 23:59（UTC）。日曜日に作った目標は、前週の値が 0 になる
- **履歴の無い目標の前週の値が、今の進捗率になる**: 前週より前に作り、前週の締め切りまでに一度も更新していない目標は、前週の値が今の値になり、差分が 0 に見える（AC-goals-10）。週報は同じ場合に 0 を使うので、画面と週報で差分が食い違う。P6 以降に 0 に直す予定（人間の判断 2）
- **重み・期間のルールが API に無い**: AC-goals-21、22。web 以外から API を呼ぶ、または web の確認をすり抜けると INV-1、3、4 が崩れる。追加の画面は、現在の目標の読み込みが終わる前（または失敗したとき）は、既存の期間との比較をせずに保存できる。P6 以降に API でも守るように直す予定（人間の判断 3）
- **一部だけ保存される**: 追加は 1 件ずつの `POST`、表の更新は 1 件ずつの `PUT`。途中で失敗すると一部だけ残る。追加で一部だけ残ると、その期間が「現在」になり、重みの合計が 100 にならず、同じ期間でもう一度追加することもできない（期間の検証で止まる）。`PUT` は目標の更新と履歴の追加が別々なので、履歴の追加だけが失敗すると 500 を返すが目標は変わっている。追加は P6 以降に「まとめて 1 回で作る」API に直す予定（人間の判断 3）
- **目標名が空の行は黙って捨てられる**: 追加の画面で、重みだけ入れて目標名が空の行は、保存の時に何も言わずに外される。保存された重みの合計は 100 にならない。P6 で直す予定
- **表の編集中の値が消える**: 一覧を取り直してデータが変わると、表の編集中の値がサーバーの値に戻る。取り直すのは、内容のダイアログの保存、削除、「更新」の 1 件ごとの成功（AC-goals-05）、画面にフォーカスが戻ったとき（SWR の既定。別の端末で目標が変わっていれば）。P6 で直す予定
- **内容のダイアログは失敗しても閉じる**: 入力した内容が失われる。保存中も「保存」を押せるので、2 回押すと 2 回送る。P6 で直す予定
- **削除の確認ダイアログは押した瞬間に閉じる**: 削除の結果を待たずに閉じるので、失敗はトーストだけで知らされる。目標名の前後に空白があると（追加の画面は空白を残して保存する）、一致させられず削除できない。表で目標名を空に編集すると、何も入力せずに削除できる
- **過去の目標の検索**: キーワードに `,` を含めると 500（PostgREST の `or()` に文字列をそのまま埋めている）。最後のページより先を指定すると 500（ローカルの Supabase で確認した）。並び順の列が同じ値の行は順番が決まらず、ページをまたいで重複や抜けが起きうる。web で失敗すると、エラーのトーストが描画のたびに出続ける（`usePastGoalHistory` が描画中にトーストを出す）。進捗率の下限が上限より大きい・範囲の外の条件を「適用」しても同じことになり、その条件は localStorage に保存されるので、「クリア」するまで開くたびに繰り返す。キーワードの `(` `)` も `or()` を壊すおそれがある。P6 で直す予定
- **過去の目標の件数**: 画面で現在の期間を除く計算はそのページの分だけなので、終了日の条件を手で入れて現在の期間を含めると、件数とページ数がずれる
- **`:id` が数字でない**: `PUT` / `DELETE /api/goals/abc` は 500（400 にならない）
- **ブラウザの時差**: web は `YYYY-MM-DD` を `new Date()` で UTC の 0 時として読む。日本時間では問題ないが、UTC より西の時差の端末では日付が 1 日前に表示され、保存した絞り込みの日付が開くたびに 1 日ずれる。追加の画面の期間の検証も 1 日ゆるくなり、開始日を現在の終了日と同じ日にしても通る（期間が 1 日重なる）
- **前週の基準日**: `referenceDate` は、現在の目標のデータが変わったときにだけ計算し直す。画面を開いたまま日付が変わっても、目標のデータが変わらなければ前の日付のまま。作成・更新・削除のあとに、前週の進捗と過去の目標は明示的には取り直さない（画面にフォーカスが戻ったときは取り直す）
- **表の更新では、進捗率を変えていなくても履歴が 1 行増える**（画面は変更のある目標に必ず `progress` を送る）。害は無い
- `PUT` は `updated_at` を変えない（AC-goals-22）

## ポストモーテム

### 2025-11-18 症状「日曜日に更新した進捗が、翌週の『前週からの差分』に入らない」（`108e691`）
- **真因**: 前週の締め切りを `recorded_at <= '日曜日の日付'` で比べていた。`recorded_at` は timestamptz なので、日付の文字列は日曜日の 0:00 として比べられ、日曜日のうちの更新が締め切りの外になった（あわせて、手書きのマイグレーションの `recorded_at` が DATE になっていたのを TIMESTAMPTZ に直した）
- **対策**: 締め切りを日曜日の終わり（`dayjs(endDate).endOf("day")`）にした。ただし計算は UTC のままで、日本時間の月曜 9:00 までが前週になる（[§既知の落とし穴](#既知の落とし穴)）。テストは未（P6）
- **再発時に確認すること**: 日付の文字列と timestamptz を比べていないか。週の境目と締め切りを同じタイムゾーンで計算しているか。`getPreviousWeekSunday` と `isCreatedInThisWeek` と週報（`getWeekRange`）で境目がそろっているか。履歴が `max_rows` で切り捨てられていないか（[§既知の落とし穴](#既知の落とし穴)）
- **改修の記録**: なし（移行前の修正。経緯は [v1.0.7-baseline](changes/v1.0.7-baseline.md)）

## テストとの対応

| AC | テスト | 種類 |
| --- | --- | --- |
| AC-goals-01 | `packages/api/test/fresh-user.int.test.ts`（一部。目標の無いユーザーで 500 にならないことだけ） | 結合 |
| AC-goals-02 | `packages/shared/src/utils/goalProgress.test.ts`（計算の部分だけ） | 単体 |
| AC-goals-15、16 | `packages/shared/src/schemas/goals.test.ts`（入力の検証の部分だけ） | 単体 |
| AC-goals-01、06、10、15、16、20〜22、INV-2、INV-5（API） | 未（P6。`*.int.test.ts`。AC-10 は実行環境のタイムゾーンで結果が変わるので、`TZ=UTC` に固定するか時刻を差し替えて書く） | 結合 |
| AC-goals-02〜05、07〜09、11〜14、17〜19 | 未（P6。Testing Library + MSW） | 部品 |
| 画面を開いて主な見出しが出ること | `packages/e2e/tests/screens.spec.ts`（`/goals`） | E2E |

## 変更履歴

| バージョン | 日付 | 内容 | 改修の記録 |
| --- | --- | --- | --- |
| v1.0.7 | 2026-10-14 | 移行時点の基準 | [v1.0.7-baseline](changes/v1.0.7-baseline.md) |
