# コーディング規約

## エクスポート・モジュール構成

- Export するモジュールをファイル上部に記載し、プライベートモジュール（内部利用のみ）は下部にまとめる。
- 基本的に関数はアロー関数で実装する。
- ファイル下部に配置するプライベート関数などは `function` 宣言を使用して可読性を高める。
- エクスポート方針
  - **原則**：名前付きエクスポートを用いる。
  - **例外**：モジュールの主役が明確に 1 つである場合のみ `export default` を許可（例：React コンポーネントなど）。

## ファイル命名規則

| **用途** | **命名例** | **補足** |
| --- | --- | --- |
| 通常のユーティリティ関数・モジュール | `string-utils.ts`, `array-helpers.ts` | 小文字・ハイフン区切り |
| クラスファイル | `user-service.ts`, `project-repository.ts` | クラス名は `UserService` のように PascalCase でも、ファイルは kebab-case |
| React コンポーネント | `UserCard.tsx`, `LoginForm.tsx` | UI 単位なので **PascalCase** が主流 |
| フック（hooks） | `useUserFetch.ts`, `useAuthGuard.ts` | `use` で始める（React 規約） |
| 型・enum 定義 | `user.types.ts`, `project.enums.ts` | 型専用ファイルと分かる命名 |
| テストファイル | `user-service.test.ts`, `login-form.spec.tsx` | `.test` / `.spec` 接尾辞 |
| バレル（集約） | `index.ts` | 再エクスポート専用 |
| 設定・定数 | `config.ts`, `constants.ts` | 小文字 + 単語 1 つが自然 |
| エントリーポイント | `main.ts`, `server.ts`, `app.tsx` | プロジェクト構成に応じて固定名を推奨 |

## 命名規則

| 種別 | 例 | 規則 |
| --- | --- | --- |
| 変数・関数 | `camelCase` | 小文字始まり。動詞始まりが望ましい（例：`getUser`, `fetchData`） |
| クラス・コンポーネント | `PascalCase` | 名詞系（例：`UserCard`, `ProjectRepository`） |
| 定数 | `UPPER_SNAKE_CASE` | 不変値（例：`API_BASE_URL`, `DEFAULT_TIMEOUT`） |
| フォルダ | `kebab-case` | URL や他システムとの整合性を重視 |

## 関数設計ルール

- 関数は **1 つの責務** に限定する。
- 可能な限り純粋関数（副作用なし）として設計する。
- 引数が 3 つを超える場合はオブジェクト引数にまとめる。

## Enum の扱い

- 文字列 Enum：`as const` を使用して型安全性と補完性を確保する。
- 数値 Enum：`enum` を利用（ビットフラグや定数値として利用する場合）。

## 型アノテーションの方針

- 基本的に変数、引数、返り値に明示的な型アノテーションを付与する。
- `useState` など初期値から型推論できる場合でも、意図を明確にするため型を明示する。\
  例：`const [count, setCount] = useState<number>(0);`

## import 順序

1. 外部ライブラリ（例：`react`, `next`, `axios` など）
2. エイリアス／内部モジュール（例：`@/components/...`）
3. 相対パス（`./`, `../`）
4. 型専用 import は末尾または同一ブロック内で `import type` を使用
   - 各グループの間に **1 行空ける** こと

## モジュール内の配置例

```ts
// named exports (必須)
export const doSomething = () => {
  // ...
};

export const useCustomHook = () => {
  // ...
};

// private utilities (ファイル末尾に function 宣言でまとめる)
function formatValue(value: string): string {
  return value.trim();
}
```

