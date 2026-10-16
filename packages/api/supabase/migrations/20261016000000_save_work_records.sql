-- 1 回の工数の送信を、1 つのトランザクションで保存する（docs/specs/effort-entry/changes/v1.1.3-atomic-save.md）。
-- 行ごとに PostgREST へ書き込むと、途中の失敗で前の行と作った案件・タスクが残り、送り直すと 2 重になるため。
--
-- p_entries は [{ project_id, project_name, task_id, task_name, estimated_hours, hours }]。
-- 名前の空白の除去、時間の範囲の検査は service が先に済ませる（ここでは DB を読まないとわからないことだけを確かめる）。
-- 見つからないときは決まった SQLSTATE（WS001: 案件、WS002: タスク）で例外を投げ、service が 400 の文に使う。
-- 返り値は入力の順に [{ entry_id, project_id, project_name, task_id, task_name, hours, estimated_hours,
-- project_created, task_created }]（hours と estimated_hours は列で丸めたあとの値）。

create or replace function public.save_work_records(
  p_user_id uuid,
  p_work_date date,
  p_entries jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_entry jsonb;
  v_project_id bigint;
  v_project_name text;
  v_project_created boolean;
  v_task_id bigint;
  v_task_name text;
  v_task_created boolean;
  v_record public.work_records;
  v_saved jsonb := '[]'::jsonb;
begin
  for v_entry in
    select e.value from jsonb_array_elements(p_entries) with ordinality as e(value, ord) order by e.ord
  loop
    -- 案件: ID ならそのユーザーの案件か確かめる。名前なら（大文字小文字を区別して）探し、無ければ作る
    if v_entry->>'project_id' is not null then
      select p.id, p.name into v_project_id, v_project_name
        from public.projects p
       where p.id = (v_entry->>'project_id')::bigint
         and p.user_id = p_user_id;
      if not found then
        raise exception using errcode = 'WS001', message = '指定した案件が見つかりませんでした。';
      end if;
      v_project_created := false;
    else
      v_project_name := v_entry->>'project_name';
      -- 既にあればその行を返す（同じ名前を同時に作る送信があっても、一意の制約で失敗せず、行が必ず返る）。
      -- 名前を同じ値で上書きするだけなので中身は変わらない。xmax = 0 は、この文で挿入した行であること
      insert into public.projects (user_id, name)
      values (p_user_id, v_project_name)
      on conflict (user_id, name) do update set name = excluded.name
      returning id, (xmax = 0) into v_project_id, v_project_created;
    end if;

    -- タスク: ID なら決めた案件のタスクか確かめる（同じ送信の中の使い回しも含めて毎回）。名前なら案件と同じ
    if v_entry->>'task_id' is not null then
      select t.id, t.name into v_task_id, v_task_name
        from public.tasks t
       where t.id = (v_entry->>'task_id')::bigint
         and t.project_id = v_project_id;
      if not found then
        raise exception using errcode = 'WS002', message = '指定したタスクが見つかりませんでした。';
      end if;
      v_task_created := false;
    else
      v_task_name := v_entry->>'task_name';
      insert into public.tasks (project_id, name)
      values (v_project_id, v_task_name)
      on conflict (project_id, name) do update set name = excluded.name
      returning id, (xmax = 0) into v_task_id, v_task_created;
    end if;

    insert into public.work_records (user_id, task_id, work_date, hours, estimated_hours)
    values (
      p_user_id,
      v_task_id,
      p_work_date,
      (v_entry->>'hours')::numeric,
      (v_entry->>'estimated_hours')::numeric
    )
    returning * into v_record;

    v_saved := v_saved || jsonb_build_array(jsonb_build_object(
      'entry_id', v_record.id,
      'project_id', v_project_id,
      'project_name', v_project_name,
      'task_id', v_task_id,
      'task_name', v_task_name,
      'hours', v_record.hours,
      'estimated_hours', v_record.estimated_hours,
      'project_created', v_project_created,
      'task_created', v_task_created
    ));
  end loop;

  return v_saved;
end;
$$;

-- 引数でユーザー ID を受け取るので、API（service_role）からだけ呼べるようにする。
-- baseline の既定の権限（ALTER DEFAULT PRIVILEGES … GRANT ALL ON FUNCTIONS TO anon, authenticated）を外す
revoke all on function public.save_work_records(uuid, date, jsonb) from public, anon, authenticated;
grant execute on function public.save_work_records(uuid, date, jsonb) to service_role;
