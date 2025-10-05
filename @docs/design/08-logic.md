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

