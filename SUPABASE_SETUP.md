# Supabase setup

This folder contains a static OJS mirror plus a Supabase-powered control panel at `/admin/`.

## 1. Create the Supabase project

Create a project at https://supabase.com, then open **SQL Editor** and run `supabase/schema.sql`.

Create the first user in **Authentication > Users > Add user** with email and password. Then run this query in SQL Editor, replacing the email:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'admin@example.com');
```

Do not put the Supabase service-role key in the website. The browser only needs the project URL and anon key.

## 2. Add the public client settings

Open `supabase/config.js` and replace both placeholders:

```js
window.SUPABASE_URL = 'https://your-project-ref.supabase.co';
window.SUPABASE_ANON_KEY = 'your-anon-key';
```

The anon key is intended for browser use. Security is enforced by the SQL RLS policies.

If this Supabase project already has the old `journal_pdfs` table, run this migration once in SQL Editor:

```sql
alter table public.journal_pdfs add column if not exists authors text;
alter table public.journal_pdfs add column if not exists abstract text;
alter table public.journal_pdfs add column if not exists keywords text;
alter table public.journal_pdfs add column if not exists doi text;
alter table public.journal_pdfs add column if not exists alternate_url text;
alter table public.journal_pdfs add column if not exists conflict_of_interest text;
alter table public.journal_pdfs add column if not exists ai_declaration text;
alter table public.journal_pdfs add column if not exists funding text;
alter table public.journal_pdfs add column if not exists correspondence text;
alter table public.journal_pdfs add column if not exists received_date text;
alter table public.journal_pdfs add column if not exists accepted_date text;
alter table public.journal_pdfs add column if not exists first_author_name text;
alter table public.journal_pdfs add column if not exists first_author_affiliation text;
alter table public.journal_pdfs add column if not exists page_number text;
alter table public.journal_pdfs add column if not exists sort_order integer;
alter table public.journal_pdfs add column if not exists updated_at timestamptz not null default now();
```

## 3. Use the control panel

Open `/admin/`, sign in with the admin user, create journals, then upload PDF files. Use Issue page ID `963` for the Acta issue and set Display order to `1`, `2`, `3` to control article sequence. Enter the article page number separately; it is shown on the right. Files are stored in the `journal-pdfs` Supabase Storage bucket. Uploaded PDFs open through the existing OJS-style article page before the PDF. Deleting a PDF removes both its Storage object and database record.

## 4. Deploy on Vercel

Import the repository in Vercel with:

- Framework preset: `Other`
- Build command: empty
- Output directory: `.`
- Root directory: repository root

This deployment supports the static mirror and the Supabase control panel. It does not restore the original OJS PHP workflows such as editorial submissions or the old OJS login pages.
