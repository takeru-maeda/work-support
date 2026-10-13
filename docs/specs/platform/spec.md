---
title: 基盤（認証、ログ、エラー処理、CORS、OpenAPI、メール送信）
feature: platform
status: current
updated: 2026-10-13
code:
  - packages/api/src/middleware/auth.ts :: jwtAuthMiddleware
  - packages/api/src/middleware/auth.ts :: apiKeyAuthMiddleware
  - packages/api/src/lib/jwt.ts :: verifySupabaseAccessToken
related: [auth]
symptoms:
  - ログインしているのに、どの画面でもデータが読み込めない（API が 401 を返す）
---

# 基盤（認証、ログ、エラー処理、CORS、OpenAPI、メール送信）

> **作成中**: 今は「API の認証（JWT）」だけを書いている。ログ、エラー処理、CORS、OpenAPI、メール送信は、ハーネス移行計画の P5 で旧ドキュメント（`docs/legacy/specs/`）とコードから埋める。それまでは該当するコードと `docs/steering/` を正とする。

## TL;DR・改修前の必読

- API の全エンドポイントが通る横断的な仕組み。Web からのリクエストは、Supabase が発行したアクセストークン（JWT）で利用者を確かめる
- ⚠️ 認証を変えるときは [§設計不変条件](#設計不変条件) を読む。ここを壊すと、全員が API を使えなくなるか、なりすましを許す

## 目的と利用者

- 目的: どのユーザーからのリクエストかを、改ざんできない形で確かめ、ルートの処理に渡す（`c.get("user")`）
- 利用者と使う場面: Web からの全リクエスト（JWT）。GAS / Google Form からの工数の取り込み（API キー。この節は P5 で書く）

## 振る舞いと受け入れ基準

### API の認証（JWT、`jwtAuthMiddleware`）

- **AC-platform-01**: `SUPABASE_JWT_SECRET` で HS256 署名された有効なアクセストークンは認証が通り、`sub` がユーザー ID、`email` がメールアドレスになる
- **AC-platform-02**: そのプロジェクトの JWKS（`<SUPABASE_URL>/auth/v1/.well-known/jwks.json`。`SUPABASE_URL` の末尾の `/` の有無は問わない）にある公開鍵で ES256 / RS256 署名された有効なアクセストークンは、認証が通り、`sub` がユーザー ID、`email` がメールアドレスになる
- **AC-platform-03**: 署名が合わない、期限切れ、JWKS に無い鍵（`kid`）で署名された、ES256 / RS256 なのに `kid` が無い、`sub` が無い（anon / service_role のキーなど）、のどれかのトークンは 401
- **AC-platform-04**: 許可していない署名方式（`none`、HS512 など、HS256 / ES256 / RS256 以外）のトークンは 401
- **AC-platform-05**: `Authorization: Bearer` が無い・形式が違うときは 401
- **AC-platform-06**: JWKS の取得に失敗したとき、公開鍵方式のトークンは 401 になり、500 にはならない。HS256 のトークンは JWKS を取りに行かない
- **AC-platform-07**（非機能）: 取得した JWKS は isolate の中で 10 分使い回し、リクエストのたびには取りに行かない。JWKS に無い `kid` が来たときは取り直すが、取り直しは 30 秒に 1 回まで。取得に失敗したあとも、30 秒は取りに行かずに失敗させる（Supabase の障害時や不正なトークンで、問い合わせが殺到したり、リクエストが待たされたりしないように）

OPTIONS（CORS のプリフライト）は認証をとばす。

## 画面と API

### 画面
該当なし（画面を持たない）

### API
JWT の認証は、effort（GAS の取り込みを除く）、goals、logs、missions、projects、reports、user-settings、users の各ルートにかかる。失敗はすべて `401 { "error": "Unauthorized", "accessLogId": ... }`（形は `globalErrorHandler` が決める）。

## データ

- 認証そのものは DB を使わない（トークンの検証だけ）
- 環境変数: `SUPABASE_URL`（JWKS の URL の元）、`SUPABASE_JWT_SECRET`（HS256 の検証用）

## 設計不変条件

- **INV-1**: 共有シークレット（`SUPABASE_JWT_SECRET`）は HS256 のトークンの検証にだけ使い、公開鍵方式のトークンは JWKS の鍵でだけ検証する。許可する署名方式は HS256 / ES256 / RS256 だけ。破ると、署名方式を偽ったトークン（`alg: none` や、公開されている情報で作った署名）で、任意のユーザーになりすませる
- **INV-2**: Cloudflare Workers では、あるリクエストで始めた通信を別のリクエストから待たない。JWKS は jose の `createRemoteJWKSet` で取得する（Workers の上では取得中の通信を共有しない作り）。破ると、同時に来たリクエストが失敗する
- **INV-3**: ユーザー ID は検証済みのトークンの `sub` からだけ取る。リクエストの本文やクエリの値を信用しない（`docs/steering/authentication.md`）。破ると、他人のデータを読み書きできる

## エラー時の挙動

- トークンの検証に失敗したとき: 401。原因（署名の不一致、期限切れ、JWKS の取得の失敗など）は `AppError` の内部のエラーとして `error_logs` に残る
- JWKS の取得に失敗し続けるとき: 公開鍵方式のトークンは 30 秒ごとに 1 回だけ取得を試み、それ以外はすぐ 401。HS256 のトークンには影響しない

## 既知の落とし穴

- **ローカルの Supabase は公開鍵方式（ES256）で署名する**（Supabase CLI 2.120。HS256 には戻せない）。本番と開発用は、2026-10-13 の時点では HS256。どちらのトークンも通るが、テストでは両方を確かめる
- **本番の署名の鍵を公開鍵方式に切り替える前に**: この仕様（AC-platform-02）が本番に出ていることを確かめる。出ていないと、切り替えた瞬間に全員が 401 になる
- テスト（Vitest）は jose を Workers と同じ `dist/browser` の版で読み込む（`packages/api/vitest.shared.ts`）。Node 向けの版は JWKS の取得に `http` を使い、本番と挙動がずれる
- `aud` / `iss` は確かめていない（Supabase のプロジェクトの鍵で署名され、`sub` があるトークンは、用途を問わず通る）

## ポストモーテム

該当なし

## テストとの対応

| AC | テスト | 種類 |
| --- | --- | --- |
| AC-platform-01 | `packages/api/src/middleware/auth.test.ts`、`packages/api/test/fresh-user.int.test.ts` | 単体、結合 |
| AC-platform-02 | `packages/api/src/middleware/auth.test.ts`、`packages/api/src/lib/jwt.test.ts`（JWKS の URL）、`packages/api/test/fresh-user.int.test.ts`（ローカルの Supabase で本物のログイン） | 単体、結合 |
| AC-platform-03 | `packages/api/src/middleware/auth.test.ts`、`packages/api/src/lib/jwt.test.ts` | 単体 |
| AC-platform-04 | `packages/api/src/middleware/auth.test.ts`、`packages/api/src/lib/jwt.test.ts` | 単体 |
| AC-platform-05 | `packages/api/src/middleware/auth.test.ts`、`packages/api/test/fresh-user.int.test.ts` | 単体、結合 |
| AC-platform-06 | `packages/api/src/middleware/auth.test.ts` | 単体 |
| AC-platform-07 | `packages/api/src/lib/jwt.test.ts` | 単体 |
| INV-1 | `packages/api/src/lib/jwt.test.ts` | 単体 |
| INV-2 | jose の実装の確認（`jwks/remote.js` の Workers の分岐）。Node のテストでは再現できない | 確認のみ |

## 変更履歴

| バージョン | 日付 | 内容 | 改修の記録 |
| --- | --- | --- | --- |
| v1.1.0 | 2026-10-13 | API の認証を公開鍵方式（JWKS）のアクセストークンにも対応させた。この spec.md を認証の部分から作成 | [v1.1.0-auth-asymmetric-jwt](changes/v1.1.0-auth-asymmetric-jwt.md) |
