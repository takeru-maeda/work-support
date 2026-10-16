-- 基準のマイグレーション（2026-10-13 時点の本番の DB から作成）
--
-- public スキーマは、本番を `supabase db dump --schema public` で書き出したものをそのまま使っている。
-- 末尾に、avatars バケットとその storage ポリシー（本番と同じもの）を足した。
-- これより前の手書きのマイグレーション（0000_initial_schema.sql）は、本番と食い違っていたため置き換えた。
-- 経緯: docs/plans/active/harness-migration.md の P3




SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."log_level" AS ENUM (
    'DEBUG',
    'INFO',
    'WARNING',
    'ERROR',
    'CRITICAL'
);


ALTER TYPE "public"."log_level" OWNER TO "postgres";


CREATE TYPE "public"."log_source" AS ENUM (
    'API',
    'UI'
);


ALTER TYPE "public"."log_source" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_projects_with_tasks_mv"() RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    AS $$REFRESH MATERIALIZED VIEW projects_with_tasks_mv;$$;


ALTER FUNCTION "public"."refresh_projects_with_tasks_mv"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."access_logs" (
    "id" bigint NOT NULL,
    "user_id" "uuid",
    "ip_address" "inet",
    "method" "text" NOT NULL,
    "path" "text" NOT NULL,
    "status_code" integer,
    "received_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "duration_ms" integer
);


ALTER TABLE "public"."access_logs" OWNER TO "postgres";


ALTER TABLE "public"."access_logs" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."access_logs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."error_logs" (
    "id" bigint NOT NULL,
    "access_log_id" bigint NOT NULL,
    "level" "public"."log_level" NOT NULL,
    "message" "text" NOT NULL,
    "stack_trace" "text",
    "source" "public"."log_source" DEFAULT 'API'::"public"."log_source" NOT NULL,
    "user_agent" "text",
    "page_url" "text",
    "app_version" "text",
    "client_context" "jsonb",
    "timestamp" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."error_logs" OWNER TO "postgres";


ALTER TABLE "public"."error_logs" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."error_logs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."goal_progress_histories" (
    "id" bigint NOT NULL,
    "goal_id" bigint NOT NULL,
    "progress" numeric(5,2) NOT NULL,
    "recorded_at" timestamp with time zone NOT NULL,
    CONSTRAINT "goal_progress_histories_progress_check" CHECK ((("progress" >= (0)::numeric) AND ("progress" <= (100)::numeric)))
);


ALTER TABLE "public"."goal_progress_histories" OWNER TO "postgres";


ALTER TABLE "public"."goal_progress_histories" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."goal_progress_histories_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."goals" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "weight" numeric(5,2) NOT NULL,
    "progress" numeric(5,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "goals_progress_check" CHECK ((("progress" >= (0)::numeric) AND ("progress" <= (100)::numeric))),
    CONSTRAINT "goals_weight_check" CHECK ((("weight" >= (0)::numeric) AND ("weight" <= (100)::numeric)))
);


ALTER TABLE "public"."goals" OWNER TO "postgres";


ALTER TABLE "public"."goals" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."goals_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."info_logs" (
    "id" bigint NOT NULL,
    "access_log_id" bigint NOT NULL,
    "level" "public"."log_level" NOT NULL,
    "message" "text" NOT NULL,
    "timestamp" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."info_logs" OWNER TO "postgres";


ALTER TABLE "public"."info_logs" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."info_logs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."missions" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "content" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."missions" OWNER TO "postgres";


ALTER TABLE "public"."missions" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."missions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


ALTER TABLE "public"."projects" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."projects_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" bigint NOT NULL,
    "project_id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tasks" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "public"."projects_with_tasks_mv" AS
 SELECT "p"."user_id",
    "p"."id" AS "project_id",
    "p"."name" AS "project_name",
    "p"."created_at" AS "project_created_at",
    "t"."id" AS "task_id",
    "t"."name" AS "task_name",
    "t"."created_at" AS "task_created_at"
   FROM ("public"."projects" "p"
     LEFT JOIN "public"."tasks" "t" ON (("t"."project_id" = "p"."id")))
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."projects_with_tasks_mv" OWNER TO "postgres";


ALTER TABLE "public"."tasks" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."tasks_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."user_settings" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "notify_effort_email" boolean DEFAULT true NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_settings" OWNER TO "postgres";


ALTER TABLE "public"."user_settings" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."user_settings_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."work_entry_drafts" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "entries" "jsonb" NOT NULL,
    "memo" "text",
    "client_updated_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."work_entry_drafts" OWNER TO "postgres";


ALTER TABLE "public"."work_entry_drafts" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."work_entry_drafts_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."work_records" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "task_id" bigint NOT NULL,
    "work_date" "date" NOT NULL,
    "hours" numeric(4,2) NOT NULL,
    "estimated_hours" numeric(4,2),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."work_records" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."work_record_diffs" WITH ("security_invoker"='on') AS
 SELECT "wr"."id",
    "wr"."user_id",
    "wr"."task_id",
    "t"."project_id",
    "wr"."work_date",
    "wr"."hours",
    "wr"."estimated_hours",
        CASE
            WHEN ("wr"."estimated_hours" IS NULL) THEN NULL::numeric
            ELSE ("wr"."hours" - "wr"."estimated_hours")
        END AS "hours_diff",
    "wr"."created_at",
    "t"."name" AS "task_name",
    "p"."name" AS "project_name"
   FROM (("public"."work_records" "wr"
     JOIN "public"."tasks" "t" ON (("t"."id" = "wr"."task_id")))
     JOIN "public"."projects" "p" ON (("p"."id" = "t"."project_id")));


ALTER VIEW "public"."work_record_diffs" OWNER TO "postgres";


ALTER TABLE "public"."work_records" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."work_records_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE ONLY "public"."access_logs"
    ADD CONSTRAINT "access_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."error_logs"
    ADD CONSTRAINT "error_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."goal_progress_histories"
    ADD CONSTRAINT "goal_progress_histories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."goals"
    ADD CONSTRAINT "goals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."info_logs"
    ADD CONSTRAINT "info_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."missions"
    ADD CONSTRAINT "missions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."missions"
    ADD CONSTRAINT "missions_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_user_id_name_key" UNIQUE ("user_id", "name");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_project_id_name_key" UNIQUE ("project_id", "name");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."work_entry_drafts"
    ADD CONSTRAINT "work_entry_drafts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."work_entry_drafts"
    ADD CONSTRAINT "work_entry_drafts_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."work_records"
    ADD CONSTRAINT "work_records_pkey" PRIMARY KEY ("id");



CREATE INDEX "goal_progress_histories_goal_id_recorded_at_idx" ON "public"."goal_progress_histories" USING "btree" ("goal_id", "recorded_at");



CREATE INDEX "goals_user_id_idx" ON "public"."goals" USING "btree" ("user_id");



CREATE INDEX "projects_user_id_idx" ON "public"."projects" USING "btree" ("user_id");



CREATE INDEX "projects_with_tasks_mv_project_id_idx" ON "public"."projects_with_tasks_mv" USING "btree" ("project_id");



CREATE UNIQUE INDEX "projects_with_tasks_mv_unique_idx" ON "public"."projects_with_tasks_mv" USING "btree" ("user_id", "project_id", COALESCE("task_id", ('-1'::integer)::bigint));



CREATE INDEX "projects_with_tasks_mv_user_id_idx" ON "public"."projects_with_tasks_mv" USING "btree" ("user_id");



CREATE INDEX "tasks_project_id_idx" ON "public"."tasks" USING "btree" ("project_id");



CREATE UNIQUE INDEX "user_settings_user_id_idx" ON "public"."user_settings" USING "btree" ("user_id");



CREATE UNIQUE INDEX "work_entry_drafts_user_id_idx" ON "public"."work_entry_drafts" USING "btree" ("user_id");



CREATE INDEX "work_records_user_id_work_date_idx" ON "public"."work_records" USING "btree" ("user_id", "work_date");



ALTER TABLE ONLY "public"."access_logs"
    ADD CONSTRAINT "access_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."error_logs"
    ADD CONSTRAINT "error_logs_access_log_id_fkey" FOREIGN KEY ("access_log_id") REFERENCES "public"."access_logs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goal_progress_histories"
    ADD CONSTRAINT "goal_progress_histories_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goals"
    ADD CONSTRAINT "goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."info_logs"
    ADD CONSTRAINT "info_logs_access_log_id_fkey" FOREIGN KEY ("access_log_id") REFERENCES "public"."access_logs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."missions"
    ADD CONSTRAINT "missions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."work_entry_drafts"
    ADD CONSTRAINT "work_entry_drafts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."work_records"
    ADD CONSTRAINT "work_records_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."work_records"
    ADD CONSTRAINT "work_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE "public"."access_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."error_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."goal_progress_histories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."goals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."info_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."missions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."work_entry_drafts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."work_records" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_projects_with_tasks_mv"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_projects_with_tasks_mv"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_projects_with_tasks_mv"() TO "service_role";



GRANT ALL ON TABLE "public"."access_logs" TO "anon";
GRANT ALL ON TABLE "public"."access_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."access_logs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."access_logs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."access_logs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."access_logs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."error_logs" TO "anon";
GRANT ALL ON TABLE "public"."error_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."error_logs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."error_logs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."error_logs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."error_logs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."goal_progress_histories" TO "anon";
GRANT ALL ON TABLE "public"."goal_progress_histories" TO "authenticated";
GRANT ALL ON TABLE "public"."goal_progress_histories" TO "service_role";



GRANT ALL ON SEQUENCE "public"."goal_progress_histories_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."goal_progress_histories_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."goal_progress_histories_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."goals" TO "anon";
GRANT ALL ON TABLE "public"."goals" TO "authenticated";
GRANT ALL ON TABLE "public"."goals" TO "service_role";



GRANT ALL ON SEQUENCE "public"."goals_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."goals_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."goals_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."info_logs" TO "anon";
GRANT ALL ON TABLE "public"."info_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."info_logs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."info_logs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."info_logs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."info_logs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."missions" TO "anon";
GRANT ALL ON TABLE "public"."missions" TO "authenticated";
GRANT ALL ON TABLE "public"."missions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."missions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."missions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."missions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON SEQUENCE "public"."projects_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."projects_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."projects_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."tasks" TO "anon";
GRANT ALL ON TABLE "public"."tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks" TO "service_role";



GRANT ALL ON TABLE "public"."projects_with_tasks_mv" TO "anon";
GRANT ALL ON TABLE "public"."projects_with_tasks_mv" TO "authenticated";
GRANT ALL ON TABLE "public"."projects_with_tasks_mv" TO "service_role";



GRANT ALL ON SEQUENCE "public"."tasks_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."tasks_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."tasks_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_settings" TO "anon";
GRANT ALL ON TABLE "public"."user_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."user_settings" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_settings_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_settings_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_settings_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."work_entry_drafts" TO "anon";
GRANT ALL ON TABLE "public"."work_entry_drafts" TO "authenticated";
GRANT ALL ON TABLE "public"."work_entry_drafts" TO "service_role";



GRANT ALL ON SEQUENCE "public"."work_entry_drafts_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."work_entry_drafts_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."work_entry_drafts_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."work_records" TO "anon";
GRANT ALL ON TABLE "public"."work_records" TO "authenticated";
GRANT ALL ON TABLE "public"."work_records" TO "service_role";



GRANT ALL ON TABLE "public"."work_record_diffs" TO "anon";
GRANT ALL ON TABLE "public"."work_record_diffs" TO "authenticated";
GRANT ALL ON TABLE "public"."work_record_diffs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."work_records_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."work_records_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."work_records_id_seq" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";


-- ---------------------------------------------------------------------------
-- Storage: プロフィール画像（avatars）
-- バケットの設定は本番のダッシュボードで確認できなかったため、公開・制限なしとしている
-- （コードは getPublicUrl で公開 URL を使う）。

INSERT INTO "storage"."buckets" ("id", "name", "public")
VALUES ('avatars', 'avatars', true)
ON CONFLICT ("id") DO NOTHING;

-- TODO: 認証済みのユーザーなら、ほかのユーザーのファイルも読み書き・削除できる範囲になっている。
-- 自分のフォルダ（avatars/<user_id>/）に絞るのは、改修の記録を通して行う（ハーネス移行計画を参照）
CREATE POLICY "Allow authenticated users to manage avatars 1oj01fe_0" ON "storage"."objects" FOR SELECT TO "authenticated" USING (("bucket_id" = 'avatars'::"text"));
CREATE POLICY "Allow authenticated users to manage avatars 1oj01fe_1" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK (("bucket_id" = 'avatars'::"text"));
CREATE POLICY "Allow authenticated users to manage avatars 1oj01fe_2" ON "storage"."objects" FOR UPDATE TO "authenticated" USING (("bucket_id" = 'avatars'::"text"));
CREATE POLICY "Allow authenticated users to manage avatars 1oj01fe_3" ON "storage"."objects" FOR DELETE TO "authenticated" USING (("bucket_id" = 'avatars'::"text"));
