# データベース設計

## 型定義 (Type Definitions)

### `log_level` (ENUM)

ログの種類を管理するための列挙型。

**定義SQL:**
```sql
CREATE TYPE log_level AS ENUM ('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL');
```

**使用箇所:**
*   `info_logs.level`
*   `error_logs.level`

### `log_source` (ENUM)

エラー発生元を管理するための列挙型。

**定義SQL:**
```sql
CREATE TYPE log_source AS ENUM ('API', 'UI');
```

**使用箇所:**
*   `error_logs.source`

---

## テーブル設計

データベースのテーブル設計。主キー（PK）、外部キー（FK）、NULL許容、ユニーク制約（UNIQUE）についても記載する。

### `users` (ユーザー)

Supabaseの認証機能が提供する `auth.users` テーブルをそのまま利用する。

### `projects` (案件)

案件名を管理するマスターデータ。

| カラム名 | データ型 | PK/FK | NULL | UNIQUE | 説明 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | BIGINT | PK | N | Y | 識別子 |
| `user_id` | UUID | FK | N | N | `auth.users.id` への参照 (削除時はCASCADE) |
| `name` | TEXT | | N | N | 案件名 (ユーザー内でユニーク) |
| `created_at` | TIMESTAMPTZ | | N | N | 作成日時 |

### `tasks` (タスク)

タスク名を管理するマスターデータ。

| カラム名 | データ型 | PK/FK | NULL | UNIQUE | 説明 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | BIGINT | PK | N | Y | 識別子 |
| `project_id` | BIGINT | FK | N | N | `projects.id` への参照 (削除時はCASCADE) |
| `name` | TEXT | | N | N | タスク名 (案件内でユニーク) |
| `created_at` | TIMESTAMPTZ | | N | N | 作成日時 |

### `work_records` (工数記録)

日々の工数記録を保存する。

| カラム名 | データ型 | PK/FK | NULL | UNIQUE | 説明 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | BIGINT | PK | N | Y | 識別子 |
| `user_id` | UUID | FK | N | N | `auth.users.id` への参照 (削除時はCASCADE) |
| `task_id` | BIGINT | FK | N | N | `tasks.id` への参照 (削除時はCASCADE) |
| `work_date` | DATE | | N | N | 作業日 |
| `hours` | NUMERIC(4,2) | | N | N | 実績工数（時間） |
| `estimated_hours` | NUMERIC(4,2) | | Y | N | 見積工数（時間） |
| `created_at` | TIMESTAMPTZ | | N | N | 作成日時 |

#### ビュー: `work_record_diffs`

保存済み工数と見積との差分を検索・ソートしやすくするための派生ビュー。案件名・タスク名も含める。

```sql
CREATE VIEW work_record_diffs AS
SELECT
  wr.id,
  wr.user_id,
  wr.task_id,
  t.project_id,
  wr.work_date,
  wr.hours,
  wr.estimated_hours,
  CASE
    WHEN wr.estimated_hours IS NULL THEN NULL
    ELSE wr.hours - wr.estimated_hours
  END AS hours_diff,
  wr.created_at,
  t.name AS task_name,
  p.name AS project_name
FROM work_records AS wr
JOIN tasks AS t ON t.id = wr.task_id
JOIN projects AS p ON p.id = t.project_id;
```

- `project_id` を含めることで API 側で案件 ID 絞り込みが行える。
- `hours_diff` は実績 (`hours`) と見積 (`estimated_hours`) の差分（実績 - 見積）を表し、見積が未入力 (`NULL`) の場合は `NULL` を返す。
- 案件名・タスク名をビューに含めることで、`ORDER BY` や `LIKE` 検索を単純化する。
- ビューに対して `hours_diff` を用いた並び替えや範囲検索を行い、必要に応じて関数インデックスを追加する。

### `work_entry_drafts` (工数ドラフト)

工数入力画面で送信前の内容をユーザー単位で一時的に保存する。

| カラム名 | データ型 | PK/FK | NULL | UNIQUE | 説明 | 備考 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | BIGINT | PK | N | Y | 識別子 | |
| `user_id` | UUID | FK | N | Y | `auth.users.id` への参照 (削除時はCASCADE) | ユーザーごとに1件のみ保持 |
| `entries` | JSONB | | N | N | 工数エントリ配列（案件・タスク・工数・メモ、編集中の日付などを含む） | |
| `memo` | TEXT | | Y | N | 補足メモ | |
| `client_updated_at` | TIMESTAMPTZ | | N | N | クライアント側での最終編集時刻 | |
| `updated_at` | TIMESTAMPTZ | | N | N | 最終更新日時 | `NOW()` デフォルト |

### `missions` (ミッション)

ユーザーごとのミッションを保存する。

| カラム名 | データ型 | PK/FK | NULL | UNIQUE | 説明 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | BIGINT | PK | N | Y | 識別子 |
| `user_id` | UUID | FK | N | Y | `auth.users.id` への参照 (削除時はCASCADE) |
| `content` | TEXT | | Y | N | ミッションの内容 |
| `updated_at` | TIMESTAMPTZ | | N | N | 更新日時 |

### `goals` (目標)

ユーザーごとの目標を複数保存する。

| カラム名 | データ型 | PK/FK | NULL | UNIQUE | 説明 | 備考 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | BIGINT | PK | N | Y | 識別子 | |
| `user_id` | UUID | FK | N | N | `auth.users.id` への参照 (削除時はCASCADE) | |
| `title` | TEXT | | N | N | 目標のタイトル | |
| `content` | TEXT | | N | N | 目標の詳細内容 | |
| `start_date` | DATE | | N | N | 目標の開始日 | |
| `end_date` | DATE | | N | N | 目標の終了日 | |
| `weight` | NUMERIC(5, 2) | | N | N | 重み (0-100) | `CHECK (weight >= 0 AND weight <= 100)` |
| `progress` | NUMERIC(5, 2) | | N | N | 進捗率 (0-100) | `CHECK (progress >= 0 AND progress <= 100)` |
| `created_at` | TIMESTAMPTZ | | N | N | 作成日時 | |
| `updated_at` | TIMESTAMPTZ | | N | N | 更新日時 | |

### `goal_progress_histories` (目標進捗履歴)

目標の進捗率の変更履歴を保存する。

| カラム名 | データ型 | PK/FK | NULL | UNIQUE | 説明 | 備考 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | BIGINT | PK | N | Y | 識別子 | |
| `goal_id` | BIGINT | FK | N | N | `goals.id` への参照 (削除時はCASCADE) | |
| `progress` | NUMERIC(5, 2) | | N | N | 記録時の進捗率 (0-100) | `CHECK (progress >= 0 AND progress <= 100)` |
| `recorded_at`| DATE | | N | N | 記録日 | |

### `access_logs` (アクセスログ)

全てのリクエスト・レスポンスのメタ情報を記録する。

| カラム名 | データ型 | PK/FK | NULL | UNIQUE | 説明 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | BIGINT | PK | N | Y | 識別子 |
| `user_id` | UUID | FK | Y | N | `auth.users.id` への参照 (認証前はNULL / 削除時はSET NULL) |
| `ip_address` | INET | | Y | N | 送信元IPアドレス |
| `path` | TEXT | | N | N | リクエストパス |
| `status_code` | INT | | Y | N | レスポンスのステータスコード |
| `received_at` | TIMESTAMPTZ | | N | N | リクエスト受信日時 |
| `duration_ms` | INT | | Y | N | 処理時間（ミリ秒） |

### `info_logs` (情報ログ)

ビジネスロジックで利用する情報ログ。

| カラム名 | データ型 | PK/FK | NULL | UNIQUE | 説明 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | BIGINT | PK | N | Y | 識別子 |
| `access_log_id`| BIGINT | FK | N | N | `access_logs.id` への参照 (削除時はCASCADE) |
| `level` | `log_level` | | N | N | ログレベル (→ 型定義) |
| `message` | TEXT | | N | N | ログメッセージ |
| `timestamp` | TIMESTAMPTZ | | N | N | 記録日時 |

### `error_logs` (エラーログ)

処理中に発生したエラー情報を記録する。

| カラム名 | データ型 | PK/FK | NULL | UNIQUE | 説明 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | BIGINT | PK | N | Y | 識別子 |
| `access_log_id`| BIGINT | FK | N | N | `access_logs.id` への参照 (削除時はCASCADE) |
| `level` | `log_level` | | N | N | ログレベル (→ 型定義) |
| `message` | TEXT | | N | N | エラーメッセージ |
| `stack_trace` | TEXT | | Y | N | スタックトレース |
| `source` | `log_source` | | N | N | エラー発生元 (`API` / `UI`) | `DEFAULT 'API'` |
| `user_agent` | TEXT | | Y | N | クライアントの User-Agent |
| `page_url` | TEXT | | Y | N | エラーが発生したページ URL |
| `app_version` | TEXT | | Y | N | フロントエンドのバージョンやリリース識別子 |
| `client_context` | JSONB | | Y | N | UI 側で収集した任意のメタ情報 |
| `timestamp` | TIMESTAMPTZ | | N | N | 記録日時 |

---

### `user_settings` (ユーザー設定)

メール通知などユーザー単位の設定を保持する。

| カラム名 | データ型 | PK/FK | NULL | UNIQUE | 説明 | 備考 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | BIGINT | PK | N | Y | 識別子 | `GENERATED ALWAYS AS IDENTITY` |
| `user_id` | UUID | FK | N | Y | `auth.users.id` への参照 (削除時はCASCADE) | ユーザーごとに1件 |
| `notify_effort_email` | BOOLEAN | | N | N | 工数登録完了時にメール通知を行うかどうか | `DEFAULT TRUE` |
| `updated_at` | TIMESTAMPTZ | | N | N | 最終更新日時 | `DEFAULT NOW()` |

---

## インデックス設計

クエリのパフォーマンスを向上させるため、以下のインデックスを追加することを推奨します。主キー(PK)には自動的にユニークインデックスが作成されるため、ここでは記載を省略します。

*   **`projects`**
    *   `user_id`: 特定ユーザーの案件を一覧表示するため。
    *   `(user_id, name)`【複合ユニークインデックス】: ユーザー内で案件名の一意性を担保しつつ、検索を高速化するため。

*   **`tasks`**
    *   `project_id`: 特定の案件に紐づくタスクを一覧表示するため。
    *   `(project_id, name)`【複合ユニークインデックス】: 案件内でタスク名の一意性を担保しつつ、検索を高速化するため。

*   **`work_records`**
    *   `task_id`: 特定タスクの工数記録を検索するため。
    *   `(user_id, work_date)`【複合インデックス】: 週報機能などで、特定ユーザーの特定期間の工数記録を高速に検索するため。
*   **`work_entry_drafts`**
    *   `user_id`【ユニークインデックス】: ユーザーごとにドラフトを1件に制限し、高速に取得するため。

*   **`missions`**
    *   `user_id`: 特定ユーザーのミッションを検索するため。（このカラムにはUNIQUE制約があるため、既にユニークインデックスが自動で作成されます）

*   **`goals`**
    *   `user_id`: 特定ユーザーの目標を一覧表示するため。

*   **`goal_progress_histories`**
    *   `(goal_id, recorded_at)`【複合インデックス】: 特定目標の進捗履歴を期間で絞り込んで検索・表示するため。

*   **`access_logs`**
    *   `user_id`: 特定ユーザーのアクセスログを検索するため。
    *   `received_at`: 特定期間のアクセスログを検索するため。
    *   `path`: 特定のエンドポイントへのアクセスを分析するため。
    *   `status_code`: エラーレスポンス（4xx, 5xx系）のログを効率的に検索するため。

*   **`info_logs`**
    *   `access_log_id`: 親となるアクセスログから情報ログを引くため。

*   **`error_logs`**
    *   `access_log_id`: 親となるアクセスログからエラーログを引くため。
*   **`user_settings`**
    *   `user_id`【ユニークインデックス】: ユーザーと設定を1対1に紐付けるため。
