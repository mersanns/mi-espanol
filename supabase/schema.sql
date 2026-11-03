-- Mi español: синхронизация по коду, без входа.
-- Выполнить один раз в Supabase → SQL Editor → Run.
-- Таблица закрыта: читать и писать можно только через две функции, зная код.
-- В базе хранится не сам код, а его SHA-256.

drop table if exists public.progress;

create table if not exists public.sync_progress (
  code_hash  text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.sync_progress enable row level security;
revoke all on public.sync_progress from anon, authenticated;

create or replace function public.sync_get(p_code text)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select data from public.sync_progress
  where code_hash = encode(extensions.digest(upper(p_code), 'sha256'), 'hex')
    and length(p_code) >= 12;
$$;

create or replace function public.sync_put(p_code text, p_data jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if length(p_code) < 12 then raise exception 'code too short'; end if;
  if octet_length(p_data::text) > 2000000 then raise exception 'data too large'; end if;
  insert into public.sync_progress (code_hash, data, updated_at)
  values (encode(extensions.digest(upper(p_code), 'sha256'), 'hex'), p_data, now())
  on conflict (code_hash) do update set data = excluded.data, updated_at = now();
end;
$$;

revoke all on function public.sync_get(text) from public;
revoke all on function public.sync_put(text, jsonb) from public;
grant execute on function public.sync_get(text) to anon, authenticated;
grant execute on function public.sync_put(text, jsonb) to anon, authenticated;
