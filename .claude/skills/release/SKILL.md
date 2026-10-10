---
name: release
description: リリースの準備をする。バージョンの確定、package.json のバージョン更新、CHANGELOG の Unreleased をバージョンの見出しへ移す、改修の記録のバージョンとファイル名の整合を取る。「リリースの準備をして」「バージョンを上げて」と頼まれたときに使う。デプロイとコミットはしない。
disable-model-invocation: true
---

# リリースの準備

デプロイ、タグ付け、コミット、push は**しない**（人間が行う）。このスキルは、リポジトリの中の記録をそろえるだけ。

## 手順

1. **対象をそろえる。** `CHANGELOG.md` の Unreleased と、`status: done` で `released_in:` が空の改修の記録（`docs/specs/*/changes/*.md`）を一覧にする。`status` が done 以外の記録が残っていたら、含めるかをユーザーに確かめる。
2. **バージョンを決める。** 含まれる変更の中で一番大きいもの（破壊的な変更 = major、機能追加 = minor、修正のみ = patch）で、SemVer（`docs/guides/versioning.md`）に従って決める。判断に迷うときはユーザーに確かめる。
3. **改修の記録をそろえる。** 起票時に予約したバージョンと、決めたバージョンが違う記録は、frontmatter の `version` とファイル名（`v<X.Y.Z>-<slug>.md`）を直し、`spec.md` の変更履歴のリンクも直す（`rg 'v<旧バージョン>-<slug>' docs` で参照を探す）。
4. **バージョンを上げる。** `package.json`（ルートに version があれば、それと `packages/api`、`packages/web`、`packages/shared`）をそろえて更新する。
5. **CHANGELOG を確定する。** Unreleased の内容を `## [X.Y.Z] - YYYY-MM-DD` の見出しへ移し、Unreleased を空にする。対象の改修の記録の `released_in:` に `vX.Y.Z` を書く。
6. **確かめる。** 型チェックとビルドが通ることを確かめる。
7. **報告する。** 決めたバージョン、含まれる変更、人間がやること（コミット、タグ、`pnpm -F api run deploy`、Vercel の確認）を伝える。
