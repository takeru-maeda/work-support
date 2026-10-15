# テストの規約

## 方針

- 実装ではなく振る舞いをテストする。仕様書の受け入れ基準（`AC-<feature>-NN`）をテストの単位にする
- 新しく書くコードは TDD（Red → Green → Refactor）で書く
- 既存コードを変えるときは、触る前に今の挙動をテストで固定する（特性化テスト）
- バグ修正には、必ず先に落ちるテスト（再発防止テスト）を書く
- 速く、毎回同じ結果になるテストにする（実際の時刻に依存しない。時刻は固定する）
- 日付の計算は、本番と同じタイムゾーンで確かめる（設定で api は UTC、web は日本時間に固定してある）。web で端末の今日を使う部品は、`vi.useFakeTimers({ toFake: ["Date"] })` で日付だけを固定する（タイマーは本物のまま）
- 直す予定の不具合の今の振る舞いをテストで固めるときは、テストの名前に「既知の落とし穴」と書き、仕様書の「テストとの対応」に挙げる。直す改修では、そのテストを先に期待する振る舞いに書き換えて Red にする

## テストの層

| 層 | 対象 | 道具 | 接続先 | 実行 |
| --- | --- | --- | --- | --- |
| 単体 | 純粋関数、service（repository を差し替え）、shared のスキーマ | Vitest | なし | `pnpm test` |
| 結合（`*.int.test.ts`） | api のルートを DB まで通す | Vitest + `app.request` | ローカルの Supabase | `pnpm db:start` → `pnpm test:int` |
| 部品 | web のコンポーネントとフック | Vitest + Testing Library + MSW（jsdom） | MSW（通信はすべて差し替える） | `pnpm test` |
| E2E | 主な画面の通し（3 幅） | Playwright（`packages/e2e`） | ローカルの Supabase | `pnpm db:start` → `pnpm test:e2e` |

- **DB を使うテストは、ローカルの Supabase にだけつなぐ**。マイグレーションから作ったまっさらな DB で回すので、「本番と同じスキーマでも、まっさらな DB では動かない」不具合（マテリアライズドビューの未更新など）も見つかる。CI も同じ構成で回す
- **テストのデータは共有しない**。テストごとに一意なユーザーを作り、終わったら消す（データは外部キーの CASCADE で消える）
- 下の層で確かめられることは下の層で確かめる。E2E は、画面をまたぐ通しの動きと 3 幅の崩れに絞る

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

ルートは結合テストで、Hono の `app.request` を通して確かめる（`packages/api/test/helpers.ts` の `callApi` と `createTestUser`）。

```typescript
it("工数を登録すると、新しい案件が案件の一覧に出る", async () => {
  const user = await createTestUser(); // 一意なユーザー。テストの後で消える
  const res = await callApi("/api/effort/entries", { method: "POST", user, body });
  expect(res.status).toBe(201);
});
```

- ブラウザから Supabase を直接呼ぶもの（Storage）は、`browserClient(user)`（anon キー + 本人のトークン）でブラウザと同じ権限にして、他人とログインしていない状態からの操作が拒否されることをポリシーごと確かめる（`packages/api/test/avatar-storage.int.test.ts`）

## web のテスト

- 通信は MSW で受け、画面に出る文言と操作（role、ラベル）で確かめる。実装の内部（state やフックの戻り値）を見ない
- SWR のキャッシュはユーザー単位のキーなので、テストごとに別のユーザーにして混ざらないようにする
- API に付けるトークンの取得（`getAccessToken`）は `src/test/setup.ts` で差し替えてある（本物の supabase-js はロックで待たされ、前のテストの通信が次のテストに届くことがある）。ログインやセッションの振る舞いは、`@/lib/auth` の関数を `vi.mock` で差し替えて確かめる

## 外部とつながる部分

- 判定や変換のロジックは純粋関数に切り出して単体テストする（例: 工数テキストの解析、目標進捗の計算）
- メール送信（`packages/api/src/lib/mailer.ts` から GAS のエンドポイントへ fetch）など外部サービスへの通信は、テストでは差し替える
- 本番・開発用の接続情報（api の `.dev.vars`、web の `.env`）でテストを動かさない。テストの設定は、どれも読み込まないようにしてある

---
_手順の詳細ではなく、方針とパターンを書く。設定の詳細は各パッケージの設定ファイルにある_
