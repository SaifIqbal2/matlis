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
alter table public.journal_pdfs add column if not exists page_number text;
```

## 3. Use the control panel

Open `/admin/`, sign in with the admin user, create journals, then upload PDF files. Enter the article page number in the Page number field; `963` is the number currently shown for the Acta upload. Files are stored in the `journal-pdfs` Supabase Storage bucket. Uploaded PDFs open through the existing OJS-style article page before the PDF. Deleting a PDF removes both its Storage object and database record.

## 4. Deploy on Vercel

Import the repository in Vercel with:

- Framework preset: `Other`
- Build command: empty
- Output directory: `.`
- Root directory: repository root

This deployment supports the static mirror and the Supabase control panel. It does not restore the original OJS PHP workflows such as editorial submissions or the old OJS login pages.
