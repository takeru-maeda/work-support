# Testing Standards

テスト戦略とパターン。

## Philosophy

- 実装ではなく振る舞いをテスト
- 主要フローを優先的にカバー
- 高速で信頼性の高いテストを維持

## Framework

- **Vitest**: 全パッケージで使用
- ファイル命名: `*.test.ts(x)`

## Test Organization

同階層に配置（Co-located）:

```
features/effort/
├── index.ts
├── service.ts
├── service.test.ts  # ← 同階層
└── repository.ts
```

## Test Structure (AAA)

```typescript
it('should return draft when exists', () => {
  // Arrange
  const mockDraft = createMockDraft();
  
  // Act
  const result = getEffortDraft(mockDraft);
  
  // Assert
  expect(result).toEqual(expectedDraft);
});
```

## API Testing

Hono テストクライアントでルートテスト：

```typescript
import app from "../index";

it("POST /api/effort returns 201", async () => {
  const res = await app.request("/api/effort", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.status).toBe(201);
});
```

## Commands

```bash
pnpm --filter api test   # API テスト
pnpm --filter web test   # Web テスト
```

---
_Focus on patterns and decisions. Tool-specific config lives elsewhere._
