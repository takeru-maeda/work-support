# Work Support API Documentation

## Endpoints

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
