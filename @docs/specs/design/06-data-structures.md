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

## Web UI 工数登録ペイロード

工数登録画面から送信される構造化データは、案件・タスクのIDと名称、工数、メモを含む。IDが未設定の場合は名称を基に新規作成または既存レコードに紐付ける。

```typescript
import { z } from "zod";

const EffortEntrySchema = z.object({
  projectId: z.number().nullable(),
  projectName: z.string().nullable(),
  taskId: z.number().nullable(),
  taskName: z.string().nullable(),
  estimatedHours: z.number().nullable(),
  hours: z.number(),
});

export const EffortEntriesRequestSchema = z.object({
  date: z.coerce.date(),
  entries: z.array(EffortEntrySchema),
});

export type EffortEntriesRequest = z.infer<typeof EffortEntriesRequestSchema>;

> **Note:** 保存済みの案件・タスクは `projectId` / `taskId` のみ指定し、`projectName` / `taskName` は `null` とする。新規案件・タスクは ID を `null` にし、名称フィールドへ値を設定する。
```

## 工数ドラフト保存ペイロード

ドラフト保存APIは、最新の入力状態（エントリ配列とメモ）を受け取り、ユーザー単位で上書き保存する。

```typescript
export const EffortDraftSchema = EffortEntriesRequestSchema.extend({
  memo: z.string().nullable(),
  clientUpdatedAt: z.coerce.date(),
});

export type EffortDraft = z.infer<typeof EffortDraftSchema>;
```

> **Note:** ドラフトはユーザーごとに1件のみ保持し、`date` は現在編集中の日付を示すメタデータとして利用する。また `clientUpdatedAt` はクライアント側での最終編集時刻を示し、サーバーはこの値を用いて古いリクエストを棄却する。

## メール送信 API ペイロード

バックエンドがGASに送信するメールリクエスト／レスポンスのスキーマ。

```typescript
export const EmailRequestSchema = z.object({
  to: z.string().email(),
  subject: z.string(),
  body: z.string(),
  apikey: z.string(),
});

export const EmailResponseSchema = z.object({
  success: z.boolean(),
  status: z.number(),
  message: z.string(),
});

export type EmailRequest = z.infer<typeof EmailRequestSchema>;
export type EmailResponse = z.infer<typeof EmailResponseSchema>;

## ユーザー設定スキーマ

```typescript
export const CreateUserSettingsRequestSchema = z.object({
  notifyEffortEmail: z.boolean().optional(),
});

export const UserSettingsSchema = z.object({
  id: z.number(),
  userId: z.string().uuid(),
  notifyEffortEmail: z.boolean(),
  updatedAt: z.coerce.date(),
});

export type CreateUserSettingsRequest = z.infer<
  typeof CreateUserSettingsRequestSchema
>;
export type UserSettings = z.infer<typeof UserSettingsSchema>;
```
```

## 目標データペイロード

目標の作成・更新・取得で利用する共通スキーマ。

```typescript
export const GoalSchema = z.object({
  id: z.number(),
  userId: z.string().uuid(),
  title: z.string(),
  content: z.string().nullable(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  weight: z.number(),
  progress: z.number(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Goal = z.infer<typeof GoalSchema>;

export const CreateGoalSchema = z.object({
  title: z.string(),
  content: z.string().nullable(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  weight: z.number(),
});

export const UpdateGoalSchema = z.object({
  title: z.string(),
  content: z.string().nullable(),
  weight: z.number(),
  progress: z.number(),
});

export const GoalHistoryQuerySchema = z.object({
  query: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  minProgress: z.number().min(0).max(100).optional(),
  maxProgress: z.number().min(0).max(100).optional(),
  sort: z.enum([
    "title",
    "-title",
    "weight",
    "-weight",
    "progress",
    "-progress",
    "start_date",
    "-start_date",
    "end_date",
    "-end_date",
  ]).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export type CreateGoalRequest = z.infer<typeof CreateGoalSchema>;
export type UpdateGoalRequest = z.infer<typeof UpdateGoalSchema>;
export type GoalHistoryQuery = z.infer<typeof GoalHistoryQuerySchema>;
```

> **Note:** `minProgress` と `maxProgress` を同時に指定する場合は `minProgress <= maxProgress` を満たす必要がある。

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
