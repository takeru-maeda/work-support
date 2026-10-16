---
title: <計画の名前>
status: draft          # draft → approved → in_progress → done（approved は人間が承認したときだけ）
created: YYYY-MM-DD
updated: YYYY-MM-DD
approved_at:
branch: <作業ブランチ>
scope:                 # この計画で編集してよいパス（glob）。spec-gate はここに含まれるパスだけを許す
  - "packages/<pkg>/src/features/<feature>/**"
---

# <計画の名前>

<!--
大きなタスク（複数の機能にまたがる改修、基盤の整備、移行作業）の計画書。
進捗と決定ログはこの文書で管理する。セッションが変わったら「現在地」から再開する。
終わったら status: done にして docs/plans/completed/ へ移す。
-->

## 現在地

- **フェーズ**:
- **次にやること**:
- **ブロッカー**:

## 1. 目的

## 2. 決定事項

| # | 論点 | 決定 |
| --- | --- | --- |

## 3. 完成形

## 4. フェーズと進捗

> 各フェーズの終わりに人間がレビューしてコミットする。

### P1. <フェーズ名>
- [ ] …

## 5. リスクと注意点

## 6. 決定ログ

| 日付 | 決定 | 理由 |
| --- | --- | --- |
