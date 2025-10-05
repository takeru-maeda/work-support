# API設計

## 一覧

| Method | Endpoint | 認証 | 説明 |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/effort` | 固定APIキー | **工数登録**: 外部からのHTTPリクエストを受信し、工数を登録する。 |
| `GET` | `/api/reports/weekly` | JWT | **週報生成**: 指定された日付 (`?date=YYYY-MM-DD`) が属する週の月曜〜金曜の週報データを生成して返す。 |
| `GET` | `/api/missions` | JWT | **ミッション取得**: 現在のミッションを取得する。 |
| `PUT` | `/api/missions` | JWT | **ミッション更新**: ミッションを更新する。 |
| `GET` | `/api/goals` | JWT | **目標取得**: `end_date`が最も未来日に設定されている期間の目標群を取得する。 |
| `POST` | `/api/goals` | JWT | **目標作成**: 新しい目標を作成する。 |
| `PUT` | `/api/goals/:id` | JWT | **目標更新**: 指定したIDの目標を更新する。 |
| `DELETE`| `/api/goals/:id` | JWT | **目標削除**: 指定したIDの目標を削除する。 |

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

### GET /api/goals

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
      "start_date": "string (date)",
      "end_date": "string (date)",
      "progress": "number",
      "weight": "number",
      "created_at": "string (date-time)",
      "updated_at": "string (date-time)"
    }
  }
  ```

---

### PUT /api/goals/{id}

**Description:** 目標を更新します

**Path Parameters:**

- `id` (string, required)

**Request Body:**

```json
{
  "title": "string",
  "start_date": "string (date)",
  "end_date": "string (date)",
  "weight": "number",
  "progress": "number"
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
      "start_date": "string (date)",
      "end_date": "string (date)",
      "progress": "number",
      "weight": "number",
      "created_at": "string (date-time)",
      "updated_at": "string (date-time)"
    }
  }
  ```

---

### DELETE /api/goals/{id}

**Description:** 目標を削除します

**Path Parameters:**

- `id` (string, required)

**Responses:**

- **204:** Goal data delete successfully

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
