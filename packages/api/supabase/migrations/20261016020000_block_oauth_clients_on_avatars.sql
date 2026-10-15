-- MCP のクライアント（Supabase の OAuth 2.1 サーバーがトークンを出したアプリ）からは、
-- プロフィール画像（avatars バケット）を読み書きできないようにする（docs/specs/mcp/changes/v1.2.0-mcp-server.md）。
-- OAuth のトークンもふつうのログインと同じ authenticated のトークンなので、そのままでは web と同じく
-- 自分のフォルダに書き込み・削除できる（ローカルの Supabase で確かめた）。MCP のツールに画像の操作は無く、
-- アプリに渡したトークンでできることを MCP のツールだけに絞るため、client_id の claim があるトークンを拒む。
--
-- - web のトークンには client_id が無いので、今までどおり（20261014000000 の本人のフォルダだけの条件）
-- - auth.jwt() は select で包み、行ごとではなく 1 回だけ評価させる

ALTER POLICY "Users can read their own avatars" ON "storage"."objects"
  USING (
    "bucket_id" = 'avatars'
    AND ("storage"."foldername"("name"))[1] = (SELECT "auth"."uid"()::"text")
    AND ((SELECT "auth"."jwt"()) ->> 'client_id') IS NULL
  );

ALTER POLICY "Users can upload their own avatars" ON "storage"."objects"
  WITH CHECK (
    "bucket_id" = 'avatars'
    AND ("storage"."foldername"("name"))[1] = (SELECT "auth"."uid"()::"text")
    AND ((SELECT "auth"."jwt"()) ->> 'client_id') IS NULL
  );

ALTER POLICY "Users can update their own avatars" ON "storage"."objects"
  USING (
    "bucket_id" = 'avatars'
    AND ("storage"."foldername"("name"))[1] = (SELECT "auth"."uid"()::"text")
    AND ((SELECT "auth"."jwt"()) ->> 'client_id') IS NULL
  )
  WITH CHECK (
    "bucket_id" = 'avatars'
    AND ("storage"."foldername"("name"))[1] = (SELECT "auth"."uid"()::"text")
    AND ((SELECT "auth"."jwt"()) ->> 'client_id') IS NULL
  );

ALTER POLICY "Users can delete their own avatars" ON "storage"."objects"
  USING (
    "bucket_id" = 'avatars'
    AND ("storage"."foldername"("name"))[1] = (SELECT "auth"."uid"()::"text")
    AND ((SELECT "auth"."jwt"()) ->> 'client_id') IS NULL
  );
