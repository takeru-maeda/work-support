# テストの規約

> テスト基盤はハーネス移行計画の P4 で整備中。整ったら、ここに具体的な手順（DB を使う結合テスト、E2E）を書き足す。

## 方針

- 実装ではなく振る舞いをテストする。仕様書の受け入れ基準（`AC-<feature>-NN`）をテストの単位にする
- 新しく書くコードは TDD（Red → Green → Refactor）で書く
- 既存コードを変えるときは、触る前に今の挙動をテストで固定する（特性化テスト）
- バグ修正には、必ず先に落ちるテスト（再発防止テスト）を書く
- 速く、毎回同じ結果になるテストにする（実際の時刻に依存しない。時刻は固定する）

## ツール

- **Vitest**: 全パッケージ
- **Testing Library + MSW**: web のコンポーネントとフック（P4 で導入）
- **Playwright**: E2E（P4 で導入）

## 置き場所と名前

- テスト対象と同じ階層に置く: `service.ts` の隣に `service.test.ts`
- `describe` に対象、`it` に振る舞いを書く。受け入れ基準に対応するテストは名前に ID を入れる

```typescript
describe("upsertEffortDraft", () => {
  it("AC-effort-draft-03: clientUpdatedAt が古いときは保存せず applied: false を返す", async () => {
    // Arrange
    // Act
    // Assert
  });
});
```

## API のテスト

Hono の `app.request` でルートを通してテストする。

```typescript
import app from "../../index";

it("POST /api/effort/entries は 201 を返す", async () => {
  const res = await app.request(
    "/api/effort/entries",
    { method: "POST", body: JSON.stringify(payload), headers },
    env,
  );
  expect(res.status).toBe(201);
});
```

## 外部とつながる部分

- 判定や変換のロジックは純粋関数に切り出して単体テストする（例: 工数テキストの解析、目標進捗の計算）
- メール送信（`packages/api/src/lib/mailer.ts` から GAS のエンドポイントへ fetch）など外部サービスへの通信は、テストでは差し替える
- 本番の環境変数（`.dev.vars`）でテストを動かさない

---
_手順の詳細ではなく、方針とパターンを書く。設定の詳細は各パッケージの設定ファイルにある_
