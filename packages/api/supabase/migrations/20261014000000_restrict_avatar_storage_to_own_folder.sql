-- プロフィール画像（avatars バケット）の storage ポリシーを、本人のフォルダ（<ユーザー ID>/）だけに絞る。
-- web はブラウザから本人のトークンで直接読み書きするので、守りはこのポリシーだけ。基準のマイグレーションの
-- ポリシーは「avatars バケットであること」しか見ておらず、ログインしている人なら他人の画像も上書き・削除できた。
-- 改修の記録: docs/specs/profile/changes/v1.1.1-avatar-storage-own-folder.md
--
-- - SELECT も絞る。上書き（upsert）とアップロードの結果の返却に要る。画像の表示は公開 URL で、ポリシーを通らない
-- - UPDATE は移動先（WITH CHECK）にも同じ条件をかけ、自分の画像を他人のフォルダへ移せないようにする
-- - auth.uid() は select で包み、行ごとではなく 1 回だけ評価させる
-- - service role（API のアカウント削除）はポリシーを通らないので影響しない

DROP POLICY IF EXISTS "Allow authenticated users to manage avatars 1oj01fe_0" ON "storage"."objects";
DROP POLICY IF EXISTS "Allow authenticated users to manage avatars 1oj01fe_1" ON "storage"."objects";
DROP POLICY IF EXISTS "Allow authenticated users to manage avatars 1oj01fe_2" ON "storage"."objects";
DROP POLICY IF EXISTS "Allow authenticated users to manage avatars 1oj01fe_3" ON "storage"."objects";

CREATE POLICY "Users can read their own avatars" ON "storage"."objects"
  FOR SELECT TO "authenticated"
  USING (
    "bucket_id" = 'avatars'
    AND ("storage"."foldername"("name"))[1] = (SELECT "auth"."uid"()::"text")
  );

CREATE POLICY "Users can upload their own avatars" ON "storage"."objects"
  FOR INSERT TO "authenticated"
  WITH CHECK (
    "bucket_id" = 'avatars'
    AND ("storage"."foldername"("name"))[1] = (SELECT "auth"."uid"()::"text")
  );

CREATE POLICY "Users can update their own avatars" ON "storage"."objects"
  FOR UPDATE TO "authenticated"
  USING (
    "bucket_id" = 'avatars'
    AND ("storage"."foldername"("name"))[1] = (SELECT "auth"."uid"()::"text")
  )
  WITH CHECK (
    "bucket_id" = 'avatars'
    AND ("storage"."foldername"("name"))[1] = (SELECT "auth"."uid"()::"text")
  );

CREATE POLICY "Users can delete their own avatars" ON "storage"."objects"
  FOR DELETE TO "authenticated"
  USING (
    "bucket_id" = 'avatars'
    AND ("storage"."foldername"("name"))[1] = (SELECT "auth"."uid"()::"text")
  );

-- 消したつもりの古いポリシーが、名前の違いで残っていないかを確かめる。permissive なポリシーは OR で
-- 効くので、avatars に触れるポリシーが 1 つでも残ると絞り込みが無意味になる。残っていればエラーにして、
-- このマイグレーション全体を取り消す（穴が残ったまま「成功」させない）
DO $$
DECLARE
  leftover text;
BEGIN
  SELECT string_agg("policyname", ', ') INTO leftover
  FROM "pg_policies"
  WHERE "schemaname" = 'storage'
    AND "tablename" = 'objects'
    AND (coalesce("qual", '') || coalesce("with_check", '')) LIKE '%avatars%'
    AND "policyname" NOT IN (
      'Users can read their own avatars',
      'Users can upload their own avatars',
      'Users can update their own avatars',
      'Users can delete their own avatars'
    );
  IF leftover IS NOT NULL THEN
    RAISE EXCEPTION 'avatars バケットに触れる古いポリシーが残っています: %。名前を確かめて DROP してから、もう一度適用してください', leftover;
  END IF;
END
$$;
