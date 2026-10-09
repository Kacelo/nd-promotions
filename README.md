# HER ERA — RSVP site + admin

Next.js 15 (App Router) + Supabase. Public event page with RSVP + proof-of-payment upload, and a private admin panel. Built around **events**, so the client can run future events without code changes.

## How it works

| Requirement | How it's handled |
|---|---|
| Max 25 guests, no 26th | A Postgres trigger (`enforce_event_capacity`) locks the event row (`FOR UPDATE`) before counting, so simultaneous submissions queue up. Tested: 60 parallel inserts → exactly 25 saved, 35 rejected. |
| Auto-close when full | Page reads the live count on every request and shows *"RSVPs are now closed — all 25 spaces have been reserved."* The API refuses too. |
| Cancelling frees a spot | `cancelled` registrations don't count. Restoring a cancelled one into a full event is blocked. |
| Proof of payment | PDF/JPG/PNG, max 10 MB. Uploaded directly to a **private** bucket via a one-time signed upload URL (keeps large files out of the serverless request body limit). Server re-checks the file's real type by its first bytes. |
| No public proof URLs | Bucket is private. Admin "View/Download" goes through `/api/admin/proof/:id`, which checks the admin login and redirects to a link that expires in **60 seconds**. |
| Admin access | Supabase Auth email + password, **and** the email must be listed in `ADMIN_EMAILS`. |
| Database lockdown | RLS is on with no policies — browsers can't read/write tables directly. Only the server (service-role key) can. |
| Duplicates / spam | One active RSVP per WhatsApp number per event; hidden honeypot field for bots. |

## Setup (≈15 minutes)

### 1. Supabase
1. Create a project at [supabase.com](https://supabase.com) (pick a region near Namibia, e.g. `eu-west` or `af-south` if available).
2. **SQL Editor** → paste `supabase/schema.sql` → Run. Then `supabase/seed.sql` to create HER ERA.
3. **Authentication → Sign In / Providers**: turn **off** "Allow new users to sign up".
4. **Authentication → Users → Add user**: create the client's login (email + password, tick "Auto confirm").
5. **Project Settings → API**: copy the URL, `anon` key and `service_role` key.

### 2. Run locally
```bash
cp .env.example .env.local   # fill in the values
npm install
npm run dev                  # http://localhost:3000  and  /admin
```

### 3. Deploy to Netlify
1. Push to GitHub, then in Netlify: **Add new project → Import an existing project** and pick the repo. Build settings come from `netlify.toml`.
2. **Site configuration → Environment variables**: add the same variables as `.env.local` (`SUPABASE_SERVICE_ROLE_KEY` must **not** be prefixed `NEXT_PUBLIC_`).
3. Set `NEXT_PUBLIC_SITE_URL` to the live domain (e.g. `https://her-era.netlify.app`), then redeploy.

## Using it

- **Public page**: `/` shows the next upcoming event; every event also lives at `/{slug}` (e.g. `/her-era`).
- **Admin**: `/admin` → pick event → guest table, live `X / 25`, status per guest (Pending → Paid → Confirmed, or Cancelled), View/Download proof, **Export guest list (CSV)**, Close/Re-open RSVPs, Edit event.
- **New event**: Admin → *New event*. Everything on the page (name, date, venue, price, inclusions, bank details, dress code, colours, images, extra question, guest limit) is editable.
- Replace the `[BANK NAME]` placeholders via *Edit event* before sharing the link.

## Notes
- Times shown in Africa/Windhoek.
- If someone uploads a file but never submits, the orphaned file stays in the private bucket (harmless). Clear it from Storage occasionally if you like.
- Supabase free projects pause after a week of no activity — upgrade or visit the dashboard before launch day.
- Hero / about / package photos: upload in *Edit event* (stored in the public `event-media` bucket). They're resized to 2000px and compressed to WebP in the browser before upload. Without them the page uses a soft blush gradient.

## Structure
```
supabase/schema.sql          tables, capacity trigger, RLS, buckets
supabase/seed.sql            HER ERA event
app/[slug], app/page.tsx     public event page
components/RsvpForm.tsx      form + direct private upload
app/api/rsvp/*               upload slot + submit (server validation)
app/admin/(panel)/*          admin pages + server actions
app/api/admin/*              proof viewer, CSV export
```
