create type public.app_role as enum ('super_admin','admin','user');

create table public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

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
  id uuid primary key references public.users(id),
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
  user_id uuid not null references public.users(id),
  role public.app_role not null,
  unique (user_id, role)
);

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  owner_id uuid not null references public.users(id),
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
  user_id uuid primary key references public.users(id),
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
  user_id uuid not null references public.users(id),
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
  sender_id uuid not null references public.users(id),
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

-- Helper functions
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

-- Seed default settings
insert into public.app_settings(key, value) values ('daily_upload_cap_bytes', '805306368000'::jsonb);
