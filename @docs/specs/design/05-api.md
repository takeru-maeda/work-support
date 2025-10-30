# API設計

## 一覧

| Method | Endpoint | 認証 | 説明 |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/effort` | 固定APIキー | **工数登録**: 外部からのHTTPリクエストを受信し、工数を登録する。 |
| `GET` | `/api/effort/draft` | JWT | **工数ドラフト取得**: 保存済みの工数ドラフトを取得する。 |
| `PUT` | `/api/effort/draft` | JWT | **工数ドラフト保存**: 入力途中の工数内容を一時保存する。 |
| `DELETE` | `/api/effort/draft` | JWT | **工数ドラフト削除**: 送信完了後に一時保存された工数内容を削除する。 |
| `POST` | `/api/effort/entries` | JWT | **工数登録（構造化）**: Web UIから送信された構造化データを保存する。 |
| `GET` | `/api/goals/current` | JWT | **目標取得**: `end_date`が最も未来日に設定されている期間の目標群を取得する。 |
| `GET` | `/api/goals/history` | JWT | **過去目標取得**: 条件に応じてユーザーの過去目標を検索する。 |
| `GET` | `/api/goals/progress/previous-week` | JWT | **前週進捗取得**: 前週末時点の最新進捗率を取得する。 |
| `POST` | `/api/goals` | JWT | **目標作成**: 新しい目標を作成する。 |
| `PUT` | `/api/goals/:id` | JWT | **目標更新**: 指定したIDの目標を更新する。 |
| `DELETE`| `/api/goals/:id` | JWT | **目標削除**: 指定したIDの目標を削除する。 |
| `GET` | `/api/missions` | JWT | **ミッション取得**: 現在のミッションを取得する。 |
| `PUT` | `/api/missions` | JWT | **ミッション更新**: ミッションを更新する。 |
| `POST` | `/api/user-settings` | JWT | **ユーザー設定作成**: 新規ユーザーの通知設定を登録する。 |
| `GET` | `/api/projects` | JWT | **案件取得**: ユーザーに紐づく案件マスターを取得する。 |
| `GET` | `/api/reports/weekly` | JWT | **週報生成**: 指定された日付 (`?date=YYYY-MM-DD`) が属する週の月曜〜金曜の週報データを生成して返す。 |
| `GET` | `/api/tasks` | JWT | **タスク取得**: ユーザーに紐づくタスクマスターを取得する。 |

## エンドポイント詳細

### POST /api/effort

**Description:** 工数を登録します

**Request Body:**

```json
{
  "date": "string (date)",
  "email": "string (email)",
  "effort": "string"
}
```

**Responses:**

- **201:** Effort data saved successfully

  ```json
  {
    "message": "string"
  }
  ```

---

### GET /api/effort/draft

**Description:** 保存済みの工数ドラフトを取得します

**Responses:**

- **200:** Draft fetch successfully

  ```json
  {
    "draft": {
      "entries": [
        {
          "project_id": "number | null",
          "project_name": "string | null",
          "task_id": "number | null",
          "task_name": "string | null",
          "estimated_hours": "number | null",
          "hours": "number"
        }
      ],
      "memo": "string | null",
      "date": "string (date) | null",
      "updated_at": "string (date-time)",
      "client_updated_at": "string (date-time)"
    }
  }
  ```

- **204:** Draft not found

---

### PUT /api/effort/draft

**Description:** 入力途中の工数情報を保存します

**Request Body:**

```json
{
  "date": "string (date)",
  "entries": [
    {
      "project_id": "number | null",
      "project_name": "string | null",
      "task_id": "number | null",
      "task_name": "string | null",
      "estimated_hours": "number | null",
      "hours": "number"
    }
  ],
  "memo": "string | null",
  "clientUpdatedAt": "string (date-time)"
}
```

**Responses:**

- **200:** Draft saved successfully

  ```json
  {
    "draft": {
      "user_id": "string (uuid)",
      "date": "string (date)",
      "updated_at": "string (date-time)"
    },
    "applied": "boolean"
  }
  ```

- **200:** Draft ignored (stale request)

  ```json
  {
    "applied": "boolean",
    "reason": "string"
  }
  ```

> **Note:** サーバーは `clientUpdatedAt` が既存の `client_updated_at` より新しい場合のみドラフトを書き換える。

---

### DELETE /api/effort/draft

**Description:** 一時的に保存された工数情報を削除します

**Responses:**

- **204:** Draft deleted successfully

---

### POST /api/effort/entries

**Description:** Web UIから送信された工数エントリを保存します

**Request Body:**

```json
{
  "date": "string (date)",
  "entries": [
    {
      "project_id": "number | null",
      "project_name": "string | null",
      "task_id": "number | null",
      "task_name": "string | null",
      "estimated_hours": "number | null",
      "hours": "number | null"
    }
  ]
}
```

> **Note:** `project_id` / `task_id` 優先で保存し、IDが指定されない場合は `project_name` / `task_name` を元に生成または紐付けする。
> **Note:** 保存済みの案件・タスクは `project_id` / `task_id` を指定し、名称フィールドは `null` とする。新規案件・タスクを登録する場合は ID を `null` とし、`project_name` / `task_name` に値を指定する。

**Responses:**

- **201:** Effort entries saved successfully

  ```json
  {
    "saved": [
      {
        "entry_id": "number",
        "project_id": "number",
        "task_id": "number",
        "hours": "number",
        "estimated_hours": "number | null"
      }
    ]
  }
  ```

---

### GET /api/goals/current

**Description:** 最新の目標のリストを取得します

**Responses:**

- **200:** Goal data fetch successfully

  ```json
  {
    "goals": [
      {
        "id": "number",
        "user_id": "string (uuid)",
        "title": "string",
        "content": "string | null",
        "start_date": "string (date)",
        "end_date": "string (date)",
        "progress": "number",
        "weight": "number",
        "created_at": "string (date-time)",
        "updated_at": "string (date-time)"
      }
    ]
  }
  ```

---

### POST /api/goals

**Description:** 目標を新規作成します

**Request Body:**

```json
{
  "title": "string",
  "content": "string",
  "start_date": "string (date)",
  "end_date": "string (date)",
  "weight": "number"
}
```

**Responses:**

- **201:** Goal data create successfully

  ```json
  {
    "created": {
      "id": "number",
      "user_id": "string (uuid)",
      "title": "string",
      "content": "string",
      "start_date": "string (date)",
      "end_date": "string (date)",
      "progress": "number",
      "weight": "number",
      "created_at": "string (date-time)",
      "updated_at": "string (date-time)"
    }
  }
  ```

> **Note:** 既存の目標期間よりも未来の期間でなければ作成できない。保存後に `start_date` / `end_date` は変更不可であることを呼び出し側に警告する。

---

### PUT /api/goals/{id}

**Description:** 目標を更新します

**Path Parameters:**

- `id` (string, required)

**Request Body:**

```json
{
  "title": "string",
  "weight": "number",
  "progress": "number",
  "content": "string | null"
}
```

**Responses:**

- **200:** Goal data update successfully

  ```json
  {
    "updated": {
      "id": "number",
      "user_id": "string (uuid)",
      "title": "string",
      "content": "string | null",
      "start_date": "string (date)",
      "end_date": "string (date)",
      "progress": "number",
      "weight": "number",
      "created_at": "string (date-time)",
      "updated_at": "string (date-time)"
    }
  }
  ```

> **Note:** `start_date` と `end_date` は更新不可。リクエストに含めないこと。

---

### DELETE /api/goals/{id}

**Description:** 目標を削除します

**Path Parameters:**

- `id` (string, required)

**Responses:**

- **204:** Goal data delete successfully

---

### GET /api/goals/history

**Description:** 過去の目標を検索します

**Query Parameters:**

- `query` (string, optional) — タイトル／内容の部分一致検索キーワード
- `startDate` (string (date), optional) — 期間フィルタの開始日
- `endDate` (string (date), optional) — 期間フィルタの終了日
- `minProgress` (number, optional) — 進捗率の下限 (0-100)
- `maxProgress` (number, optional) — 進捗率の上限 (0-100)
- `sort` (string, optional, default: `-end_date`) — 並び順。`title`, `-title`, `weight`, `-weight`, `progress`, `-progress`, `start_date`, `-start_date`, `end_date`, `-end_date` を想定
- `page` (number, optional, default: `1`) — ページ番号（1始まり）
- `pageSize` (number, optional, default: `20`, max: `100`) — 1ページ当たり件数

**Responses:**

- **200:** Goal history fetch successfully

  ```json
  {
    "items": [
      {
        "id": "number",
        "user_id": "string (uuid)",
        "title": "string",
        "content": "string | null",
        "start_date": "string (date)",
        "end_date": "string (date)",
        "weight": "number",
        "progress": "number",
        "created_at": "string (date-time)",
        "updated_at": "string (date-time)"
      }
    ],
    "meta": {
      "page": "number",
      "pageSize": "number",
      "total": "number",
      "totalPages": "number"
    }
  }
  ```

> **Note:** `minProgress` と `maxProgress` は0〜100の範囲で指定し、両方指定された場合は `minProgress <= maxProgress` を満たす必要がある。

---

### GET /api/goals/progress/previous-week

**Description:** 前週末時点の最新進捗率を取得します

**Query Parameters:**

- `referenceDate` (string (date), required) — 週を決定する基準日。指定週の前週末（`referenceDate` を含む週の開始日前日の金曜日）までの進捗が取得対象。

**Responses:**

- **200:** Previous week progress fetch successfully

  ```json
  {
    "referenceDate": "string (date)",
    "previousWeekEnd": "string (date)",
    "progress": [
      {
        "goal_id": "number",
        "progress": "number",
        "recorded_at": "string (date)",
        "source": "string"
      }
    ]
  }
  ```

> **Note:** `source` は `"history"`（履歴テーブル由来）または `"goal"`（ゴール本体由来）のいずれか。進捗履歴が存在しない場合は後者を返す。

---

### POST /api/logs/error

**Description:** フロントエンドや外部クライアントで発生したエラーをサーバーに記録します

**Request Body:**

```json
{
  "message": "string",
  "stackTrace": "string | null",
  "level": "ERROR | CRITICAL | WARNING",
  "source": "API | UI",
  "userAgent": "string | null",
  "pageUrl": "string | null",
  "appVersion": "string | null",
  "clientContext": {
    "key": "any"
  }
}
```

> **Note:** `source` は `API` / `UI` のみを受け付ける。`clientContext` は任意キーを持つ JSON オブジェクトで、必要に応じて空オブジェクトを送信する。

**Responses:**

- **201:** Error log recorded successfully

  ```json
  {
    "id": "number",
    "recordedAt": "string (date-time)"
  }
  ```

---

### GET /api/missions

**Description:** ミッションを取得します

**Responses:**

- **200:** Mission data fetch successfully

  ```json
  {
    "mission": {
      "id": "number",
      "user_id": "string (uuid)",
      "content": "string | null",
      "updated_at": "string (date-time)"
    }
  }
  ```

---

### PUT /api/missions

**Description:** ミッションを更新します

**Request Body:**

```json
{
  "content": "string"
}
```

**Responses:**

- **200:** Mission data update successfully

  ```json
  {
    "mission": {
      "id": "number",
      "user_id": "string (uuid)",
      "content": "string | null",
      "updated_at": "string (date-time)"
    }
  }
  ```

---

### POST /api/user-settings

**Description:** 認証済みユーザーの通知設定を初期化します（サインアップ直後に呼び出す）

**Request Body:** なし（空のリクエストボディを受け付ける）

**Responses:**

- **201:** User settings created successfully

  ```json
  {
    "user_settings": {
      "id": "number",
      "notify_effort_email": "boolean",
      "updated_at": "string (date-time)"
    }
  }
  ```

---

### GET /api/projects

**Description:** ユーザーに紐づく案件を取得します

**Responses:**

- **200:** Projects fetch successfully

  ```json
  {
    "projects": [
      {
        "id": "number",
        "name": "string",
        "created_at": "string (date-time)"
      }
    ]
  }
  ```

---

### GET /api/reports/weekly

**Description:** 週報の雛形を生成します

**Query Parameters:**

- `date` (string (date), required)

**Responses:**

- **200:** Weekly report generate successfully

  ```json
  {
    "mission": "string | null",
    "weeklyReport": "string"
  }
  ```

---

### GET /api/tasks

**Description:** ユーザーに紐づくタスクを取得します

**Responses:**

- **200:** Tasks fetch successfully

  ```json
  {
    "tasks": [
      {
        "id": "number",
        "project_id": "number",
        "project_name": "string",
        "name": "string",
        "created_at": "string (date-time)"
      }
    ]
  }
  ```
