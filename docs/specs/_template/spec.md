---
title: <機能名>
feature: <feature-id>          # docs/specs/<feature-id>/ と同じ。kebab-case
status: current                # current（現在の正） | deprecated（廃止予定）
updated: YYYY-MM-DD
code:                          # 関連コードは「パス :: シンボル」で書く（行番号は書かない＝構成が変わると腐るため）
  - packages/api/src/features/<name>/service.ts :: <functionName>
  - packages/web/src/features/<name>/hooks/<useXxx>.ts :: <useXxx>
related: []                    # 関連する機能の feature-id
symptoms: []                   # この機能が壊れたときの見え方（利用者の言葉で）。incidents.md の索引の種になる
---

# <機能名>

<!--
書き方の原則:
- この文書は「機能の現在の姿」。改修のたびに更新し、経緯は changes/ に残す。
- 節の順番は固定。当てはまらない節は「該当なし」と書いて残す（エージェントが節の名前で直接たどるため）。
- 振る舞いと設計の要点を書く。実装の細部はコードを正とし、ここには書かない。
- 受け入れ基準には ID を振り、テストの名前から参照する。
-->

## TL;DR・改修前の必読

- この機能は何か、誰のどんな困りごとを解決するか（1〜3 行）
- ⚠️ 改修の前に [§設計不変条件](#設計不変条件) と [§ポストモーテム](#ポストモーテム) を読む

## 目的と利用者

- 目的:
- 利用者と使う場面:

## 振る舞いと受け入れ基準

> 正常系、異常系、境界、非機能を書く。ID は `AC-<feature-id>-NN`（番号は振り直さない。廃止したら「廃止」と書いて残す）。

- **AC-<feature>-01**: <条件> のとき、<結果> になる
- **AC-<feature>-02**: …

## 画面と API

### 画面
- ルート: `/xxx`（`packages/web/src/config/routes.ts`）
- 主な構成と操作:

### API
| メソッドとパス | 認証 | 入力 | 出力 | 主なエラー |
| --- | --- | --- | --- | --- |
| `GET /api/xxx` | JWT | `XxxQuerySchema` | `XxxResponseSchema` | 401 |

スキーマは `packages/shared/src/schemas/<name>.ts`。

## データ

- 使うテーブル / ビューと主なカラム、制約
- フロントエンドで保持する状態（Zustand、localStorage など）

## 設計不変条件

> 破ると何が起きるかを必ずセットで書く。改修とバグ調査で最初に読む節。

- **INV-1**: <守る条件>。破ると <起きること>。

## エラー時の挙動

- <失敗の種類> のとき: <利用者に見えること / ログ>

## 既知の落とし穴

- タイミング、端末、ブラウザ、外部サービスに依存して踏みやすい点

## ポストモーテム

> バグを直したら必ず 1 件追記し、frontmatter の `symptoms` と `docs/specs/incidents.md` も更新する。新しい順に並べる。

### YYYY-MM-DD 症状「<利用者から見た症状>」（vX.Y.Z）
- **真因**:
- **対策**: （守った / 追加した不変条件 INV-n）
- **再発時に確認すること**:
- **改修の記録**: [vX.Y.Z-<slug>](changes/vX.Y.Z-<slug>.md)

## テストとの対応

| AC | テスト | 種類 |
| --- | --- | --- |
| AC-<feature>-01 | `packages/api/src/features/<name>/service.test.ts` | 単体 / 結合 / E2E / 手動 |

手動でしか確かめられない項目は `docs/testing/manual-checklist.md` にも書く。

## 変更履歴

| バージョン | 日付 | 内容 | 改修の記録 |
| --- | --- | --- | --- |
| v1.0.7 | YYYY-MM-DD | 移行時点の基準 | [v1.0.7-baseline](changes/v1.0.7-baseline.md) |
