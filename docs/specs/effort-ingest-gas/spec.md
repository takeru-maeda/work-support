---
title: GAS / Google Form からの工数の取り込み
feature: effort-ingest-gas
status: current
updated: 2026-10-15
code:
  - packages/api/src/features/effort/index.ts :: gasEffort
  - packages/api/src/middleware/auth.ts :: apiKeyAuthMiddleware
  - packages/api/src/features/effort/service.ts :: saveEffortRecords
  - packages/api/src/features/effort/service.ts :: parseEffortText
  - packages/api/src/features/effort/service.ts :: parseHours
  - packages/api/src/features/effort/repository.ts :: findProject
  - packages/api/src/features/effort/repository.ts :: findOrCreateTask
  - packages/api/src/features/effort/repository.ts :: insertWorkRecord
  - packages/api/src/features/effort/types.ts :: EffortRequestSchema
related: [effort-entry, effort-list, platform]
symptoms:
  - Google Form から工数を送ったのに、工数一覧に出ない
  - Google Form から送った工数の一部の行だけが登録されない（v1.1.2 より前）
  - 開発者に「工数のテキストに読めない行があります」のメールが届き、工数が 1 行も登録されない
  - Google Form から送った工数が 2 重に登録されている
  - 開発者に「工数登録エラー」のメールが届く（Unauthorized、User not found、Failed to look up user など）
---

# GAS / Google Form からの工数の取り込み

## TL;DR・改修前の必読

- Google Form のテキストエリアに決まった書式で書いた工数を、Google Apps Script（GAS）が API に送り、案件・タスク・工数の記録として保存する。Web の工数登録画面を開かずに、毎日の工数を送れる
- 認証は、アプリ全体で 1 つの API キーと、フォームが集めたメールアドレス。JWT ではない
- ⚠️ 改修の前に [§設計不変条件](#設計不変条件) を読む。書式の解析と、同じパスの下にある Web 用の JWT のルートとの関係を壊すと、取り込みが黙って失敗するか、他人として登録できてしまう
- ⚠️ 書式や数値に誤りのある行が 1 つでもあれば、**1 行も保存せずに 400**（v1.1.2 から。それまでは黙って読み飛ばしていた）。ただし、読み終えたあとの保存の途中で DB が失敗すると、それまでの行は**保存されたまま**（[§エラー時の挙動](#エラー時の挙動)、[§既知の落とし穴](#既知の落とし穴)）

## 目的と利用者

- 目的: Web の画面を開かなくても、Google Form から 1 日の工数をまとめて記録できるようにする
- 利用者と使う場面: 利用者が毎日の終わりに Google Form を送信する。フォームは「メールアドレスを収集する」を有効にしており、GAS（フォームのスクリプト）が送信のたびに API を呼ぶ。API がエラーを返したときは、GAS が開発者にメールで知らせる（API はメールを送らない）

## 振る舞いと受け入れ基準

### 書式

```
■<案件名>
・<タスク名>：[<見積>]<実績>
```

- `■` で始まる行が案件。次の `■` の行までの `・` の行が、その案件のタスク
- タスクの行は `・<タスク名>：[<見積>]<実績>` の形。`：` は全角、`[ ]` と `< >` は半角。タスク名は、後ろが `[<見積>]<実績>` として読める最初の `：` まで（`・設計：詳細：[2]<1>` のタスク名は `設計：詳細`）
- 空の行（空白だけの行を含む）は読み飛ばす。行の前後の空白は無視する。括弧の中の前後の空白も無視する。括弧の中に閉じ括弧を含められない。`]` と `<` の間や、`>` のあとに文字（空白を含む）があると、その行は誤り
- 見積と実績は 0 以上 100 未満の、小数第 2 位までの数値（全角の数字も可）。空にできる（AC-06）
- メモの行など、`■` でも `・` でも始まらない行は書けない（AC-07）

### 受け入れ基準

- **AC-effort-ingest-gas-01**: `Authorization: Bearer <API キー>` が環境変数 `API_KEY` と一致し、本文の `email` が登録済みのユーザーのメールアドレス（大文字小文字は区別しない）なら、そのユーザーの工数として保存し、`201 { "message": "Effort data processed and saved successfully" }` を返す
- **AC-effort-ingest-gas-02**: `Authorization` が無い、`Bearer ` で始まらない、API キーが違う、のどれかなら 401 `Unauthorized`。ユーザーのアクセストークン（JWT）でも 401
- **AC-effort-ingest-gas-03**: 本文が `{ date: "YYYY-MM-DD", email: <メールアドレス>, effort: <文字列> }` の形でないときは 400。メッセージは `<項目>: <検証のメッセージ>` を ` | ` でつないだもの（例: `date: ...`）。`email` に当たるユーザーがいないときは 400 `User not found`
- **AC-effort-ingest-gas-04**: 読めたタスクの行 1 つにつき、`work_records` に 1 行を `date` の日付で保存する。同じ内容の行が 2 つあれば 2 行になる。同じ日付で何度送っても、そのたびに追加する（上書きしない）
- **AC-effort-ingest-gas-05**: 案件は、そのユーザーの案件のうち名前が一致するものを使い、無ければ作る。タスクは、その案件のタスクのうち名前が一致するものを使い、無ければ作る。名前の比較は大文字小文字を区別する（1 回の送信の中でも。`ABC` と `abc` は別の案件、同じ案件の下の `Review` と `review` は別のタスク）。新しく作ったときは、案件とタスクの一覧のマテリアライズドビュー（`projects_with_tasks_mv`）を更新してから応答するので、応答の直後の `GET /api/projects` に新しい案件とタスクが出る
- **AC-effort-ingest-gas-06**: 見積と実績は、前後の空白を除き、全角の数字と全角のピリオド（`０`〜`９`、`．`）を半角に直したうえで、空か、`/^\d+(\.\d{1,2})?$/` に合う 100 未満の値（例: `2`、`1.5`、`0.25`、`99.99`、`２．５`）。見積が空なら見積なし（NULL）、実績が空なら 0 として保存する。それ以外（`1,5`、`1.5h`、`abc`、`-1`、`.5`、`100`、`99.995`、`1.2.3`）はその行の誤り（AC-07）。小数を第 2 位までに限るのは、DB の列（`numeric(4,2)`）が `99.995` を 100.00 に丸めて桁あふれの 500 になるため
- **AC-effort-ingest-gas-07**: 空の行は読み飛ばす。それ以外で次のどれかに当たる行があれば、**1 行も保存せずに**（DB に触れずに）400 を返す。メッセージは「工数のテキストに読めない行があります。」+ 半角空白 + 誤りのある行ごとの「`<行番号>行目: <理由>`」を ` / ` でつないだもの（行番号はテキストの 1 始まりの行。件数の上限は無い）。理由は 1 行に 1 つで、次の順に最初に当たったもの
  1. `■` でも `・` でも始まらない →「案件の行（■）でもタスクの行（・）でもありません」
  2. `■` の後ろが空 →「案件名がありません」
  3. 最初の案件の行より前のタスクの行 →「最初の案件の行より前にタスクの行があります」
  4. `・<タスク名>：[<見積>]<実績>` の形でない（`：` が半角、括弧が全角か欠けている、括弧の中に閉じ括弧がある、`>` のあとに文字がある、など）→「タスクの行の書式が正しくありません」
  5. タスク名が空か空白だけ（`・：[1]<2>` も）→「タスク名がありません」
  6. 見積が AC-06 に合わない →「見積は 0 以上 100 未満の、小数第 2 位までの数値にしてください」
  7. 実績が AC-06 に合わない →「実績は 0 以上 100 未満の、小数第 2 位までの数値にしてください」

  名前が空の案件の行（`■` だけ）の後ろ、次の正しい案件の行までのタスクの行は、3 として別に報告しない（4〜7 の誤りは報告する）。誤りが無く、タスクの行が 1 つも無いときは 400 `工数の値が不正です。登録件数が0件でした。`
- **AC-effort-ingest-gas-08**: この経路では、工数登録の完了メールを送らない（`GAS_EMAIL_ENDPOINT` を呼ばない。完了メールは Web の工数登録だけ。effort-entry）

## 画面と API

### 画面
該当なし（Google Form と GAS。GAS のサンプルは `docs/legacy/specs/design/08-logic.md` の「Google Apps Script サンプル」。GAS のコードはこのリポジトリに無い）

### API
| メソッドとパス | 認証 | 入力 | 出力 | 主なエラー |
| --- | --- | --- | --- | --- |
| `POST /api/effort` | API キー | `EffortRequestSchema`（`packages/api/src/features/effort/types.ts`） | `EffortResponseSchema` | 400、401、500 |

全エンドポイントは [docs/reference/api.md](../../reference/api.md)。入力のスキーマは shared ではなく api の中にある（Web からは使わないため）。パスの末尾に `/` を付けた `POST /api/effort/` は、このルートに当たらず Web 用のルートの JWT の検証に落ちて 401 になる。

## データ

- [work_records](../../reference/database.md#work_records): 読めたタスクの行ごとに 1 行。`work_date` は送られた日付、`hours` は実績、`estimated_hours` は見積（AC-06）。どちらも `numeric(4,2)`（99.99 まで。小数第 3 位以下は DB で丸める）。負の値を止める制約は DB には無く、読む段階（AC-06）で止める
- [projects](../../reference/database.md#projects)、[tasks](../../reference/database.md#tasks): 名前で探し、無ければ作る。案件はユーザーごと、タスクは案件ごとに名前が一意（大文字小文字を区別する）
- [projects_with_tasks_mv](../../reference/database.md#projects_with_tasks_mv): 新しい案件かタスクを作ったら、全行を保存したあとで 1 回更新する（`GET /api/projects` と Web の候補の一覧がここを読む）
- ユーザーは Auth の管理 API（`auth.admin.listUsers`）を 100 件ずつめくってメールアドレスで探す

## 設計不変条件

- **INV-1**: `POST /api/effort` は API キーで認証し、ユーザーは本文の `email` から決める。同じパスの下にある Web 用のルート（`/api/effort/*`、JWT）とは別の Hono のアプリにしていて、GAS 用のルートを**先に登録している**ので、こちらが先に応答して JWT の検証まで進まない。登録の順番を入れ替えたり、GAS 用のルートに JWT の検証をかけたりすると、Google Form からの取り込みがすべて 401 になる
- **INV-2**: API キーの照合に失敗したら、本文を読む前に 401 にする。順番を入れ替えると、キーを知らない人が、メールアドレスでユーザーが存在するかを確かめられる（400 `User not found` で区別できてしまう）
- **INV-3**: 保存する工数と案件には、`email` から決めたユーザーの ID を付け、案件はそのユーザーの中だけで探す。タスクは、そのユーザーの案件の ID の中だけで探す（service role で接続しているので RLS に守られない）。破ると、他人の案件に工数が付く
- **INV-4**: 書式（`■` の案件の行、`・<タスク名>：[<見積>]<実績>` のタスクの行）は、利用者の Google Form の入力と GAS が前提にしている。変えるときは、利用者への案内（Google Form の説明文）と GAS の更新を合わせて行い、本番に反映する前に済ませる。黙って変えると、それまでの書き方の送信がすべて 400 になり、1 行も登録されない（GAS が開発者にメールを送るだけで、利用者には届かない）
- **INV-5**: テキストは、保存を始める前に全部を読み、誤りが 1 つでもあれば DB に触れずに 400 を返す（読みながら保存しない）。破ると、書き間違いのある送信で前半の行だけが保存され、直して送り直すと 2 重になる

## エラー時の挙動

エラーの応答は、どれも `{ "error": <メッセージ>, "accessLogId": <番号> }`（Content-Type の件だけ例外）。GAS はステータスが 400 以上なら、応答の本文を付けて開発者にメールを送る（GAS のサンプルどおりなら）。

- 401、400: 受け入れ基準のとおり
- ユーザーの検索で Auth の管理 API が失敗したとき: 500 `Failed to look up user`（原因は `error_logs` に残る）。見つからないときは 400 `User not found`
- 本文が JSON として読めないとき: 500 `Internal Server Error`
- `Content-Type` が `application/json` でないとき: ユーザーの検索まで通ったあとで、検証ライブラリの既定の形の 400（`{ data, error: [...], success: false }`）。GAS のサンプルは `application/json` を付けている
- 読み終えたあとの、途中の行の保存で DB のエラーが起きたとき（通信の失敗など。数値の範囲は読む段階で止める）: 500 `Failed to save work record: <DB のメッセージ>`。**それまでの行は保存されたまま**残り、それまでに作った案件・タスクがあってもマテリアライズドビューは更新されない（次にビューが更新されるまで、`GET /api/projects` と Web の候補の一覧に出ない）
- 全行を保存したあとのマテリアライズドビューの更新に失敗したとき: 500。**全行は保存済み**なのに GAS はエラーのメールを送る
- どちらの 500 でも、利用者が同じ内容を送り直すと、保存済みの行は 2 重になる

## 既知の落とし穴

- **書き間違いのエラーは利用者に届かない**（AC-07）。400 のときに GAS が開発者にメールを送るだけで、送った本人には何も表示されない（GAS の側の仕様）。Google Form の説明文に書式を明記しておく（INV-4）
- **全角の括弧や半角の `：` は直さない**（AC-07 の 4）。全角にするのは数字とピリオドだけ（2026-10-15 の人間の判断）
- **400 のメッセージに件数の上限が無い**（AC-07）。長いメモを貼ると、メッセージ（とエラーのメールと `error_logs`）が長くなる
- **Web の工数登録とは大文字小文字の扱いが違う**: GAS の取り込みは 1 回の送信の中でも区別するが、Web の工数登録（`/api/effort/entries`）はまだまとめる（effort-entry の P6 の直しでそろえる）
- **送り直すと 2 重に登録される**（AC-04、エラー時の挙動）。同じ送信を見分ける仕組みが無い。途中の失敗で一部だけ残る点は、1 回の送信をまとめて保存する形に直す予定（P6）
- ユーザーの検索は、Auth の全ユーザーを 100 件ずつめくる。ユーザーが増えると遅くなる

## ポストモーテム

該当なし（移行時点まで、この機能の不具合の修正の記録は無い）

## テストとの対応

| AC | テスト | 種類 |
| --- | --- | --- |
| AC-effort-ingest-gas-01 | `packages/api/test/gas-effort.int.test.ts` | 結合 |
| AC-effort-ingest-gas-02 | `packages/api/test/gas-effort.int.test.ts` | 結合 |
| AC-effort-ingest-gas-03 | `packages/api/test/gas-effort.int.test.ts` | 結合 |
| AC-effort-ingest-gas-04 | `packages/api/test/gas-effort.int.test.ts`、`packages/api/src/features/effort/service.test.ts`（解析） | 結合、単体 |
| AC-effort-ingest-gas-05 | `packages/api/test/gas-effort.int.test.ts` | 結合 |
| AC-effort-ingest-gas-06 | `packages/api/test/gas-effort.int.test.ts`（保存される値）、`packages/api/src/features/effort/service.test.ts`（解析） | 結合、単体 |
| AC-effort-ingest-gas-07 | `packages/api/test/gas-effort.int.test.ts`、`packages/api/src/features/effort/service.test.ts`（誤りの行の種類と理由、行番号、メッセージ） | 結合、単体 |
| AC-effort-ingest-gas-03（Auth の障害の 500 と、見つからないときの 400） | `packages/api/src/middleware/auth.test.ts`（`createSupabaseClient` を差し替える） | 単体 |
| INV-5 | `packages/api/src/features/effort/service.test.ts`（呼ばれたら失敗する Supabase のクライアントで、DB に触れないこと）、`gas-effort.int.test.ts`（正しい行も保存されないこと） | 単体、結合 |
| AC-effort-ingest-gas-08 | `packages/api/test/gas-effort.int.test.ts` | 結合 |
| INV-1、INV-2、INV-3 | `packages/api/test/gas-effort.int.test.ts` | 結合 |
| 本物の Google Form と GAS からの送信 | 手動（`docs/testing/manual-checklist.md` の M-005） | 手動 |

保存の途中の DB の失敗で一部が残ることは、「全部保存か全部保存しないか」の改修でテストを書く。

## 変更履歴

| バージョン | 日付 | 内容 | 改修の記録 |
| --- | --- | --- | --- |
| v1.0.7 | 2026-10-14 | 移行時点の基準（仕様書を旧ドキュメントとコードから作成） | [v1.0.7-baseline](changes/v1.0.7-baseline.md) |
| v1.1.2 | 2026-10-15 | 書式と数値の誤りを 400 にして何も保存しない。全角の数字を受け付ける。1 回の送信の中でも大文字小文字を区別する。Auth の障害を 500 にする | [v1.1.2-strict-format](changes/v1.1.2-strict-format.md) |
