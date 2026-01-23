# Project Structure

## Organization Philosophy

**Monorepo + Feature-First**: pnpm ワークスペースで複数パッケージを管理し、各パッケージ内はフィーチャー（機能）単位でモジュールを分離する。

## Package Patterns

### `packages/api/` (Backend)
**Architecture**: Vertical Slice  
**Purpose**: Cloudflare Workers + Hono によるバックエンド API  

```
src/
├── index.ts           # エントリポイント、ルーティング集約
├── custom-types.ts    # Hono 型拡張
├── lib/               # ユーティリティ（Supabase クライアント等）
├── middleware/        # 認証・ロギング等のミドルウェア
└── features/
    └── {feature}/
        ├── index.ts       # ルート定義
        ├── service.ts     # ビジネスロジック
        └── repository.ts  # データアクセス
```

### `packages/web/` (Frontend)
**Architecture**: BalletProof (Bulletproof React ベース)  
**Purpose**: React + Vite による SPA  

```
src/
├── app/           # エントリポイント、プロバイダ、ルーター
├── pages/         # ルート単位のページコンポーネント
├── features/      # 機能境界ごとの UI / hooks / services
├── components/    # 再利用可能な UI (layout / shared / ui)
├── hooks/         # 共通カスタムフック
├── lib/           # API クライアント、ユーティリティ
├── services/      # API 通信の抽象化
├── store/         # Zustand ストア
├── styles/        # Tailwind・グローバル CSS
├── config/        # 環境変数・ルーティング設定
└── types/         # 型定義
```

### `packages/shared/`
**Purpose**: フロントエンド・バックエンド共有のスキーマ・型・ユーティリティ  

```
src/
├── index.ts       # エクスポート集約
├── schemas/       # Zod スキーマ定義
├── types/         # 共有型定義
└── utils/         # 共通ユーティリティ
```

### `@docs/`
**Purpose**: 仕様・設計ドキュメント群  
- `specs/requirements/`: 要件定義
- `specs/design/`: 詳細設計
- `specs/tasks/`: タスク管理

## Naming Conventions

- **ディレクトリ**: kebab-case (`daily-log-editor/`)
- **React コンポーネント**: PascalCase (`Button.tsx`, `GoalCard.tsx`)
- **非コンポーネント TS ファイル**: camelCase (`service.ts`, `repository.ts`)
- **テストファイル**: `*.test.ts(x)`

## Import Organization

```typescript
// 1. 外部ライブラリ
import { useState } from 'react';
import { z } from 'zod';

// 2. パスエイリアス（絶対パス）
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { effortSchema } from '@shared/schemas/effort';

// 3. 相対パス（同一フィーチャー内）
import { EffortForm } from './EffortForm';
```

**Path Aliases**:
- `@/`: `packages/web/src/`（web パッケージ内）
- `@shared/`: `packages/shared/src/`（shared パッケージ参照）
- `shared/*`: TSConfig ベースのパス（api パッケージ）

## Code Organization Principles

1. **機能境界の分離**: features/ 配下で UI・ロジック・データアクセスを機能単位でまとめる
2. **共有スキーマの一元化**: API コントラクトは `packages/shared` で定義し、フロント・バックで共有
3. **レイヤー責務の明確化**:
   - `index.ts` / ルート: HTTP ハンドリング・バリデーション
   - `service.ts`: ビジネスロジック
   - `repository.ts`: データ永続化
4. **仕様との同期**: `@docs/specs` を唯一の参照源とし、実装と常に整合させる

---
_Document patterns, not file trees. New files following patterns shouldn't require updates_
