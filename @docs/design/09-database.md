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
| `user_id` | UUID | FK | N | N | `auth.users.id` への参照 |
| `name` | TEXT | | N | N | 案件名 (ユーザー内でユニーク) |
| `created_at` | TIMESTAMPTZ | | N | N | 作成日時 |

### `tasks` (タスク)

タスク名を管理するマスターデータ。

| カラム名 | データ型 | PK/FK | NULL | UNIQUE | 説明 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | BIGINT | PK | N | Y | 識別子 |
| `project_id` | BIGINT | FK | N | N | `projects.id` への参照 |
| `name` | TEXT | | N | N | タスク名 (案件内でユニーク) |
| `created_at` | TIMESTAMPTZ | | N | N | 作成日時 |

### `work_records` (工数記録)

日々の工数記録を保存する。

| カラム名 | データ型 | PK/FK | NULL | UNIQUE | 説明 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | BIGINT | PK | N | Y | 識別子 |
| `user_id` | UUID | FK | N | N | `auth.users.id` への参照 |
| `task_id` | BIGINT | FK | N | N | `tasks.id` への参照 |
| `work_date` | DATE | | N | N | 作業日 |
| `hours` | NUMERIC(4,2) | | N | N | 実績工数（時間） |
| `estimated_hours` | NUMERIC(4,2) | | Y | N | 見積工数（時間） |
| `created_at` | TIMESTAMPTZ | | N | N | 作成日時 |

### `missions` (ミッション)

ユーザーごとのミッションを保存する。

| カラム名 | データ型 | PK/FK | NULL | UNIQUE | 説明 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | BIGINT | PK | N | Y | 識別子 |
| `user_id` | UUID | FK | N | Y | `auth.users.id` への参照 |
| `content` | TEXT | | Y | N | ミッションの内容 |
| `updated_at` | TIMESTAMPTZ | | N | N | 更新日時 |

### `goals` (目標)

ユーザーごとの目標を複数保存する。

| カラム名 | データ型 | PK/FK | NULL | UNIQUE | 説明 | 備考 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | BIGINT | PK | N | Y | 識別子 | |
| `user_id` | UUID | FK | N | N | `auth.users.id` への参照 | |
| `title` | TEXT | | N | N | 目標のタイトル | |
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
| `goal_id` | BIGINT | FK | N | N | `goals.id` への参照 | |
| `progress` | NUMERIC(5, 2) | | N | N | 記録時の進捗率 (0-100) | `CHECK (progress >= 0 AND progress <= 100)` |
| `recorded_at`| DATE | | N | N | 記録日 | |

### `access_logs` (アクセスログ)

全てのリクエスト・レスポンスのメタ情報を記録する。

| カラム名 | データ型 | PK/FK | NULL | UNIQUE | 説明 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | BIGINT | PK | N | Y | 識別子 |
| `user_id` | UUID | FK | Y | N | `auth.users.id` への参照 (認証前はNULL) |
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
| `access_log_id`| BIGINT | FK | N | N | `access_logs.id` への参照 |
| `level` | `log_level` | | N | N | ログレベル (→ 型定義) |
| `message` | TEXT | | N | N | ログメッセージ |
| `timestamp` | TIMESTAMPTZ | | N | N | 記録日時 |

### `error_logs` (エラーログ)

処理中に発生したエラー情報を記録する。

| カラム名 | データ型 | PK/FK | NULL | UNIQUE | 説明 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | BIGINT | PK | N | Y | 識別子 |
| `access_log_id`| BIGINT | FK | N | N | `access_logs.id` への参照 |
| `level` | `log_level` | | N | N | ログレベル (→ 型定義) |
| `message` | TEXT | | N | N | エラーメッセージ |
| `stack_trace` | TEXT | | Y | N | スタックトレース |
| `timestamp` | TIMESTAMPTZ | | N | N | 記録日時 |

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
