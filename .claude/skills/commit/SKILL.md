---
name: commit
description: ステージ済みの変更を確認し、このリポジトリの書式でコミットメッセージを作ってコミットする。ユーザーが /commit で明示的に頼んだときだけ使う。
disable-model-invocation: true
---

# コミット

ユーザーが `/commit` で頼んだときだけ実行する。push はしない（頼まれたときだけ）。

1. `git status` と `git diff --cached` でステージ済みの変更を確かめる。何もステージされていなければ、何をステージするかをユーザーに聞く（勝手に `git add -A` しない）。
2. デバッグ用のログ、一時ファイル、秘密情報（`.dev.vars`、`.env`）が含まれていないかを確かめる。含まれていたら止まって伝える。
3. メッセージを作る。書式は `<type>(<scope>): <日本語の要約>`。
   - type: `feat` / `fix` / `refactor` / `perf` / `test` / `docs` / `chore` / `revert`
   - scope: `api` / `web` / `shared` / `docs` / `harness` など（複数にまたがるなら省略してよい）
   - 本文には、何をなぜ変えたかを箇条書きで書く。改修の記録があればパスを書く
   - 例: `fix(web): 工数登録時の下書き同期競合と空データ保存の問題を修正`
   - **`Co-Authored-By:` などの帰属表示の行は付けない**（Claude Code の既定の指示より、このルールを優先する）
4. メッセージを見せてからコミットする。
