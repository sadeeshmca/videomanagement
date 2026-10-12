create type public.app_role as enum ('super_admin','admin','user');

create table public.sites (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  drive_folder_id text,
  quota_bytes bigint not null default 107374182400,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key,
  email text,
  full_name text,
  avatar_url text,
  phone text,
  site_id uuid references public.sites(id) on delete set null,
  suspended boolean not null default false,
  quota_bytes bigint not null default 10737418240,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  unique (user_id, role)
);

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  owner_id uuid not null,
  order_id text not null,
  sku text,
  customer_phone text,
  title text not null,
  tags text[] not null default '{}',
  drive_file_id text,
  drive_web_view_link text,
  thumbnail_url text,
  mime_type text,
  size_bytes bigint not null default 0,
  is_public boolean not null default false,
  status text not null default 'ready',
  order_date date not null default current_date,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);
create index videos_site_created_idx on public.videos(site_id, created_at desc);
create index videos_order_idx on public.videos(site_id, order_id);
create index videos_owner_idx on public.videos(owner_id);
create index videos_deleted_idx on public.videos(deleted_at);

create table public.upload_usage (
  day date primary key,
  bytes bigint not null default 0
);

create table public.backup_schedules (
  user_id uuid primary key,
  site_id uuid references public.sites(id) on delete cascade,
  interval_months int not null default 3 check (interval_months in (1,3,6)),
  start_date date not null default current_date,
  next_run_at timestamptz not null default now(),
  retention_days int not null default 180,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.backups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  site_id uuid references public.sites(id) on delete cascade,
  trigger text not null default 'manual',
  status text not null default 'queued',
  progress int not null default 0,
  video_count int not null default 0,
  size_bytes bigint not null default 0,
  drive_file_id text,
  download_link text,
  error text,
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  expires_at timestamptz
);
create index backups_user_idx on public.backups(user_id, created_at desc);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid,
  site_id uuid,
  action text not null,
  target text,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_created_idx on public.audit_logs(created_at desc);

create table public.broadcasts (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null,
  site_id uuid references public.sites(id) on delete set null,
  subject text not null,
  body text not null,
  recipient_count int not null default 0,
  status text not null default 'queued',
  created_at timestamptz not null default now()
);

create table public.app_settings (
  key text primary key,
  value jsonb not null
);

grant select, insert, update, delete on public.sites, public.profiles, public.videos, public.backup_schedules, public.backups, public.broadcasts to authenticated;
grant select on public.user_roles, public.upload_usage, public.app_settings to authenticated;
grant select, insert on public.audit_logs to authenticated;
grant all on public.sites, public.profiles, public.user_roles, public.videos, public.upload_usage, public.backup_schedules, public.backups, public.audit_logs, public.broadcasts, public.app_settings to service_role;

alter table public.sites enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.videos enable row level security;
alter table public.upload_usage enable row level security;
alter table public.backup_schedules enable row level security;
alter table public.backups enable row level security;
alter table public.audit_logs enable row level security;
alter table public.broadcasts enable row level security;
alter table public.app_settings enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.current_site_id()
returns uuid language sql stable security definer set search_path = public as $$
  select site_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_super()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(auth.uid(), 'super_admin')
$$;

create policy "super manages sites" on public.sites for all to authenticated using (public.is_super()) with check (public.is_super());
create policy "members read own site" on public.sites for select to authenticated using (id = public.current_site_id());

create policy "read own profile" on public.profiles for select to authenticated using (id = auth.uid() or public.is_super());
create policy "update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid() and site_id is not distinct from public.current_site_id() and suspended = false);
create policy "super manages profiles" on public.profiles for all to authenticated using (public.is_super()) with check (public.is_super());

create policy "read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.is_super());

create policy "site members read videos" on public.videos for select to authenticated using (public.is_super() or site_id = public.current_site_id());
create policy "site members add videos" on public.videos for insert to authenticated with check (owner_id = auth.uid() and site_id = public.current_site_id());
create policy "site members edit videos" on public.videos for update to authenticated using (public.is_super() or site_id = public.current_site_id()) with check (public.is_super() or site_id = public.current_site_id());
create policy "super deletes videos" on public.videos for delete to authenticated using (public.is_super());

create policy "read usage" on public.upload_usage for select to authenticated using (true);
create policy "read settings" on public.app_settings for select to authenticated using (true);

create policy "own schedule" on public.backup_schedules for all to authenticated using (user_id = auth.uid() or public.is_super()) with check (user_id = auth.uid() or public.is_super());
create policy "own backups read" on public.backups for select to authenticated using (user_id = auth.uid() or public.is_super());
create policy "own backups insert" on public.backups for insert to authenticated with check (user_id = auth.uid());

create policy "super reads audit" on public.audit_logs for select to authenticated using (public.is_super());
create policy "write own audit" on public.audit_logs for insert to authenticated with check (actor_id = auth.uid());

create policy "super broadcasts" on public.broadcasts for all to authenticated using (public.is_super()) with check (public.is_super() and sender_id = auth.uid());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)));
  if not exists (select 1 from public.user_roles where role = 'super_admin') then
    insert into public.user_roles(user_id, role) values (new.id, 'super_admin');
  else
    insert into public.user_roles(user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end $$;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

insert into public.app_settings(key, value) values ('daily_upload_cap_bytes', '805306368000'::jsonb);
