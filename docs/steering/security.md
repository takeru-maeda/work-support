# セキュリティ

## 方針

- 認証を先に済ませる
- 権限は最小にする
- シークレットは環境変数で管理し、コードやログに出さない

## 認証と CORS

- JWT: Supabase の JWT を `jose` で検証する（HS256 は共有シークレット、ES256 / RS256 は JWKS。許可する方式を絞る）
- API キー: 外部システム（GAS）を固定のキーで認証する
- CORS: 許可したオリジンだけを通す

詳しくは `authentication.md`。

## シークレット

ローカルは `packages/api/.dev.vars`、本番は Cloudflare のシークレットで管理する。項目の一覧は `.dev.vars.example`。

| 変数 | 用途 |
| --- | --- |
| `SUPABASE_URL` / `SUPABASE_ID` | Supabase のプロジェクト |
| `SUPABASE_SERVICE_ROLE_KEY` | DB を操作するキー（全権限があるので特に注意） |
| `SUPABASE_JWT_SECRET` | HS256 の JWT の検証（公開鍵方式の JWT には使わない） |
| `API_KEY` | 外部システムの認証 |
| `APP_EMAIL` / `GAS_EMAIL_ENDPOINT` | メール送信 |
| `PROD_FRONTEND_URL` / `DEV_FRONTEND_URL` | CORS |

- `.dev.vars` と `.env` は git に入れない
- **エージェントはシークレットのファイルを読まない・表示しない**（`.claude/settings.json` で、Read ツールと、ファイル名を含むシェルのコマンドを禁止している。抜け道があり得るので、禁止に頼らず自分でも避ける）

## 入力の検証

すべての入力を Zod スキーマで検証する（`validator("json", Schema)` / `validator("query", Schema)`）。

## 認可

- バックエンドは service role キーで DB を操作するため、RLS に守られない。**どのクエリにも `user_id` の条件を必ず入れる**
- ユーザー ID は `c.get("user")` から取る（リクエストの値を信用しない）
- 他のユーザーのデータを返さないことを、テストで確かめる
- **例外: ブラウザから Supabase を直接呼ぶもの**（今は Storage のプロフィール画像だけ）は API を通らないので、守りは RLS のポリシーだけになる。ポリシーで本人の範囲（パスの最初のフォルダ = `auth.uid()`）に絞り、緩いポリシーを並べない（permissive は OR で効く）。新しく直接呼ぶものを増やすより、API を通すことを優先する

---
_パターンと判断を書く_
