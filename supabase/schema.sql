create extension if not exists pgcrypto;

create type public.app_role as enum ('admin', 'editor');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role public.app_role not null default 'editor',
  created_at timestamptz not null default now()
);

create table public.journals (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  website_url text,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.journal_pdfs (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid not null references public.journals(id) on delete cascade,
  title text not null,
  authors text,
  abstract text,
  keywords text,
  doi text,
  alternate_url text,
  issue text,
  page_number text,
  sort_order integer,
  file_path text not null unique,
  file_size bigint,
  is_published boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index journal_pdfs_journal_id_idx on public.journal_pdfs(journal_id);

create or replace function public.is_admin_or_editor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'editor')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.journals enable row level security;
alter table public.journal_pdfs enable row level security;

create policy "Users can view their profile"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_admin());

create policy "Admins can manage profiles"
on public.profiles for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Anyone can view published journals"
on public.journals for select
to anon, authenticated
using (is_published or public.is_admin_or_editor());

create policy "Editors can manage journals"
on public.journals for all
to authenticated
using (public.is_admin_or_editor())
with check (public.is_admin_or_editor());

create policy "Anyone can view published PDFs"
on public.journal_pdfs for select
to anon, authenticated
using (is_published or public.is_admin_or_editor());

create policy "Editors can manage PDFs"
on public.journal_pdfs for all
to authenticated
using (public.is_admin_or_editor())
with check (public.is_admin_or_editor());

insert into storage.buckets (id, name, public)
values ('journal-pdfs', 'journal-pdfs', true)
on conflict (id) do update set public = excluded.public;

create policy "Public can read journal PDFs"
on storage.objects for select
to public
using (bucket_id = 'journal-pdfs');

create policy "Editors can upload journal PDFs"
on storage.objects for insert
to authenticated
with check (bucket_id = 'journal-pdfs' and public.is_admin_or_editor());

create policy "Editors can update journal PDFs"
on storage.objects for update
to authenticated
using (bucket_id = 'journal-pdfs' and public.is_admin_or_editor())
with check (bucket_id = 'journal-pdfs' and public.is_admin_or_editor());

create policy "Editors can delete journal PDFs"
on storage.objects for delete
to authenticated
using (bucket_id = 'journal-pdfs' and public.is_admin_or_editor());

update public.profiles
set role = 'admin'
where id = (select id from auth.users order by created_at limit 1);
