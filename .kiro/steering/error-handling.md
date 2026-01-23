# Error Handling

エラー処理とロギングのパターン。

## Philosophy

- 一貫したエラーレスポンス形式
- 全エラーをログ記録（追跡可能）
- クリティカルエラーは通知

## AppError Class

カスタムエラークラス：

```typescript
export class AppError extends Error {
  constructor(
    public statusCode: ContentfulStatusCode,
    message: string,
    public internalError?: Error,
    public logLevel: "ERROR" | "CRITICAL" = "ERROR",
  ) {
    super(message);
  }
}
```

**Usage**:
```typescript
throw new AppError(401, "Unauthorized");
throw new AppError(400, "Validation failed", originalError);
throw new AppError(500, "Critical failure", error, "CRITICAL");
```

## Global Error Handler

`globalErrorHandler` で全エラーを捕捉：

1. ステータスコード・メッセージ抽出
2. `error_logs` テーブルに記録
3. `access_logs` を更新
4. 統一形式でレスポンス

```json
{ "error": "Error message", "accessLogId": "uuid" }
```

## Log Levels

| Level    | Usage          |
| -------- | -------------- |
| ERROR    | 一般的なエラー |
| CRITICAL | 要通知のエラー |

## Error Sources

- `API`: バックエンドで発生
- `UI`: フロントエンドから送信（`/api/logs/error`）

## Logging Tables

- `access_logs`: リクエストごとの記録
- `error_logs`: エラー詳細（access_log_id で紐付け）
- `info_logs`: 情報ログ

---
_Focus on patterns and decisions._
