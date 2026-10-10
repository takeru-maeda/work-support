---
name: impl-bug-check
description: autonomous-impl の工程 3（バグの自己点検。機械チェック、bug-reviewer への依頼、指摘の振り分けと修正）。autonomous-impl から呼ぶ。単独では使わない。
user-invocable: false
---

# 工程 3: バグの自己点検

**入口条件**: チェックリストの「2」に印があること。

## 3a. 機械チェック（親）

パッケージの `CLAUDE.md`「ビルド・テスト・型チェックの鉄則」にある型チェックと lint を、今回触ったファイルを対象に回す。**編集ごとに整形と lint をかける hook（format-on-edit）はハーネス移行計画の P2 で作る。それまでは、触ったファイルに `pnpm exec prettier --check <files>` と `pnpm exec eslint <files>` をここで手で回す。**

## 3b. 独立したバグ点検（`bug-reviewer` に任せる）

**規模 S では省略する**（工程 6 の `/code-review` で代える）。チェックリストの「3」には「3b 省略（S）」と書く。

まず差分を一時ファイルに書き出す（bug-reviewer は git を実行できないため）。

```bash
diff_file=$(mktemp -t review-diff) && { git status --porcelain; git diff HEAD; } > "$diff_file" && echo "$diff_file"
```

`git status --porcelain` の `??` の行は新しく作ったファイル（`git diff` に中身が出ないので、bug-reviewer が直接読む）。

`bug-reviewer` エージェントに、**次のものだけ**を渡す。

```
- 仕様: 改修の記録のパス（docs/specs/<feature>/changes/v<X.Y.Z>-<slug>.md）
- 実装計画と受け入れ基準: 同じ記録の「実装計画」と AC（AC を満たすかで判定させる）
- 差分: 上で書き出した一時ファイルのパス（意図の説明は付けない）
- 観点: correctness / architecture / library のどれか
```

- **実装した側の根拠や言い訳は渡さない。**「こういう意図でこう書いた」と伝えると、盲点まで一緒に引き継いでしまう。受け入れ基準を渡すのは別で、「満たすべき合否の線」を共有して判定を鋭くするため
- 観点を分けて呼ぶと見落としが減る: **correctness**（ロジック、境界、エラーの経路）、**architecture**（層、規約、責務の置き場所、`user_id` の条件）、**library**（ライブラリの誤用、バージョン違いの書き方。Context7 で照合させる）
- 規模ごとの回数: S は省略、M は correctness + architecture、L は 3 観点すべて
- 長い関数や重複といった一般的なコードの臭いの改善は、ここでは扱わない（工程 5 が担当する）

## 3c. 振り分けと修正（親）

指摘は原文のまま扱い、一言に縮めない。

| 重要度 | 対応 |
| --- | --- |
| Critical | 必ず直す。再発防止のテストを Red → Green で足す |
| Major | 原則直す。直さないなら理由を改修の記録に書く |
| Minor | 任意。見送ったものは改修の記録に書く（握りつぶさない） |
| 誤検知 | 理由を添えて退ける |

修正が大きいときは `bug-reviewer` をもう一度呼び、指摘が消えたかを確かめる。**差し戻しは最大 3 周**。消えない Critical / Major は、再現条件を正直に伝えて人間の判断を仰ぐ。

## 出口条件

- 改修範囲の Critical / Major が残っていない（または人間の判断待ちとして報告済み）
- 指摘と対応を改修の記録の「検証結果」に書いた
- チェックリストの「3」に印を付け、**`impl-verify`（工程 4）** を読み込む
