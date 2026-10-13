# プロジェクト構成

## 基本方針

**モノレポ + 機能単位**: pnpm ワークスペースで api / web / shared の 3 パッケージを管理し、各パッケージの中は機能（feature）ごとにまとめる。

## パッケージごとの構成

### `packages/api/`（バックエンド）
**構成**: Vertical Slice。1 機能 = 1 フォルダで、HTTP からデータアクセスまでを縦に持つ。

```
src/
├── index.ts           # エントリポイント。CORS、ログ、エラーハンドラ、ルートの登録
├── custom-types.ts    # HonoEnv（Bindings / Variables）の型
├── lib/               # 横断的な部品（supabase クライアント、AppError、errorHandler、logger、mailer）
├── middleware/        # 認証（JWT / API キー）、アクセスログ
└── features/{feature}/
    ├── index.ts       # ルート定義。入力の検証（validator）と認証だけを書き、処理は service に任せる
    ├── service.ts     # ビジネスロジック
    ├── repository.ts  # Supabase へのアクセス（ここ以外で supabase.from() を呼ばない）
    └── types.ts       # その機能の型（入出力スキーマは shared から再利用）
```

**層の依存の向き**: `index.ts → service.ts → repository.ts`。逆向きの依存は作らない。他機能のデータが必要なときは、その機能の service を通すことを基本とする（現状 `effort/service.ts` が `user-settings/repository.ts` を直接呼んでいる。新しいコードでは真似しない。ハーネス移行計画の P7 で整理する）。

### `packages/web/`（フロントエンド）
**構成**: Bulletproof React を下敷きにした機能単位の構成。

```
src/
├── app/           # エントリポイント、ルーター（App.tsx）、Provider
├── pages/         # ルート単位のページ。レイアウトを組むだけにして、ロジックは features に置く
├── features/{feature}/   # 機能ごとの components / hooks / utils / types
├── components/
│   ├── ui/        # shadcn/ui のコンポーネント（CLI で追加したもの）
│   ├── layout/    # ヘッダー、モバイル下部ナビ、PageLayout
│   └── 共通部品    # empty-state / skeleton / spinner / table-footer / filter / form など
├── services/      # API 呼び出しと SWR フック（機能ごとに 1 ファイル）
├── store/         # Zustand ストア
├── lib/           # apiClient（axios）、auth、supabase、toast、storage、utils
├── hooks/         # 機能をまたぐ汎用フック
├── config/        # ルート定義、ナビゲーション、API エンドポイント
├── styles/        # globals.css（デザイントークン）
└── types/         # 機能をまたぐ型
```

**移行途中の点**（ハーネス移行計画の P7 で整理する）:
- API 呼び出しが `services/` と `features/` に分かれている。新しく書くコードは既存の `services/<feature>.ts` に合わせる
- `hooks/use-mobile.ts` と `components/ui/` の重複、ファイル名の camelCase / kebab-case の混在

### `packages/shared/`
**役割**: フロントエンドとバックエンドで共有する API 契約と純粋なロジック。

```
src/
├── index.ts       # まとめて export
├── schemas/       # Zod スキーマ（機能ごとに 1 ファイル。Request / Response を定義）
├── types/db.ts    # Supabase の生成型（手で編集しない）
└── utils/         # 両側で使う純粋関数（例: goalProgress）
```

### `docs/`
- `steering/`: プロジェクト全体の規約と判断の軸（このフォルダ）
- `specs/<feature>/spec.md`: 機能ごとの仕様書（現在の姿）。`changes/` に改修の記録
- `specs/incidents.md`: 症状から原因へたどる索引
- `reference/`: コードから自動で作る全体像（テーブルなど）。手書きの説明は印の外にだけ書く
- `plans/`: 大きなタスクの計画書
- `harness/`: ハーネス（AI エージェントの作業環境）の改善記録
- `adr/`: 設計判断の記録
- `guides/`: lint で強制できない書き方の規約

## 命名

- **ディレクトリ**: kebab-case（`effort-entry/`）
- **React コンポーネント**: PascalCase（`GoalCard.tsx`）
- **コンポーネント以外の TS ファイル**: camelCase（`service.ts`、`goalProgress.ts`）。フックは `useXxx.ts`
- **テストファイル**: `*.test.ts(x)`

## import の順序

```typescript
// 1. 外部ライブラリ
import { useState } from "react";

// 2. パスエイリアス
import { Button } from "@/components/ui/button";
import { EffortDraftSchema } from "@shared/schemas/effort";

// 3. 相対パス（同じ機能の中だけ）
import { EffortForm } from "./EffortForm";
```

**パスエイリアス**:
- `@/`: `packages/web/src/`（web の中）
- `@shared/`: `packages/shared/src/`（web から shared を参照）
- `shared`: api から shared を参照するときのパッケージ名

## コードの置き方の原則

1. **機能の境界で分ける**: 機能固有のものは `features/{feature}` に置き、2 つ目の機能で必要になったら共通の場所（web は `components/` か `hooks/`、両パッケージなら `shared`）へ切り出す
2. **API 契約は shared に一つだけ**: 入出力の型をパッケージごとに重複して定義しない
3. **層の責務を混ぜない**: ルートに業務ロジックを書かない。repository に業務判断を書かない。ページにロジックを書かない
4. **既存の近いコードに合わせる**: 新しく書くときは、同じ種類の既存実装を手本にする

---
_ファイルの一覧ではなくパターンを書く。パターンに沿った新しいファイルは、ここを更新しなくてよい_
