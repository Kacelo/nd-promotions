# HER ERA RSVP — project context

Context for Claude in this claude.ai Project. Last updated 9 Oct 2026. The code is the source of truth; if it disagrees with this file, trust the code.

## What it is

An RSVP website built by **ND Promotions** (Vernon) for a client's women's event, **HER ERA**: Windhoek, Namibia, 14 Nov 2026, 25 guests, N$400 ticket. It's built around *events*, so the client can run future events from the admin panel without code changes.

- **Public page** (`/` = next upcoming event, `/{slug}` = any event): hero, About, ticket and inclusions, package images, dress code with colour swatches, and an RSVP form with proof-of-payment upload.
- **Admin** (`/admin`): event list, guest table with live `X / capacity`, status per guest (pending → paid → confirmed, or cancelled), view/download proofs, CSV export, open/close RSVPs, create/edit events.

## Stack

- **Next.js 16** (App Router, server actions, React 19). The project is installed with **pnpm**. The `middleware.ts` file name works but is deprecated in Next 16 (the new name is `proxy.ts`).
- **Supabase**: Postgres, Auth (email and password only, sign-ups off), Storage.
- **Hosting: Netlify.** Moved from Vercel because Vercel's free (Hobby) plan forbids commercial use. Config is in `netlify.toml`.
- No CSS framework: hand-written CSS in `app/globals.css` (public) and `app/admin/admin.css`.
- **Fonts:** Bodoni Moda (display), Cormorant Garamond (serif), Jost (sans), Pinyon Script.
- **Palette tokens:** `--cream #f6eee6`, `--paper #fbf6f1`, `--blush #f1dfd5`, `--brown #4b2a1f`, `--ink #3a241b`.

## Key files

| Path | What |
|---|---|
| `components/EventPage.tsx` | Public event page (hero, about, ticket, package images, dress code) |
| `components/RsvpForm.tsx` | Guest RSVP form and payment details (bank or e-wallet) |
| `components/icons.tsx` | Line icons; `InclusionIcon` picks one by keyword; `Flourish`, `Flower` (large decorative), `FlowerIcon` (24px) |
| `app/admin/(panel)/EventForm.tsx` | Create/edit event form (client component) |
| `app/admin/(panel)/actions.ts` | Server actions: `saveEvent`, `createImageUpload`, `setStatus`, `deleteEvent`… |
| `app/api/rsvp/*` | Public RSVP endpoints (signed upload URL for the proof, then submit) |
| `lib/supabase.ts` | `db()` service-role client (server only) and `authClient()` cookie client |
| `lib/browser-storage.ts` | Single shared browser Supabase client, only for `uploadToSignedUrl` |
| `lib/compress-image.ts` | Browser-side resize (≤2000px) and WebP compression before upload |
| `lib/types.ts` | `EventRow`, statuses, `EWALLET_PROVIDERS` |
| `supabase/schema.sql` | Full schema, safe to re-run; includes `alter table … add column if not exists` for newer columns |

## Architecture rules (keep these)

- **Database lockdown:** RLS is on with no policies. The browser can't touch tables. All reads and writes go through the Next.js server using the service-role key, after checks such as `requireAdmin()` (Supabase login and an `ADMIN_EMAILS` allow-list).
- **Capacity:** the Postgres trigger `enforce_event_capacity` locks the event row (`FOR UPDATE`) before counting, so the event can never go over capacity. Cancelled registrations free a spot.
- **No files in request bodies.** Every upload goes browser → Supabase Storage via a one-time signed URL minted by the server. Only the resulting URL or path is sent to the app.
  - Guest proofs go to the **private** `payment-proofs` bucket (PDF/JPG/PNG, ≤10 MB). Admins view them via 60-second signed links.
  - Event images go to the **public** `event-media` bucket (≤5 MB, after compression).
- **Image compression:** admin images are compressed in the browser before upload. Originals up to 25 MB are accepted. Payment proofs are deliberately **not** compressed, because they must stay legible as evidence.

## Event data model (beyond the basics)

| Columns | What |
|---|---|
| `payment_method` | `'bank'` or `'ewallet'`. Admin toggles it in the form, and the guest form shows one or the other. |
| `bank_name`, `account_name`, `account_number`, `branch_code`, `payment_reference` | Bank details. Only bank mode shows the reference. |
| `ewallet_number`, `ewallet_name`, `ewallet_providers text[]` | E-wallet details. The providers come from `EWALLET_PROVIDERS`: Bank Windhoek, FNB, Standard Bank, Nedbank, Letshego, Bank BIC. That list is unverified; the client should confirm which banks actually offer e-wallets. |
| `package_title`, `package_images text[]` | An optional heading and up to 3 images, shown under "What your ticket includes" and displayed whole, never cropped. |
| `dress_palette text[]` | Hex colours for the dress-code swatches. |

## Design decisions already made

- **About section:** the photo is a faded backdrop on the right (mask gradient), and the text overlaps it from the left. On mobile, the photo fades downward behind the heading.
- **Hero:** no full-image wash. A soft cream radial glow sits behind just the text, and the bottom of the photo fades into the page.

## Known gotchas

- **"An unexpected response was received from the server"** when saving in local dev was a **431** caused by bloated `localhost` cookies. Check the Network tab status first. The fix is to clear `localhost:3000` cookies or use `127.0.0.1`.
- **Supabase free projects pause** after about a week with no activity. A keep-alive ping (for example, a Netlify scheduled function) has been suggested but isn't built yet.
- **Leftover lockfile:** `package-lock.json` is a stray file that pins a Next canary build. The project uses pnpm, so it should be deleted before deploying.
- **Stale README line:** the README intro still says "Next.js 15".

## Open to-dos (as of 9 Oct 2026)

- [ ] Run the newer `alter table` lines from `schema.sql` in Supabase (payment method, e-wallet and package columns), if not done yet.
- [ ] Delete `package-lock.json`, make the first git commit, and push to GitHub.
- [ ] Deploy on Netlify: add the env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAILS`, `NEXT_PUBLIC_SITE_URL`).
- [ ] Re-upload the existing hero, about and package images so they get compressed.
- [ ] Replace the `[BANK NAME]` seed placeholders with real payment details.
- [ ] Optional: keep-alive ping for Supabase; rename `middleware.ts` → `proxy.ts`.
