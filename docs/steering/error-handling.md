# エラー処理とログ

## 方針

- エラーのレスポンスは一つの形にそろえる
- すべてのエラーをログに残し、`accessLogId` でたどれるようにする
- 重大なエラー（CRITICAL）は区別して記録する

## AppError（`packages/api/src/lib/errors.ts`）

```typescript
throw new AppError(401, "Unauthorized");
throw new AppError(400, "Validation failed", originalError);
throw new AppError(500, "Critical failure", error, "CRITICAL");
```

- 第 1 引数がステータスコード、第 2 引数が利用者に返すメッセージ
- 元の例外は第 3 引数に渡す（ログにスタックトレースが残る）
- 想定外の例外も `globalErrorHandler` が 500 として扱うが、Supabase などのエラーは repository / service で `AppError` に包んで意味のあるメッセージにする

## globalErrorHandler（`packages/api/src/lib/errorHandler.ts`）

1. ステータスコードとメッセージを取り出す
2. 裏側（`executionCtx.waitUntil`）で `error_logs` に記録し、`access_logs` を更新する
3. `{ "error": "...", "accessLogId": "uuid" }` を返す

## ログの水準

| 水準 | 使う場面 |
| --- | --- |
| ERROR | 通常のエラー |
| CRITICAL | 通知が必要な重大なエラー |

## エラーの出どころ

- `API`: バックエンドで起きたもの
- `UI`: フロントエンドから `POST /api/logs/error` で送られたもの。web では `reportUiError` などの共通処理を使う

## ログのテーブル

- `access_logs`: リクエストごとの記録
- `error_logs`: エラーの詳細（`access_log_id` でつながる）
- `info_logs`: 情報ログ

## フロントエンド

- 利用者への通知は `lib/toast.ts`（`showSuccessToast` / `showErrorToast`）を使う
- 失敗したときは、利用者に次の行動がわかる日本語のメッセージを出し、詳細は `reportUiError` でサーバーへ送る

---
_パターンと判断を書く_
