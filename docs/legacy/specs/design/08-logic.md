# ロジック

## 工数解析の正規表現

Googleフォームの「工数」テキストエリアから送信される複数行のテキストを解析し、`work_records`テーブルに保存する複数のレコードに変換する。

### 入力テキスト形式

```
■<案件名1>
・<タスク名1-1>：[<見積1-1>]<実績1-1>
・<タスク名1-2>：[<見積1-2>]<実績1-2>

■<案件名2>
・<タスク名2-1>：[<見積2-1>]<実績2-1>
```

### 解析ルール

1. テキスト全体を改行で分割する。
2. 行頭が `■` で始まる行を**案件**として解釈し、後続のタスク行のコンテキストとして保持する。
3. 行頭が `・` で始まる行を**タスク**として解釈し、正規表現を用いて各要素を抽出する。
   - **正規表現:** `^・(.+?)：\[(.*?)\]<(.*?)>`
   - **グループ1:** タスク名
   - **グループ2:** 見積工数（数値）。空文字列の場合は`null`とする。
   - **グループ3:** 実績工数（数値）。空文字列の場合は`null`とする。
4. 抽出した各情報と、案件名や `work_date` 等を組み合わせて、`work_records`テーブルに保存するレコードを生成する。

### 解析例

**入力:**

```
■案件マッチングツール
・データ抽出バッチ改修：[2]<2.5>
・フロント改修：[5.75]<3>
・バックエンド改修：[]<2.75>

■その他
・タスク管理：[0.25]<0.25>
```

**出力例:**

```json
[
  {
    "project_name": "案件マッチングツール",
    "task_name": "データ抽出バッチ改修",
    "estimated_hours": 2,
    "hours": 2.5
  },
  {
    "project_name": "案件マッチングツール",
    "task_name": "フロント改修",
    "estimated_hours": 5.75,
    "hours": 3
  },
  {
    "project_name": "案件マッチングツール",
    "task_name": "バックエンド改修",
    "estimated_hours": null,
    "hours": 2.75
  },
  {
    "project_name": "その他",
    "task_name": "タスク管理",
    "estimated_hours": 0.25,
    "hours": 0.25
  }
]
```

## Google Apps Script サンプル

Googleフォームのスクリプトエディタに設定するコードのサンプル。フォーム設定で「メールアドレスを収集する」を有効化していることを前提とする。

```javascript
function onSubmit(e) {
  const respondentEmail = e.response.getRespondentEmail();
  const data = {
    date: e.response.getItemResponses()[0].getResponse(),
    email: respondentEmail,
    effort: e.response.getItemResponses()[1].getResponse(),
  };

  const API_ENDPOINT = "YOUR_API_ENDPOINT";
  const API_KEY = "YOUR_API_KEY";
  const DEVELOPER_EMAIL = "your-developer-email@example.com";

  const options = {
    method: "post",
    contentType: "application/json",
    headers: { "Authorization": "Bearer " + API_KEY },
    payload: JSON.stringify(data),
    muteHttpExceptions: true,
  };

  try {
    const response = UrlFetchApp.fetch(API_ENDPOINT, options);
    const responseCode = response.getResponseCode();

    // 失敗したら開発者にメール通知
    if (responseCode >= 400) {
      const body = `工数登録でエラーが発生しました。\n\nUser: ${respondentEmail}\nCode: ${responseCode}\nResponse: ${response.getContentText()}`;
      MailApp.sendEmail(DEVELOPER_EMAIL, "工数登録エラー", body);
    }
  } catch (error) {
    // fetch自体の失敗
    MailApp.sendEmail(DEVELOPER_EMAIL, "工数登録API呼び出しエラー", error.toString());
  }
}
```

### ペイロードサンプル

```json
{
  "date": "2025-09-23",
  "email": "user.from.google.session@example.com",
  "effort": "■案件マッチングツール\n・データ抽出バッチ改修：[2]<2.5>\n・フロント改修：[5.75]<3>\n\n■その他\n・タスク管理：[0.25]<0.25>"
}
```

## 週報ロジック詳細

### 対象期間の算出

1. APIで受け取った日付 (`date`) を基点とし、属する週の月曜日を `startDate` として取得する。
2. `startDate` に4日を加算し、金曜日を `endDate` として得る。
3. `{ startDate, endDate }` を週報の対象期間とする。

### 目標進捗サマリーの算出

1. レポート対象週と期間が重複する目標のみを抽出する。
2. **単純平均進捗率:** 目標の `progress` の合計を対象件数で割る。
3. **加重達成率:** `SUM(progress * weight) / SUM(weight)` を計算する。
4. **期待値:** 各目標について `(経過日数 / 全期間日数) * 100` を求め、同じく `SUM(期待進捗率 * weight) / SUM(weight)` を計算する。
5. **期待値との差:** `加重達成率 - 期待値` を算出する。
6. **進捗差分:**
   - 個別目標: `週末時点の進捗率` から `週初時点の進捗率` を差し引く。
   - 全体 (単純平均): 週末と週初の単純平均進捗率の差分を取る。
   - 全体 (加重達成率): 週末と週初の加重達成率の差分を取る。
   - 前週末時点の値は `GET /api/goals/progress/previous-week` から取得し、履歴がない場合は目標本体の `progress` を使用する。

### 現在目標の概要指標計算

目標管理画面で表示する全体進捗率／加重進捗率は、取得済みの現在目標データを用いて以下の手順で算出する。

1. 対象データは最新期間に属する目標一覧（`GET /api/goals/current` のレスポンス）とする。
2. **全体進捗率 (`overallProgress`)**
   - `overallProgress = SUM(goal.progress) / goals.length`
   - 進捗率は0〜100、平均値も0〜100の範囲に収まる前提でクリップ処理は不要。
3. **加重進捗率 (`weightedProgress`)**
   - `weightedProgress = SUM(goal.progress * goal.weight / 100)`
   - 対象期間のウェイト合計が100%であり、進捗率が0〜100の範囲であるため100%を超過しない。
4. 計算ロジックは将来的に `packages/shared` へ移動し、APIおよびフロントエンド双方で共通利用できるユーティリティとして提供することを検討する。

## 工数入力フロー（Web UI）

1. ユーザーが工数入力画面で案件・タスク・工数・メモを編集するたびに、最新の入力状態を `PUT /api/effort/draft` に送信し、`work_entry_drafts` テーブルへ上書き保存する。
   - この際、クライアントは `clientUpdatedAt` に編集時刻（ISO8601）を付与し、サーバーは受信した時刻が既存値より新しい場合のみ保存する。
2. 画面読み込み時には `GET /api/projects`（案件・タスク取得）と `GET /api/effort/draft` を呼び出し、候補データを初期化するとともに、未送信の内容があればフォームへ復元する（ドラフトが存在しない場合は空状態から開始する）。ドラフトレスポンスには `client_updated_at` が含まれるため、クライアントは自分が保持する時刻と比較して最新か判定できる。
3. 送信ボタン押下で `POST /api/effort/entries` を実行し、正常終了した場合は `DELETE /api/effort/draft` を呼び出して該当ユーザーのドラフトを削除する。
4. `user_settings.notify_effort_email` が `true` の場合、バックエンドは入力内容を整形し、GAS メール送信APIへリクエストを送信する。件名は「yyyy/MM/dd 工数を登録しました」とし、本文は以下の構成で生成する。
   1. 日付: リクエストボディ `date`（登録対象日）を `yyyy/MM/dd` 形式で表示
   2. エントリ: 案件ごとにタスクの見積・実績・差分を表記（タスク名と数値情報は改行・インデントで見やすく整形）
      - 見積が未入力のタスクは `-` を表示し、集計でも対象案件/全体に見積が存在しない場合は `-` とする
      - 差分（±h）は見積が入力されているタスクのみを対象に算出する
   3. 集計: 案件別および全体の見積・実績・差分を表示（案件別は箇条書き形式）
      - 案件別・全体の差分も、見積を持つタスクに限った実績合計と見積合計との差で計算する
   4. メモ: 入力がある場合のみ掲載

   送信例:

   ```
   【日付】
   2025/01/10

   【工数】
   ■案件A
   ・タスクA
   　見積：2h   実績：2h（±0h）
   ・タスクB
   　見積：4h   実績：2h（-2h）

   ■案件B
   ・タスクA
   　見積：2h   実績：3h（+1h）
   ・タスクB
   　見積：-   実績：1h

   【集計】
   ■案件別
   ・案件A
   　見積：6h   実績：4h（-2h）
   ・案件B
   　見積：2h   実績：4h（+1h）

   ■全体
   見積：8h   実績：8h（-1h）

   【メモ】
   xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

   メール送信に失敗した場合は `error_logs` に記録し、登録処理自体は成功として扱う。
5. エラーが発生した場合はドラフトが残るため、ユーザーは再送信や内容の修正を継続できる。

## 工数一覧フロー

1. 工数一覧画面へ遷移したタイミングで、ブラウザの `localStorage` から前回保存した絞り込み条件（例: 期間の開始日・終了日、案件ID、タスクID）と並び替え条件を読み取る。保存済みの条件が存在する場合は、それらを `GET /api/reports/work-records` のクエリとして指定し初期データを取得する。条件が存在しない場合はデフォルト条件で API を実行する。
2. ユーザーが絞り込み内容を入力して「絞り込み」ボタンを押下した際には、最新の入力値をクエリに反映して `GET /api/reports/work-records` を再実行する。同時に、使用した絞り込み・並び替え条件を `localStorage` に保存し、次回遷移時の初期化に利用する。
3. 「クリア」ボタンが押下された場合は絞り込み条件を初期状態に戻し、条件なしで `GET /api/reports/work-records` を実行するとともに `localStorage` の条件を削除する。

## 過去目標検索フロー

1. 目標管理画面の「過去目標」タブへ遷移した際に、`localStorage` に保存されている検索条件（例: キーワード・期間・進捗率範囲・並び順）を参照し、値が存在する場合は `GET /api/goals/history` をその条件で実行する。保存がなければデフォルト条件で読み込む。
2. ユーザーが絞り込み条件を入力して「絞り込み」ボタンを押下した際には、フォームの内容をクエリとして `GET /api/goals/history` を呼び出し、レスポンスを反映する。同時に、適用した条件を `localStorage` に保存し、次回遷移時の初期表示に利用する。
3. 「クリア」ボタンが押下された場合は検索条件を初期化し、条件なしで `GET /api/goals/history` を実行すると同時に `localStorage` の保存内容を削除する。
