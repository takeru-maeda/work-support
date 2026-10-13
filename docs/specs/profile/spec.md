---
title: プロフィール（プロフィール画像、ユーザー名、アカウント削除）
feature: profile
status: current
updated: 2026-10-14
code:
  - packages/web/src/lib/storage.ts :: uploadAvatarImage
  - packages/web/src/lib/storage.ts :: deleteAvatarImage
  - packages/web/src/features/profile/hooks/modules/useAvatarUpload.ts :: useAvatarUpload
  - packages/api/src/features/users/service.ts :: deleteCurrentUserAccount
  - packages/api/supabase/migrations/20261014000000_restrict_avatar_storage_to_own_folder.sql
related: [auth]
symptoms:
  - プロフィール画像を変更すると「プロフィール画像の更新に失敗しました」と出る
---

# プロフィール（プロフィール画像、ユーザー名、アカウント削除）

> **作成中**: 今は「プロフィール画像の保存」だけを書いている。ユーザー名の変更とアカウント削除の画面の振る舞いは、ハーネス移行計画の P5 で旧ドキュメント（`docs/legacy/specs/`）とコードから埋める。それまでは該当するコードを正とする。

## TL;DR・改修前の必読

- プロフィールの画面（`/profile`）で、プロフィール画像、ユーザー名を変え、アカウントを削除する
- プロフィール画像は、**ブラウザから本人のトークンで Supabase Storage を直接読み書きする**（API を通らない）。守りは Storage のポリシーだけ
- ⚠️ 画像の保存先やポリシーを変えるときは [§設計不変条件](#設計不変条件) を読む。ここを壊すと、他人のプロフィール画像を差し替えたり消したりできる

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

## 画面と API

### 画面
- ルート: `/profile`（`packages/web/src/config/routes.ts`）
- 主な構成と操作: プロフィール画像（押すとファイルを選ぶ。`image/*` だけを受け付ける）、メールアドレス、ユーザー名の編集、アカウント削除

### API
| メソッドとパス | 認証 | 入力 | 出力 | 主なエラー |
| --- | --- | --- | --- | --- |
| `DELETE /api/users/me` | JWT | なし | 204 | 401、500 |

画像の読み書きは API を通らない（ブラウザから Supabase Storage を直接呼ぶ）。全エンドポイントは `docs/reference/api.md`。

## データ

- Supabase Storage の `avatars` バケット（公開）。`<ユーザー ID>/avatar.<拡張子>`
- Auth の `user_metadata.avatarUrl`（画像の公開 URL。キャッシュを避けるため `?t=<時刻>` を付ける）、`user_metadata.name`
- `storage.objects` のポリシー（`authenticated` だけ。4 つとも本人のフォルダの条件）: `20261014000000_restrict_avatar_storage_to_own_folder.sql`

## 設計不変条件

- **INV-1**: ブラウザ（`authenticated` のロール）から触れる Storage のオブジェクトは、パスの最初のフォルダが自分のユーザー ID（`auth.uid()`）と一致するものだけ。SELECT / INSERT / UPDATE / DELETE のすべてに同じ条件をかけ、UPDATE は移動先（`WITH CHECK`）にもかける。avatars に触れるポリシーをほかに足さない（permissive なポリシーは OR で効くので、1 つでも緩いものがあると絞り込みが無意味になる）。破ると、他人のプロフィール画像を差し替えたり消したりできる
- **INV-2**: 画像の保存先の名前は `<ユーザー ID>/...` の形を保つ。フォルダの外や別の形に置くと、INV-1 のポリシーで本人も上書き・削除できなくなる。アカウント削除の後始末（`<ユーザー ID>/` の一覧）からも漏れる

## エラー時の挙動

- アップロードに失敗したとき: 「プロフィール画像の更新に失敗しました」のトーストを出し、画像を元に戻す。エラーは `error_logs` に残る（`reportUiError`）
- プロフィールの保存（`avatarUrl` の更新）に失敗したとき: アップロードした画像を消して元に戻す
- 古い画像の削除に失敗したとき: 利用者には知らせず、`error_logs` に残す

## 既知の落とし穴

- Supabase Storage の upsert には、INSERT に加えて SELECT と UPDATE のポリシーが要る。アップロードの結果を返すのにも SELECT が要り、無いと「new row violates row-level security policy」で失敗する
- 権限の無い削除はエラーにならず、空振り（消えた件数が 0）になる
- バケットは公開なので、公開 URL を知っていれば誰でも画像を見られる（ポリシーは公開 URL での読み出しにはかからない）
- `user_metadata.avatarUrl` が無いユーザーをアカウント削除しても、フォルダに画像が残っていれば消えない（今の挙動）

## ポストモーテム

該当なし（v1.1.1 は、利用者が気づく症状の出ていない権限の穴の修正。経緯は改修の記録）

## テストとの対応

| AC | テスト | 種類 |
| --- | --- | --- |
| AC-profile-01〜08、INV-1 | `packages/api/test/avatar-storage.int.test.ts`（ブラウザと同じ権限のクライアントで Storage を呼ぶ） | 結合 |
| INV-1（古いポリシーの残り） | マイグレーションの最後の検査（残っていればエラーで止まる） | 適用時 |

## 変更履歴

| バージョン | 日付 | 内容 | 改修の記録 |
| --- | --- | --- | --- |
| v1.1.1 | 2026-10-14 | プロフィール画像の保存先の権限を、本人のフォルダだけに絞った。この spec.md をプロフィール画像の保存の部分から作成 | [v1.1.1-avatar-storage-own-folder](changes/v1.1.1-avatar-storage-own-folder.md) |
