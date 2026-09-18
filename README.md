# Don Macchiatos Ops

Phone-first daily sales and expense tracker for **Don Macchiatos**, **Don Lemon**, and **Yogurt**.

## Stack

- Next.js 16 (App Router) + TypeScript
- Supabase (Auth, Postgres, RLS) in production
- shadcn/ui + Tailwind CSS v4
- Vercel for the web app
- Cursor + GitHub for development

## Local demo

The app boots in demo mode so you can try every role without creating a Supabase project.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with password `demo`:

| Email | Role |
| --- | --- |
| `admin@demo.local` | Branch admin (Don Macchiatos Main) |
| `user@demo.local` | Branch user |
| `superadmin@demo.local` | All businesses |

Add the site to your phone home screen from the browser share menu. It is a PWA-lite (`standalone` manifest), not a native app.

## Production setup

1. Create a GitHub repository and push this project.
2. Create a Supabase project and run `supabase/migrations/0001_init.sql`, then `supabase/seed.sql`.
3. Create the first Auth user in Supabase, then promote it:

```sql
update public.profiles
set role = 'superadmin', branch_id = null
where id = '<auth-user-uuid>';
```

4. Copy `.env.example` to `.env.local` and set:

```
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

5. Import the GitHub repo into [Vercel](https://vercel.com/new). Add the same env vars in the Vercel project settings.

Disable public sign-ups in the Supabase Auth settings. Superadmin creates staff from `/staff`.

## Roles

- **user**: daily sales/expenses + missing-date calendar for one branch
- **admin**: same, plus reports, product/price edits, and expense types
- **superadmin**: all branches, plus staff accounts
