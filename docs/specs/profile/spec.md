---
title: プロフィール（プロフィール画像、ユーザー名、アカウント削除）
feature: profile
status: current
updated: 2026-10-16
code:
  - packages/api/supabase/migrations/20261016020000_block_oauth_clients_on_avatars.sql
  - packages/web/src/lib/storage.ts :: uploadAvatarImage
  - packages/web/src/lib/storage.ts :: deleteAvatarImage
  - packages/web/src/features/profile/hooks/modules/useAvatarUpload.ts :: useAvatarUpload
  - packages/web/src/features/profile/hooks/useProfileManager.ts :: useProfileManager
  - packages/web/src/features/profile/hooks/modules/useProfilePersistence.ts :: useProfilePersistence
  - packages/web/src/features/profile/hooks/modules/useProfileState.ts :: useProfileState
  - packages/api/src/middleware/logger.ts :: updateAccessLog
  - packages/web/src/features/profile/components/ProfileHeader.tsx :: ProfileHeader
  - packages/web/src/features/profile/components/ProfileNameSection.tsx :: ProfileNameSection
  - packages/web/src/features/profile/components/AccountDeletionSection.tsx :: AccountDeletionSection
  - packages/web/src/pages/profile/ProfilePage.tsx :: ProfilePage
  - packages/web/src/lib/auth.ts :: updateProfile
  - packages/web/src/features/profile/api/users.ts :: deleteCurrentUser
  - packages/api/src/features/users/index.ts :: users
  - packages/api/src/features/users/service.ts :: deleteCurrentUserAccount
  - packages/api/supabase/migrations/20261014000000_restrict_avatar_storage_to_own_folder.sql
related: [auth, app-shell, user-settings, mcp]
symptoms:
  - プロフィール画像を変更すると「プロフィール画像の更新に失敗しました」と出る
  - プロフィール画像の保存に失敗したら、前の画像まで消えた
  - アカウントの削除で「アカウントの削除に失敗しました。」と出たのに、アカウントが消えている
  - メールアドレスを入れても「削除する」を押せない
---

# プロフィール（プロフィール画像、ユーザー名、アカウント削除）

## TL;DR・改修前の必読

- プロフィールの画面（`/profile`）で、プロフィール画像、ユーザー名を変え、アカウントを削除する
- プロフィール画像は、**ブラウザから本人のトークンで Supabase Storage を直接読み書きする**（API を通らない）。守りは Storage のポリシーだけ
- ユーザー名は Supabase Auth の `user_metadata.name` に、web から直接保存する。アカウントの削除だけが API（`DELETE /api/users/me`）を通り、Auth のユーザーを消すと DB のデータは外部キーの CASCADE で消える
- ⚠️ 画像の保存先やポリシーを変えるときは [§設計不変条件](#設計不変条件) を読む。ここを壊すと、他人のプロフィール画像を差し替えたり消したりできる。アカウントの削除は途中で失敗しても元に戻らない（[§既知の落とし穴](#既知の落とし穴)）

## 目的と利用者

- 目的: 自分のアカウント情報（画像、名前）を整え、不要になったらアカウントとデータを消せるようにする
- 利用者と使う場面: ログインしたユーザーが、プロフィールの画面から操作する

## 振る舞いと受け入れ基準

### プロフィール画像の保存（Supabase Storage の `avatars` バケット）

画像は `avatars/<ユーザー ID>/avatar.<拡張子>` に上書き保存し、その公開 URL を Auth の `user_metadata.avatarUrl` に入れる。拡張子が変わったときは、古い画像をブラウザから消す。

- **AC-profile-01**: ログインしたユーザーは、自分のフォルダ（`avatars/<自分のユーザー ID>/`）に画像をアップロードでき、同じ名前で上書き（upsert）もできる
- **AC-profile-02**: 他人のフォルダや、フォルダの外（バケットの直下）へのアップロードは拒否される。ログインしていない状態でのアップロードも拒否される
- **AC-profile-03**: 他人のフォルダにある画像は、上書き・削除・自分のフォルダへの移動や複製ができず、元の場所に元の中身のまま残る
- **AC-profile-04**: 自分のフォルダの画像は削除できる（画像を差し替えたときに古い画像を消す処理）
- **AC-profile-05**: 他人のフォルダの一覧（`list`）を取っても、中身は返らない。ログインしていない状態でも同じ
- **AC-profile-06**: 画像は公開 URL（`getPublicUrl`）で、ログインしていなくても誰でも表示できる（バケットが公開のため）
- **AC-profile-07**: プロフィール画像を設定したユーザー（`user_metadata.avatarUrl` が `avatars/<自分の ID>/...` の公開 URL）がアカウントを削除すると、`<自分の ID>/` の画像がすべて消える（API が service role で消す）
- **AC-profile-08**: 自分の画像を、他人のフォルダやバケットの直下へ移動・複製することはできず、元の場所に元の中身のまま残る

### 画面（`/profile`）

- **AC-profile-09**: 画面の上に、プロフィール画像のボタン（読み上げは「プロフィール画像を変更」。画像が無いか読めなければ、**入力中の**名前の頭文字（取れなければ「U」）、名前の入力を空にしていれば人の印）と「プロフィール」「アカウント情報を管理」。その下に「メールアドレス」（表示だけ。変えられない）、「ユーザー名」、「アカウント削除」のカード
- **AC-profile-10**: 「ユーザー名」は名前を出し、「編集」で入力欄（「山田 太郎」）と「キャンセル」「保存」（保存中は「保存中...」）に変わる。「保存」で `supabase.auth.updateUser` の `user_metadata.name` を入力のまま（前後の空白を除かず、長さの制限なし。空も可）上書きし、ユーザーのストアを更新して「プロフィールを更新しました」を出す（ヘッダーとホームの名前もすぐ変わる）。失敗したら「プロフィールの更新に失敗しました」（説明にエラーの文）を出し、編集を続ける。「キャンセル」でストアの値に戻す。名前が空か空白だけのユーザーは、表示も「編集」の入力欄の初期値もメールアドレスになる（「未設定」は実際には出ない）。そのまま「保存」すると、メールアドレスが名前として保存される
- **AC-profile-11**: 画像のボタンでファイルを選ぶ（`image/*`）。MIME の種類が `image/` で始まらなければ「画像ファイルを選択してください」を出して何もしない。大きさの検査は無い。画像なら `avatars/<ユーザー ID>/avatar.<元のファイル名の拡張子を小文字にしたもの>` に上書きでアップロードし、公開 URL に `?t=<時刻>` を付けて `user_metadata.avatarUrl` に保存し、「プロフィール画像を更新しました」を出す。保存が成功し、かつ拡張子が前と違うときだけ、前の画像（今の `avatarUrl` の `avatars/` のあとのパス）を消す（消せなくても利用者には知らせない）
- **AC-profile-12**: 「アカウント削除」のカードは「この操作は取り消せません。すべてのデータが削除されます。」「アカウントを削除すると、これまで登録した工数や目標を含む全データが完全に削除されます。」と「アカウントを削除する」。押すと「本当にアカウントを削除しますか？」「この操作は元に戻せません。確認のため、メールアドレスを入力してください。」の確認を出し、入力がメールアドレスと**完全に一致する**（大文字小文字を区別する。入力欄は `type="email"` なので、前後の空白は HTML の仕様でブラウザが取り除く）ときだけ「削除する」を押せる。閉じると入力を消す
- **AC-profile-13**: 「削除する」で `DELETE /api/users/me` を送り、成功したらログアウトして「アカウントを削除しました。」を出し、`/login` に移る（履歴を置き換える）。失敗したら「アカウントの削除に失敗しました。」を出し、`error_logs` に送る

### API（`DELETE /api/users/me`、JWT）

- **AC-profile-14**: トークンのユーザーについて、(1) Auth の管理 API でユーザーを読む、(2) `user_metadata.avatarUrl` が `avatars/<自分の ID>/...` の公開 URL なら、そのフォルダの直下の画像の一覧を取る（サブフォルダの中は取らない）、(3) Auth のユーザーを消す、(4) 一覧の画像を消す、の順に行い、`204` を返す。トークンが無ければ 401。どれかが失敗すると 500（「Failed to fetch user before deletion」「Failed to list avatar files」「Failed to delete user」「Failed to delete avatar asset」）
- **AC-profile-15**: Auth のユーザーを消すと、そのユーザーの目標（と進捗の履歴）、ミッション、案件（とタスク、工数）、工数、ユーザー設定、下書きが外部キーの CASCADE で消える。`access_logs` の `user_id` は NULL になって行は残り（IP、パスも残る）、`error_logs`（ページの URL、User-Agent、`client_context` を含む）と `info_logs` も残る

## 画面と API

### 画面
- ルート: `/profile`（`packages/web/src/config/routes.ts`）
- 主な構成と操作: プロフィール画像（押すとファイルを選ぶ。`image/*` だけを受け付ける）、メールアドレス（表示だけ）、ユーザー名の編集、アカウント削除。ヘッダーのユーザーメニューの「プロフィール」から開く

### API
| メソッドとパス | 認証 | 入力 | 出力 | 主なエラー |
| --- | --- | --- | --- | --- |
| `DELETE /api/users/me` | JWT | なし | 204 | 401、500 |

画像の読み書きと名前の保存は API を通らない（ブラウザから Supabase Storage と Supabase Auth を直接呼ぶ）。全エンドポイントは `docs/reference/api.md`。

## データ

- Supabase Storage の `avatars` バケット（公開）。`<ユーザー ID>/avatar.<拡張子>`
- Auth の `user_metadata.avatarUrl`（画像の公開 URL。キャッシュを避けるため `?t=<時刻>` を付ける）、`user_metadata.name`
- `storage.objects` のポリシー（`authenticated` だけ。4 つとも本人のフォルダの条件）: `20261014000000_restrict_avatar_storage_to_own_folder.sql`
- アカウントの削除で外部キーの連鎖で消える各テーブル（INV-3）は [database.md](../../reference/database.md) を参照

## 設計不変条件

- **INV-1**: ブラウザ（`authenticated` のロール）から触れる Storage のオブジェクトは、パスの最初のフォルダが自分のユーザー ID（`auth.uid()`）と一致するものだけ。SELECT / INSERT / UPDATE / DELETE のすべてに同じ条件をかけ、UPDATE は移動先（`WITH CHECK`）にもかける。avatars に触れるポリシーをほかに足さない（permissive なポリシーは OR で効くので、1 つでも緩いものがあると絞り込みが無意味になる）。破ると、他人のプロフィール画像を差し替えたり消したりできる。4 つのポリシーとも、`client_id` の claim があるトークン（MCP のアプリに出した OAuth のトークン）を拒む（mcp の INV-mcp-2）
- **INV-2**: 画像の保存先の名前は `<ユーザー ID>/...` の形を保つ。フォルダの外や別の形に置くと、INV-1 のポリシーで本人も上書き・削除できなくなる。アカウント削除の後始末（`<ユーザー ID>/` の一覧）からも漏れる
- **INV-3**: アカウントの削除は、Auth のユーザーを消すことで DB のデータを外部キーの CASCADE に任せる。ユーザーを根とする表は `auth.users` に、子の表は親の表に `ON DELETE CASCADE` を付け、どこかで `auth.users` までつながるようにする。`user_id` を持つログの表（`access_logs`）は `SET NULL`。破ると、アカウントを消してもデータが残る

## エラー時の挙動

- アップロードに失敗したとき: 「プロフィール画像の更新に失敗しました」のトーストを出し、画像を元に戻す。エラーは `error_logs` に残る（`reportUiError`）
- プロフィールの保存（`avatarUrl` の更新）に失敗したとき: アップロードした画像を消して元に戻す
- 古い画像の削除に失敗したとき: 利用者には知らせず、`error_logs` に残す
- 名前の保存に失敗したとき: 「プロフィールの更新に失敗しました」（`error_logs` には、例外が起きたときだけ送る）
- 画像のアップロードのあと、`avatarUrl` の保存に失敗したとき: 「プロフィール画像の更新に失敗しました」ではなく「プロフィールの更新に失敗しました」（説明に Auth のエラーの文）を出す
- アカウントの削除に失敗したとき: 「アカウントの削除に失敗しました。」と `error_logs`

## 既知の落とし穴

- Supabase Storage の upsert には、INSERT に加えて SELECT と UPDATE のポリシーが要る。アップロードの結果を返すのにも SELECT が要り、無いと「new row violates row-level security policy」で失敗する
- 権限の無い削除はエラーにならず、空振り（消えた件数が 0）になる
- バケットは公開なので、公開 URL を知っていれば誰でも画像を見られる（ポリシーは公開 URL での読み出しにはかからない）
- `user_metadata.avatarUrl` が無いユーザーをアカウント削除しても、フォルダに画像が残っていれば消えない（今の挙動）
- **アカウントの削除は途中で失敗しても戻らない**: Auth のユーザーを消したあとに画像の削除が失敗すると、500 を返すがアカウントは消えている。画面は「アカウントの削除に失敗しました。」を出してログインのまま残り（開き直すと、ユーザーの確かめが失敗して `/landing` に移る見込み）、送り直すと 500（「Failed to fetch user before deletion」）が続く。画像も残る。2 回目の削除は、成功のあとでも 500 になる（ローカルの Supabase で確かめた）
- **アカウントの削除のたびにアクセスログの更新が失敗する**: 削除のリクエストのアクセスログに、消したユーザーの ID を入れようとして外部キーに反し、ステータスと時間が空のまま残り、`error_logs` に「Failed to update access log」が残る（確かめた）
- **削除のあとにストアと端末のデータを消さない**: ユーザーと設定のストア、SWR のキャッシュ、ユーザーごとの localStorage（`effort:entry:form`、`goals:add:draft`、`efforts:list:filters`、`goals:past:filters`）を消さない。ログアウトの失敗も見ない
- **削除の処理中も画像と名前を操作できる**: 削除の API が画像の一覧を取ったあとにアップロードが通ると、その画像は消されずに残る（タイミング次第。コードから）
- **名前が空のユーザーはメールアドレスが名前として保存されうる**: AC-10。一度保存すると、名前が未設定の状態に戻せない
- **削除の確認ダイアログは押した瞬間に閉じる**: 失敗したときもダイアログは閉じ、入力も消える
- **確認のメールアドレスの一致が厳しい**: 大文字小文字の違いがあると、押せない
- **画像の保存に失敗すると前の画像が消えることがある**: 拡張子が同じなら、アップロードで前の画像を上書きしている。そのあとプロフィールの保存に失敗すると、元に戻すためにアップロードした画像を消すので、前の画像も無くなり、`avatarUrl` は消えた画像を指す（コードから。未確認）。初めての画像の場合は、消した画像の URL が画面に残る
- **拡張子の無いファイル名**: 拡張子の既定（png）が効かず、保存先の名前が `avatar.<ファイル名を小文字にしたもの>` になる
- **名前の編集中に画像の保存が成功すると、入力中の名前がストアの名前に戻る**（編集のモードは続く。失敗したときは残る）
- 削除したユーザーの案件とタスクは、候補の一覧（マテリアライズドビュー）に次に作り直されるまで残る（ほかのユーザーには見えない）

## ポストモーテム

該当なし（v1.1.1 は、利用者が気づく症状の出ていない権限の穴の修正。経緯は改修の記録）

## テストとの対応

| AC | テスト | 種類 |
| --- | --- | --- |
| AC-profile-01〜08、INV-1（OAuth のトークンを含む） | `packages/api/test/avatar-storage.int.test.ts`（ブラウザと同じ権限のクライアントで Storage を呼ぶ） | 結合 |
| INV-1（古いポリシーの残り） | マイグレーションの最後の検査（残っていればエラーで止まる） | 適用時 |
| AC-profile-09〜13 | `packages/web/src/pages/profile/ProfilePage.test.tsx`（`@/lib/auth` と `@/lib/storage` を差し替える） | 部品 |
| AC-profile-14、15、INV-3 | `packages/api/test/account-deletion.int.test.ts`（CASCADE で消えること、アクセスログが残ること、画像の無いユーザー、401）、`avatar-storage.int.test.ts`（画像のあるユーザー） | 結合 |
| AC-profile-14（各段の失敗の 500 と順番） | `packages/api/src/features/users/service.test.ts`（Supabase のクライアントを差し替える） | 単体 |

既知の落とし穴のうち、今の振る舞いをテストで固めたもの（P6 で直すときにテストを書き換える）: ユーザーを消したあとの画像の削除の失敗で 500（AC-14）、確認の一致が大文字小文字まで厳しい（AC-12）、名前を前後の空白ごと保存する（AC-10）。

## 変更履歴

| バージョン | 日付 | 内容 | 改修の記録 |
| --- | --- | --- | --- |
| v1.0.7 | 2026-10-15 | 移行時点の基準（ユーザー名、画像のアップロードの画面、アカウントの削除の節を足した） | [v1.0.7-baseline](changes/v1.0.7-baseline.md) |
| v1.1.1 | 2026-10-14 | プロフィール画像の保存先の権限を、本人のフォルダだけに絞った。この spec.md をプロフィール画像の保存の部分から作成 | [v1.1.1-avatar-storage-own-folder](changes/v1.1.1-avatar-storage-own-folder.md) |
| v1.2.0 | 2026-10-16 | MCP のアプリに出した OAuth のトークン（`client_id` あり）では、自分のフォルダでも読み書きできないようにした（INV-1 に追記） | [mcp v1.2.0-mcp-server](../mcp/changes/v1.2.0-mcp-server.md) |
