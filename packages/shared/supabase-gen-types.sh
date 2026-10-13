#!/usr/bin/env bash
# DB の生成型（packages/shared/src/types/db.ts）を作る。実行: pnpm db:types
#
# 本番は別の Supabase アカウントにあるため、本番と同じスキーマに作り直した開発用のプロジェクトから生成する。
# 開発用のアカウントで `pnpm exec supabase login` してから実行する。
set -euo pipefail
cd "$(dirname "$0")/../.."

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
pnpm exec supabase gen types typescript --project-id bffmiylvxwbmogkvukcq > "$tmp"
pnpm exec prettier --stdin-filepath db.ts < "$tmp" > packages/shared/src/types/db.ts
