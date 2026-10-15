-- 目標の期間を、すべての目標とともに 1 つのトランザクションで作る（docs/specs/goals/changes/v1.2.0-goal-period-api.md）。
-- 1 件ずつ作ると、途中の失敗で一部の目標だけが残り、重みの合計が 100 にならない期間ができるため。
--
-- p_goals は [{ title, content, weight }]。期間の前後、目標名、重みの合計は service が先に確かめる
-- （入力だけで決まるので、ここでは比べ直さない）。
-- ここで確かめるのは、同時の送信で結果が変わる「現在の期間との重なり」だけ。ユーザーごとのロックを取ってから
-- 比べ直すので、service の確認とこの関数の間に別の期間が作られても、重なった期間は作られない。
-- 重なっていたら SQLSTATE WG001 の例外を投げ、detail に現在の期間の終了日（YYYY-MM-DD）を入れる。
-- 返り値は作った goals の行の配列（入力の順）。

create or replace function public.create_goal_period(
  p_user_id uuid,
  p_start_date date,
  p_end_date date,
  p_goals jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_latest_end_date date;
  v_goal jsonb;
  v_row public.goals;
  v_created jsonb := '[]'::jsonb;
begin
  -- トランザクションの終わりまで、同じユーザーの期間の作成を 1 つずつにする
  perform pg_advisory_xact_lock(hashtextextended('create_goal_period:' || p_user_id::text, 0));

  select max(g.end_date) into v_latest_end_date
    from public.goals g
   where g.user_id = p_user_id;

  if v_latest_end_date is not null and p_start_date <= v_latest_end_date then
    raise exception using
      errcode = 'WG001',
      message = 'goal period overlaps the current period',
      detail = to_char(v_latest_end_date, 'YYYY-MM-DD');
  end if;

  for v_goal in
    select e.value from jsonb_array_elements(p_goals) with ordinality as e(value, ord) order by e.ord
  loop
    insert into public.goals (user_id, title, content, start_date, end_date, weight, progress)
    values (
      p_user_id,
      v_goal->>'title',
      v_goal->>'content',
      p_start_date,
      p_end_date,
      (v_goal->>'weight')::numeric,
      0
    )
    returning * into v_row;

    v_created := v_created || jsonb_build_array(to_jsonb(v_row));
  end loop;

  return v_created;
end;
$$;

-- 引数でユーザー ID を受け取るので、API（service_role）からだけ呼べるようにする。
-- baseline の既定の権限（ALTER DEFAULT PRIVILEGES … GRANT ALL ON FUNCTIONS TO anon, authenticated）を外す
revoke all on function public.create_goal_period(uuid, date, date, jsonb) from public, anon, authenticated;
grant execute on function public.create_goal_period(uuid, date, date, jsonb) to service_role;
