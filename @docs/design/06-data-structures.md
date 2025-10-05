# データ構造

## Googleフォーム リクエストペイロード

Googleフォームからの送信は、Google Apps Scriptを利用してPOSTリクエストを送信することで実現する。フォームの質問は「日付」と「工数」の2つのみとする。

```typescript
import { z } from "zod";

// Googleフォームからのリクエストペイロードのスキーマ
export const EffortRequestSchema = z.object({
  date: z.coerce.date(),
  email: z.email(),
  effort: z.string(),
});

export type EffortRequest = z.infer<typeof EffortRequestSchema>;
```

詳細な解析処理やサンプルコードは `08-appendix.md` を参照。

## 週報対象期間の算出ロジック

`GET /api/reports/weekly` エンドポイントで利用される、週報の対象期間（月曜日〜金曜日）を算出するロジックは以下の手順で構成する。

1. APIリクエストで受け取った日付 (`date` パラメータ) を基点とする。
2. その日付が属する週の月曜日を取得する（週の始まりは月曜日として計算）。
3. 算出した月曜日の日付を `startDate` とする。
4. `startDate` に4日を加算した日付を `endDate` (金曜日) とする。
5. `{ startDate, endDate }` をレポートの対象期間とする。

## 目標進捗サマリーの算出ロジック

週報で表示する「目標進捗サマリー」の指標を算出する際の前提と計算式。

- **前提:** 計算対象は、レポート対象週と期間が重複する目標のみ。
- **単純平均進捗率:** `対象目標のprogressの合計値 / 対象目標の数`。
- **加重達成率:** `SUM(progress * weight) / SUM(weight)`。
- **期待値:** 目標ごとに `(経過日数 / 全期間日数) * 100` を算出し、`SUM(期待進捗率 * weight) / SUM(weight)` とする。
- **期待値との差:** `加重達成率 - 期待値`。
- **進捗差分:**
  - 個別の目標: `週末時点の進捗率` - `週初時点の進捗率`。
  - 全体 (単純平均): `週末時点の単純平均進捗率` - `週初時点の単純平均進捗率`。
  - 全体 (加重達成率): `週末時点の加重達成率` - `週初時点の加重達成率`。

計算過程の詳細は `08-appendix.md` の「週報ロジック詳細」を参照。

