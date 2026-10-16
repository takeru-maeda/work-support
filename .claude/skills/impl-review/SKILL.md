---
name: impl-review
description: autonomous-impl の工程 6（/code-review による最終レビューと、CONFIRMED / PLAUSIBLE の振り分け）。autonomous-impl から呼ぶ。単独では使わない。
user-invocable: false
---

# 工程 6: コードレビュー（最終ゲート）

**入口条件**: チェックリストの「5」に印があること。

工程 3 の bug-reviewer は「実装した直後の静的な点検」。ここはリファクタの後の最終的な差分に対して、正しさに加えて再利用・単純化・効率まで見る、別の目による最終ゲート。

## 手順

1. **`/code-review` を回す。** Skill ツールで `code-review` を呼び、引数に effort を渡す（例: `args: "medium"`）。どの規模でも必ず回す（S は工程 3b を省くので、ここが唯一の独立したレビュー）。

   | 規模 | effort |
   | --- | --- |
   | S | low |
   | M | medium |
   | L | high |

   `ultra` は課金されるため自動では回さない（必要なら提案する）。

2. **指摘を振り分ける。** `/code-review` の指摘には重要度の区分が無く、CONFIRMED（検証で確かめられた）と PLAUSIBLE（可能性がある）の判定が付く。**重要度（Critical / Major / Minor）は親が付ける**（基準は `bug-reviewer` と同じ）。
   - **CONFIRMED で改修の範囲内**: 親が重要度を付け、Critical / Major は直す。バグなら再発防止のテストを足す
   - **PLAUSIBLE で改修の範囲内**: 親がコードを読んで、本当に問題かを確かめてから判断する。直さないときは理由を改修の記録に書く
   - **Minor や改善の提案**: 今回の範囲で安く直せるものは直す。見送ったものは記録に書く
   - **改修範囲の外の指摘**: 直さずに記録だけし、完了報告の「次の一手」に書く（範囲を勝手に広げない）

3. 修正したら、影響範囲のテストと型チェックをもう一度回す。

> CONFIRMED / PLAUSIBLE の付き方や effort ごとの指摘の量が想定と違ったら、`docs/harness/improvements.md` に記録して、このスキルの基準を直す提案をする。

## 出口条件

- 改修範囲の Critical / Major が残っていない
- 指摘と対応を改修の記録の「検証結果」に書いた
- チェックリストの「6」に印を付け、**`impl-docs`（工程 7）** を読み込む
