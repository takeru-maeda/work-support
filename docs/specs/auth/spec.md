---
title: 認証（ログイン、新規登録、パスワードの再設定、ログアウト、未ログイン時の扱い）
feature: auth
status: current
updated: 2026-10-15
code:
  - packages/web/src/lib/auth.ts :: login
  - packages/web/src/lib/auth.ts :: signup
  - packages/web/src/lib/auth.ts :: logout
  - packages/web/src/lib/auth.ts :: getCurrentUser
  - packages/web/src/lib/auth.ts :: getAccessToken
  - packages/web/src/lib/auth.ts :: requestPasswordReset
  - packages/web/src/lib/auth.ts :: updatePassword
  - packages/web/src/lib/auth.ts :: toAuthUser
  - packages/web/src/lib/supabase.ts :: supabase
  - packages/web/src/lib/apiClient.ts :: apiClient
  - packages/web/src/store/user.ts :: useUserStore
  - packages/web/src/features/auth/components/AuthGuard.tsx :: AuthGuard
  - packages/web/src/app/AuthenticatedLayout.tsx :: AuthenticatedLayout
  - packages/web/src/pages/auth/LoginPage.tsx :: LoginPage
  - packages/web/src/pages/auth/SignupPage.tsx :: SignupPage
  - packages/web/src/pages/auth/ResetPasswordPage.tsx :: ResetPasswordPage
  - packages/web/src/features/auth/hooks/useResetPasswordManager.ts :: useResetPasswordManager
  - packages/web/src/features/auth/hooks/modules/reset/useRecoverySession.ts :: useRecoverySession
  - packages/web/src/features/auth/hooks/modules/reset/usePasswordResetSubmission.ts :: usePasswordSubmission
  - packages/web/src/components/layout/header/AppHeader.tsx :: AppHeader
  - packages/web/src/app/App.tsx :: App
related: [platform, user-settings, profile, landing, app-shell]
symptoms:
  - ログインできない（英語のエラーが出る）
  - 新規登録したのに、ランディングページに戻される
  - パスワード再設定のメールのリンクを開いても、新しいパスワードの入力に進まない
  - 通信が不安定なときに、ログアウトされてランディングページに戻される
  - 別のタブでログアウトしたのに、このタブでは画面がそのまま
  - 別のタブで別のアカウントにログインしたら、このタブに別人のデータが混ざった
  - ログアウトしたら、ほかの端末でもログアウトされた
---

# 認証（ログイン、新規登録、パスワードの再設定、ログアウト、未ログイン時の扱い）

## TL;DR・改修前の必読

- ログイン（`/login`）、新規登録（`/signup`）、パスワードの再設定（`/reset-password`）、ログアウト（ヘッダーのユーザーメニュー）。認証そのものは Supabase Auth（メールアドレスとパスワード）で、web は supabase-js を直接呼ぶ。API 側のトークンの検証は platform の仕様
- 保護された画面（`AuthenticatedLayout` の下）は、開くたびに `AuthGuard` がユーザーを確かめ、いなければ `/landing` に移す
- API への呼び出しには、毎回 supabase-js のセッションのアクセストークンを `Authorization: Bearer` で付ける。401 を受けても、web は何もしない（ログアウトも取り直しもしない）
- ⚠️ 改修の前に [§設計不変条件](#設計不変条件) と [§既知の落とし穴](#既知の落とし穴) を読む。web は認証の状態の変化（`onAuthStateChange`）を聞いていない

## 目的と利用者

- 目的: 利用者ごとにデータを分け、本人だけが自分の工数・目標・週報を見られるようにする
- 利用者と使う場面: 初めての利用者が新規登録し、以後はログインして使う。パスワードを忘れたら再設定する

## 振る舞いと受け入れ基準

### ルートと保護

- **AC-auth-01**: `/landing`、`/login`、`/signup`、`/reset-password` はログインなしで開ける。`/`、`/efforts`、`/efforts/new`、`/goals`、`/goals/add`、`/weekly-report`、`/profile`、`/settings` は保護された画面。どれにも当たらないパスは `/landing` に移す（ログインしていても）
- **AC-auth-02**: 保護された画面を開くと、`supabase.auth.getUser()` でユーザーを確かめる。最初に開いたときだけ、確かめている間は画面の形の読み込み中の表示を出す（やり直しのあいだは今の画面を出したまま）。ユーザーがいなければ（取得の失敗を含む）、ユーザーと設定のストアを空にして `/landing` に移す（履歴を置き換える）。元のパスは覚えない。ユーザーがいれば、ユーザーのストアに入れ、設定を初期化する（user-settings の AC-05）。保護された画面のあいだを移るたびに、この確かめをやり直す
- **AC-auth-03**: ログインしたまま `/landing`、`/login`、`/signup` を開いても、そのまま表示する（ホームに移さない）

### ログイン（`/login`）

- **AC-auth-04**: 「ログイン」「アカウントにログインしてください」の見出しの下に、「メールアドレス」（必須）、「パスワード」（必須、表示の切り替えボタン付き）、「ログイン」ボタン（送信中は「ログイン中...」）を出す。「パスワードをお忘れですか？」は `/reset-password`、「新規登録」は `/signup` へのリンク
- **AC-auth-05**: 成功したら `/` に移る。失敗したら、Supabase のエラーの文（英語。例: `Invalid login credentials`）をそのまま赤い枠で出す（文が無ければ「ログインに失敗しました」）。`error_logs` には送らない

### 新規登録（`/signup`）

- **AC-auth-06**: 「名前」（必須）、「メールアドレス」、「パスワード」、「パスワード（確認）」を入れて「登録」（送信中は「登録中...」）。パスワードの欄には `minLength=6` があり、6 文字未満はブラウザの検査で止まる。ブラウザの検査を通ったあと、パスワードが一致しなければ「パスワードが一致しません」、（ブラウザの検査を外したとき）6 文字未満なら「パスワードは6文字以上で入力してください」を出して送らない（一致の検査が先）
- **AC-auth-07**: Supabase に名前（`user_metadata.name`）付きで登録する。成功したら、メールの確認が要るかどうかに関わらず「確認メールをお送りしました。メール内の手順に従ってアカウントを有効化してください。」のトーストを出し、`/` に移る（確認が要るときはセッションが無いので、`AuthGuard` が `/landing` に移す）。失敗したら Supabase のエラーの文をそのまま出す（文が無ければ「登録に失敗しました」）。設定の行はここでは作らない（user-settings の INV-1）

### パスワードの再設定（`/reset-password`）

- **AC-auth-08**: 最初は「登録されているメールアドレスを入力してください」で、メールアドレスを入れて「次へ」（送信中は「確認中...」）。成功したら「パスワード再設定用のメールを送信しました。メールをご確認ください。」を出す。再設定のリンクの戻り先は `<今の画面の origin>/reset-password`。失敗したらエラーの文（無ければ「パスワードリセットメールの送信に失敗しました」）
- **AC-auth-09**: メールのリンクで開くと、URL のハッシュかクエリの `type=recovery` とトークンからセッションを作り、URL からトークンを消して、「新しいパスワードを入力してください」に進む。URL に `error` があれば、その説明か「パスワードリセットリンクが無効か期限切れです。再度お試しください。」を出す。セッションを作れなければ Supabase のエラーの文を出して最初の段のまま。トークンがそろっていない、`type` が `recovery` でないときは何もしない。**リンクを開いた時点でそのセッションでログインした状態になる**（新しいパスワードを決めずに `/` に移っても使える。同じブラウザのほかのアカウントのセッションは置き換わる）
- **AC-auth-10**: 「新しいパスワード」と「パスワード確認」を入れて「パスワードをリセット」（送信中は「リセット中...」）。一致しない・6 文字未満はサインアップと同じ文で止める（こちらの欄には `minLength` が無いので、6 文字未満の文が画面に出る）。失敗したらエラーの文（無ければ「パスワードのリセットに失敗しました」）。成功したらログアウトして `/login?reset=success` に移る（ログインの画面はこのクエリを使わない）。「メールアドレスを変更」でログアウトして最初の段に戻る

### ログアウトとセッション

- **AC-auth-11**: ヘッダーのユーザーメニューの「ログアウト」で、Supabase からログアウトし（既定の `scope: 'global'` なので、**ほかの端末のセッションも終わる**）、ユーザーのストアを空にして `/login` に移る。失敗しても利用者には知らせず（コンソールに出すだけ）、ログインしたまま元の画面に残る。ログアウトはほかに、アカウントの削除のあと（profile の AC-13。ストアを空にしない）と、パスワードの再設定の成功と「メールアドレスを変更」（どれも global）でも行う
- **AC-auth-12**: セッションは supabase-js が localStorage に持ち、再読み込みしても続く。supabase-js が背後でトークンを取り直し、API を呼ぶときにも期限が切れていれば取り直す（`getSession()`）。セッションが無い、または取得に失敗したときは `Authorization` を付けずに送り、401 になる

## 画面と API

### 画面
- ルート: `/login`、`/signup`、`/reset-password`（どれもロゴ、見出し、カードの共通の形）。保護は `AuthenticatedLayout`（`AuthGuard`）
- 主な操作: ログイン、新規登録、再設定のメールの依頼、新しいパスワードの設定、ログアウト

### API
認証の画面は API を呼ばない（Supabase Auth を直接呼ぶ）。API 側のトークンの検証は [platform の仕様](../platform/spec.md)。全エンドポイントは [docs/reference/api.md](../../reference/api.md)。

## データ

- Supabase Auth（`auth.users`）。`user_metadata.name`（名前）、`user_metadata.avatarUrl`（プロフィール画像。profile の仕様）
- ブラウザ: supabase-js のセッション（localStorage）、ユーザーのストア（Zustand。`{ id, name, email, avatarUrl }`。保存しない。名前が無ければメールアドレスを名前にする）
- パスワードの最小の長さは 6（Supabase の設定 `minimum_password_length` と画面の検査）

## 設計不変条件

- **INV-1**: ユーザーのデータを扱う画面は、すべて `AuthenticatedLayout`（`AuthGuard`）の下に置く。破ると、未ログインで画面が開き、API の 401 で中途半端な表示になる
- **INV-2**: SWR のキーと localStorage のキーにはユーザー ID を含める（`buildUserScopedKey` など）。ログアウトでキャッシュを消していないので、破ると、同じタブで次にログインしたユーザーに前のユーザーのデータが見える。ただしこの守りは、ストアのユーザー ID とトークンの持ち主が一致しているときだけ効く（別のタブでアカウントが替わると崩れる。[§既知の落とし穴](#既知の落とし穴)）。設定のストアはキーを持たないので守られない（user-settings）
- **INV-3**: API に渡すユーザーの身元はアクセストークンだけ。web からユーザー ID を本文やクエリで送って身元を決めない（platform の INV-3）
- **INV-4**: 再設定のリンクの戻り先（`<web の origin>/reset-password`）は、Supabase の許可する戻り先の一覧に入れる（クラウドはダッシュボードの設定、ローカルは `packages/api/supabase/config.toml` の `site_url` と `additional_redirect_urls`）。破ると、リンクが Supabase の既定の URL に戻り、再設定できない。**ローカルの設定には今入っていない**（`127.0.0.1:3000` だけ）。クラウドの設定はリポジトリからは確かめられない

## エラー時の挙動

- ログイン・新規登録・再設定の失敗は、Supabase のエラーの文（英語のことが多い）を画面の中に出す。`error_logs` には送らない
- ログアウトの失敗は、コンソールに出すだけ
- 保護された画面で、ユーザーの確かめが通信の失敗で終わったときも、未ログインとして `/landing` に移す

## 既知の落とし穴

- **認証の状態の変化を聞いていない**: `onAuthStateChange` を使っていない。別のタブでのログアウトや、トークンの取り直しの失敗に気づかず、画面はそのままで API の呼び出しが 401 になる。web は 401 を受けても何もしない
- **別のタブでアカウントが替わると、別人のデータが混ざる**: supabase-js はセッションをタブのあいだで共有するので、別のタブでログアウトして別のアカウントでログインすると、このタブの API の呼び出しは新しいアカウントのトークンで送られる。一方、ユーザーのストア（と SWR・localStorage のキーのユーザー ID）は前のアカウントのまま残り、画面を移るまで替わらない。前のアカウントのキーに新しいアカウントのデータが入り、工数登録の下書きの同期では前のアカウントの入力が新しいアカウントの下書きに送られうる（コードから。未確認）。再設定のリンクを別のタブで開いたときも同じ
- **ログアウトはほかの端末も終わらせる**: `signOut()` の既定は global で、ほかの端末のセッションも失効する（AC-11）。端末間で下書きを同期する使い方では、ほかの端末で入力中の画面が 401 になる。ヘッダーのログアウトはこの端末だけにするように直す予定（人間の判断 2）
- **通信が不安定だとログアウトされたように見える**: ユーザーの確かめ（`getUser()`）がネットワークの往復で、失敗すると未ログインとして `/landing` に移す
- **画面を移るたびに確かめをやり直す**: `AuthGuard` の確かめと設定の取得が、保護された画面を移るたびに走る（`useNavigate` が変わるため。`pnpm dev:local` で確かめた）
- **ログイン済みでもログインの画面が出る**: `/login`、`/signup`、`/landing` はログインしていても表示する（確かめた）。旧ドキュメントはホームに移すとしていた。P6 以降にホームに移すように直す予定（[v1.0.7-baseline](changes/v1.0.7-baseline.md) の人間の判断 1）
- **ログインのあとに元の画面に戻らない**: 未ログインで開いたパスを覚えないので、ログインのあとはいつも `/` に移る
- **新規登録のトーストがいつも出る**: メールの確認が要らない設定（ローカルの Supabase など）でも「確認メールをお送りしました」を出す。確認が要る設定では、`/` に移ったあと説明なく `/landing` に戻る
- **再設定のあとの案内が出ない**: `/login?reset=success` に移るが、ログインの画面はこのクエリを見ないので、何も表示しない
- **再設定のリンクの読み取りが競合しうる**: supabase-js も URL のトークンを読み取ってハッシュを消すので、画面が読む前に消えると、セッションはできているのに最初の段のままになることがある（コードから。未確認）
- **ログアウトで消さないもの**: SWR のキャッシュ、設定のストア（user-settings）、ユーザーごとの localStorage（工数の下書き `effort:entry:form`、目標の追加の下書き `goals:add:draft`、工数一覧の絞り込み `efforts:list:filters`、過去の目標の絞り込み `goals:past:filters`）。SWR と localStorage はキーにユーザー ID を含むので、ストアとトークンがそろっていればほかのユーザーには見えないが、端末には残る。設定のストアは、次のユーザーの初期化が失敗すると前のユーザーの値が見える
- **エラーの文が英語**: Supabase のエラーの文を訳さずに出す
- **名前の検査**: 空白だけの名前も通る

## ポストモーテム

該当なし（git の履歴に、認証の画面の不具合の修正は無い。設定の初期化の修正 `91bc403` は user-settings のポストモーテム）。

## テストとの対応

| AC | テスト | 種類 |
| --- | --- | --- |
| AC-auth-01〜03 | `packages/web/src/app/App.test.tsx`（アプリ全体をメモリの上のルーターで描画し、`getCurrentUser` を差し替える） | 部品 |
| AC-auth-04〜10 | `packages/web/src/pages/auth/AuthPages.test.tsx`（`@/lib/auth` の関数と、再設定のリンクでの `supabase.auth.setSession` を差し替える） | 部品 |
| AC-auth-11 | `packages/web/src/components/layout/AppShell.test.tsx`（ヘッダーの「ログアウト」） | 部品 |
| AC-auth-02、04、05 | `packages/e2e/tests/auth.spec.ts`（本物の Supabase でログインし `/` に移ること、未ログインで保護された画面が出ないこと） | E2E |
| AC-auth-08〜10 の本物のメール | 手動（`docs/testing/manual-checklist.md` の M-003）。ローカルの Supabase のメールの受け口で E2E にする見込み（INV-4 をローカルで守るのが先） | 手動 |
| AC-auth-12、INV-2（別のタブでのアカウントの切り替え） | 未（P6 で直すときに先に落ちるテストを書く） | — |

既知の落とし穴のうち、今の振る舞いをテストで固めたもの（P6 で直すときにテストを書き換える）: ログインしたまま `/login` を出す、存在しないパスはログインしていても `/landing`（AC-01、03）、画面を移るたびに確かめ直す（AC-02）。

## 変更履歴

| バージョン | 日付 | 内容 | 改修の記録 |
| --- | --- | --- | --- |
| v1.0.7 | 2026-10-15 | 移行時点の基準 | [v1.0.7-baseline](changes/v1.0.7-baseline.md) |
