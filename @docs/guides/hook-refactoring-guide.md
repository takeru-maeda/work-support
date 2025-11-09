---
title: "複合フックのリファクタリング手引き"
---

# 複合フックのリファクタリング手引き

大規模な Zustand/React Hooks を小さなモジュールへ分割する際に守ったルールをまとめます。主に `useGoalsTableManager`, `useAddGoalsManager`, `usePastGoals` で実施した方法です。

## 基本方針

1. **関心ごとでフックを分割する**  
   - データ取得 (`useGoalsData` のような SWR ラッパー)  
   - UI 編集状態 (`useGoalsEditingState`, `useGoalDraft`)  
   - メトリクス計算 / バリデーション (`useGoalProgressMetrics`, `useAddGoalPeriodValidation`)  
   - モーダル・削除処理 (`useGoalContentDialog`, `useGoalDeletion`, `usePastGoalsSelection`)  
   - API 保存処理 (`useAddGoalSave`)  
   など、単一責務なフックへ切り出して組み合わせる。

2. **呼び出し元は調停役に徹する**  
   - メインフック (`useGoalsTableManager` など) は状態の組み合わせ・ハンドラ配線のみを担当し、ロジックはモジュール側で完結させる。

3. **ローカルストレージや API キーはユーザー単位で扱う**  
   - `buildUserScopedKey`（`lib/utils.ts`）を使い、`localStorage` キーに `user.id` を付与する。  
   - 例: `goals:add:draft:{userId}` や `goals:past:filters:{userId}`。

4. **モジュール用ディレクトリ構造を揃える**  
   - `hooks/modules/current/*`：最新目標テーブル用  
   - `hooks/modules/add/*`：目標追加画面用  
   - `hooks/modules/past/*`：過去目標用  
   - 共通化できるロジックが増えたら `hooks/modules/shared/*` を作る。

5. **副作用を安全に扱う**  
   - 共有フックで `localStorage` を扱う際は `typeof window !== "undefined"` ガードを入れる。  
   - SWR 経由のエラー処理は `useEffect` / `onError` で共通化し、トーストと `reportUiError` をセットで呼ぶ。

## 実装チェックリスト

- [ ] メインフックから配列 map・進捗計算などのロジックをモジュールへ移したか  
- [ ] 副作用（API 保存・localStorage 書き込み）がモジュール内にカプセル化されているか  
- [ ] Zustand (`useUserStore`) の取得は `getState()` を使い、UI レンダリング時に不要な再描画を避けているか  
- [ ] 分割後のフックに JSDoc を付与し、役割・引数・返り値を明確にしているか  
- [ ] 新規ファイルは `kebab-case` で命名し、各フォルダに README もしくは手引きを参照するガイドラインを残しているか

## 参考

- `packages/web/src/features/goals/hooks/modules/current/*`
- `packages/web/src/features/goals/hooks/modules/add/*`
- `packages/web/src/features/goals/hooks/modules/past/*`

今後も複雑化したフックが現れたら、ここで示した分割パターンを適用してコードサイズと見通しを保ってください。
