-- =====================================================================
-- v2: 재협업 3단계(업무/태도), 세션 상태, 360 -> 인사이트 인원 동기화
-- =====================================================================

-- ---------- columns ----------
alter table public.sessions
  add column if not exists status text not null default '진행중';

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'sessions_status_check') then
    alter table public.sessions
      add constraint sessions_status_check check (status in ('진행중', '완료'));
  end if;
end $$;

alter table public.feedbacks
  add column if not exists work_rehire text
    check (work_rehire in ('좋아요', '그저그래요', '싫어요'));
alter table public.feedbacks
  add column if not exists personal_rehire text
    check (personal_rehire in ('좋아요', '그저그래요', '싫어요'));

-- 시그니처가 바뀌는 함수는 삭제 후 재생성 (오버로드 충돌 방지)
drop function if exists public.member_save_feedback(text, text, uuid, uuid, text, text, boolean);
drop function if exists public.admin_update_session(text, text, uuid, text, jsonb);

-- ---------- internal helper: 360 -> 인사이트 (단방향, 삭제 없음) ----------
create or replace function public._sync_360_to_insight(p_sid uuid)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare v_year text; v_type text; v_isid uuid;
begin
  select year, type into v_year, v_type from sessions where id = p_sid;
  if v_type is distinct from '360도 다면 피드백' then return; end if;

  select id into v_isid from sessions where year = v_year and type = '인사이트 피드백';
  if v_isid is null then return; end if;

  insert into session_members (session_id, member_id)
  select v_isid, member_id from session_members where session_id = p_sid
  on conflict do nothing;
end $$;

revoke execute on function public._sync_360_to_insight(uuid) from public, anon, authenticated;

-- ---------- 직원용 ----------
create or replace function public.member_get_sessions(p_name text, p_code text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid; r json;
begin
  v_id := _auth_member(p_name, p_code);
  select coalesce(json_agg(json_build_object(
    'id', s.id, 'year', s.year, 'type', s.type, 'period', s.period, 'status', s.status,
    'members', (
      select coalesce(json_agg(json_build_object('id', m.id, 'name', m.name, 'team', m.team) order by m.team, m.name), '[]'::json)
        from session_members sm2 join members m on m.id = sm2.member_id
       where sm2.session_id = s.id),
    'myFeedbacks', (
      select coalesce(json_agg(json_build_object(
               'targetId', f.target_id, 'good', f.good, 'suggestions', f.suggestions, 'rehire', f.rehire,
               'workRehire', coalesce(f.work_rehire, case when f.rehire is true then '좋아요' when f.rehire is false then '싫어요' end),
               'personalRehire', coalesce(f.personal_rehire, case when f.rehire is true then '좋아요' when f.rehire is false then '싫어요' end)
             )), '[]'::json)
        from feedbacks f where f.session_id = s.id and f.author_id = v_id),
    'myInsight', (select i.content from insights i where i.session_id = s.id and i.author_id = v_id)
  ) order by s.year desc), '[]'::json)
  into r
  from sessions s join session_members sm on sm.session_id = s.id
  where sm.member_id = v_id;
  return r;
end $$;

create or replace function public.member_save_feedback(
  p_name text, p_code text, p_session uuid, p_target uuid, p_good text, p_sug text, p_rehire boolean,
  p_work text default null, p_personal text default null)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid;
begin
  v_id := _auth_member(p_name, p_code);
  if v_id = p_target then raise exception 'SELF_FEEDBACK'; end if;
  if not exists (select 1 from session_members where session_id = p_session and member_id = v_id)
     or not exists (select 1 from session_members where session_id = p_session and member_id = p_target) then
    raise exception 'NOT_IN_SESSION';
  end if;
  insert into feedbacks (session_id, target_id, author_id, good, suggestions, rehire, work_rehire, personal_rehire)
  values (p_session, p_target, v_id, coalesce(p_good, ''), coalesce(p_sug, ''), p_rehire,
          nullif(p_work, ''), nullif(p_personal, ''))
  on conflict (session_id, target_id, author_id)
  do update set good = excluded.good, suggestions = excluded.suggestions, rehire = excluded.rehire,
                work_rehire = excluded.work_rehire, personal_rehire = excluded.personal_rehire,
                updated_at = now();
end $$;

-- ---------- 관리자용 ----------
-- 전체 조회 (작성자 정보는 반환하지 않음 = 관리자에게도 익명)
create or replace function public.admin_get_all(p_id text, p_pw text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare r json;
begin
  perform _auth_admin(p_id, p_pw);
  select coalesce(json_agg(json_build_object(
    'id', s.id, 'year', s.year, 'type', s.type, 'period', s.period, 'code', s.initial_code, 'status', s.status,
    'members', (
      select coalesce(json_agg(json_build_object('id', m.id, 'name', m.name, 'team', m.team) order by m.team, m.name), '[]'::json)
        from session_members sm join members m on m.id = sm.member_id where sm.session_id = s.id),
    'feedbacks', (
      select coalesce(json_object_agg(t.target_id, t.items), '{}'::json)
        from (select f.target_id,
                     json_agg(json_build_object(
                       'good', f.good, 'suggestions', f.suggestions, 'rehire', f.rehire,
                       'workRehire', coalesce(f.work_rehire, case when f.rehire is true then '좋아요' when f.rehire is false then '싫어요' end),
                       'personalRehire', coalesce(f.personal_rehire, case when f.rehire is true then '좋아요' when f.rehire is false then '싫어요' end)
                     )) as items
                from feedbacks f where f.session_id = s.id group by f.target_id) t),
    'insights', (
      select coalesce(json_agg(json_build_object('content', i.content)), '[]'::json)
        from insights i where i.session_id = s.id)
  ) order by s.year desc), '[]'::json)
  into r from sessions s;
  return r;
end $$;

create or replace function public.admin_create_session(
  p_id text, p_pw text, p_year text, p_type text, p_period text, p_code text, p_members jsonb)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare v_sid uuid;
begin
  perform _auth_admin(p_id, p_pw);
  insert into sessions (year, type, period, initial_code) values (p_year, p_type, p_period, p_code)
  returning id into v_sid;
  perform _sync_session_members(v_sid, p_members, p_code, false);
  perform _sync_360_to_insight(v_sid);
  return v_sid;
end $$;

-- 오픈 기간이 바뀌면 상태는 무조건 '진행중'
create or replace function public.admin_update_session(
  p_id text, p_pw text, p_session uuid, p_period text, p_status text, p_members jsonb)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare v_code text; v_old_period text; v_old_status text; v_status text;
begin
  perform _auth_admin(p_id, p_pw);
  select period, status, initial_code into v_old_period, v_old_status, v_code
    from sessions where id = p_session;

  v_status := case
    when p_period is distinct from v_old_period then '진행중'
    else coalesce(p_status, v_old_status)
  end;

  update sessions set period = p_period, status = v_status where id = p_session;
  perform _sync_session_members(p_session, p_members, v_code, true);
  perform _sync_360_to_insight(p_session);
end $$;