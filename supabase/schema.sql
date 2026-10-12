-- =====================================================================
-- HER ERA RSVP — database schema
-- Run this once in Supabase: Dashboard → SQL Editor → paste → Run.
-- Safe to re-run (uses IF NOT EXISTS / OR REPLACE where possible).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Events: everything about an event is data, nothing is hardcoded.
-- ---------------------------------------------------------------------
create table if not exists public.events (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name              text not null,
  tagline           text,                    -- "A more intentional you."
  subtitle          text,                    -- "Because we never stop becoming."
  event_date        date not null,
  start_time        time,
  end_time          time,
  venue             text,                    -- "Windhoek, Namibia"
  venue_note        text,                    -- "Venue details shared upon confirmation."
  about             text,                    -- paragraphs separated by blank lines
  about_highlight   text,                    -- short lines, one per line
  hero_image_url    text,
  about_image_url   text,
  price             numeric(10,2) not null default 0 check (price >= 0),
  currency          text not null default 'N$',
  inclusions        text[] not null default '{}',
  capacity          int  not null default 25 check (capacity > 0),
  rsvp_open         boolean not null default true,
  dress_code_title  text,
  dress_code_text   text,
  dress_palette     text[] not null default '{}',  -- hex colours
  payment_method    text not null default 'bank' check (payment_method in ('bank', 'ewallet')),
  bank_name         text,
  account_name      text,
  account_number    text,
  branch_code       text,
  payment_reference text default 'Your full name',
  ewallet_number    text,                    -- phone number guests send the e-wallet to
  ewallet_name      text,                    -- name the e-wallet is registered to
  ewallet_providers text[] not null default '{}',  -- banks whose e-wallets are accepted, e.g. {FNB,Bank Windhoek}
  package_title     text,                    -- optional heading above the package images
  package_images    text[] not null default '{}',  -- up to 3 package/offer image URLs, shown under the inclusions
  custom_question   text,                    -- optional extra question, e.g. "What are you currently becoming?"
  spaces_title      text,                    -- headline on the tickets card, e.g. "25 women. One table."
  spaces_text       text,                    -- line under it, e.g. "A limited gathering for women in different seasons of becoming."
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Columns added after launch — keeps existing databases in step when this file is re-run.
alter table public.events add column if not exists payment_method text not null default 'bank';
alter table public.events add column if not exists ewallet_number text;
alter table public.events add column if not exists ewallet_name text;
alter table public.events add column if not exists ewallet_providers text[] not null default '{}';
alter table public.events add column if not exists package_title text;
alter table public.events add column if not exists package_images text[] not null default '{}';
alter table public.events add column if not exists spaces_title text;
alter table public.events add column if not exists spaces_text text;
do $$ begin
  alter table public.events add constraint events_payment_method_check check (payment_method in ('bank', 'ewallet'));
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Registrations
-- status: pending   = submitted, proof not checked yet
--         paid      = payment verified
--         confirmed = place confirmed / guest notified
--         cancelled = does NOT count towards capacity (frees the spot)
-- ---------------------------------------------------------------------
do $$ begin
  create type public.registration_status as enum ('pending', 'paid', 'confirmed', 'cancelled');
exception when duplicate_object then null; end $$;

create table if not exists public.registrations (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references public.events(id) on delete cascade,
  full_name       text not null check (char_length(full_name) between 2 and 120),
  phone           text not null check (char_length(phone) between 7 and 20),
  email           text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  dietary         text,
  heard_from      text,
  looking_forward text,
  custom_answer   text,
  proof_path      text not null unique,      -- object path inside the private bucket
  proof_mime      text not null,
  proof_filename  text,
  status          public.registration_status not null default 'pending',
  admin_note      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists registrations_event_idx on public.registrations (event_id, created_at);

-- One registration per phone number per event (stops accidental double-submits).
create unique index if not exists registrations_unique_phone
  on public.registrations (event_id, phone) where status <> 'cancelled';

-- ---------------------------------------------------------------------
-- CAPACITY GUARD — the single source of truth.
-- Runs inside the INSERT's transaction. `FOR UPDATE` locks the event row,
-- so two simultaneous RSVPs for the same event queue up behind each other:
-- the second one only counts AFTER the first has committed. It is
-- impossible to end up with capacity + 1 active registrations.
-- Also blocks re-activating a cancelled registration into a full event.
-- ---------------------------------------------------------------------
create or replace function public.enforce_event_capacity()
returns trigger
language plpgsql
as $$
declare
  ev     public.events%rowtype;
  taken  int;
begin
  -- Only active registrations consume a spot.
  if new.status = 'cancelled' then
    return new;
  end if;
  -- Status change between active states (pending → paid etc.) changes nothing.
  if tg_op = 'UPDATE' and old.status <> 'cancelled' then
    return new;
  end if;

  select * into ev from public.events where id = new.event_id for update;
  if not found then
    raise exception 'EVENT_NOT_FOUND' using errcode = 'P0002';
  end if;

  -- New public RSVPs need the event to be open. Admins restoring a
  -- cancelled registration (UPDATE) are only limited by capacity.
  if tg_op = 'INSERT' and not ev.rsvp_open then
    raise exception 'RSVP_CLOSED' using errcode = 'P0001';
  end if;

  select count(*) into taken
    from public.registrations
   where event_id = new.event_id
     and status <> 'cancelled';

  if taken >= ev.capacity then
    raise exception 'EVENT_FULL' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists registrations_capacity on public.registrations;
create trigger registrations_capacity
  before insert or update of status on public.registrations
  for each row execute function public.enforce_event_capacity();

-- Keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists events_touch on public.events;
create trigger events_touch before update on public.events
  for each row execute function public.touch_updated_at();
drop trigger if exists registrations_touch on public.registrations;
create trigger registrations_touch before update on public.registrations
  for each row execute function public.touch_updated_at();

-- Spots taken per event (used by public page and admin).
create or replace view public.event_counts
with (security_invoker = true) as
select e.id as event_id,
       e.capacity,
       count(r.id) filter (where r.status <> 'cancelled')::int as taken
  from public.events e
  left join public.registrations r on r.event_id = e.id
 group by e.id;

-- ---------------------------------------------------------------------
-- LOCKDOWN: Row Level Security on, no policies.
-- The browser (anon / authenticated keys) can read or write NOTHING
-- directly. All access goes through the Next.js server, which uses the
-- service-role key and does its own checks (admin allow-list, validation).
-- ---------------------------------------------------------------------
alter table public.events        enable row level security;
alter table public.registrations enable row level security;
revoke all on public.events, public.registrations, public.event_counts from anon, authenticated;

-- ---------------------------------------------------------------------
-- STORAGE
-- payment-proofs : PRIVATE. Never publicly reachable. Admin views files
--                  through short-lived (60s) signed URLs after login.
-- event-media    : public, for hero/about images shown on the page.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-proofs', 'payment-proofs', false, 10485760,
        array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-media', 'event-media', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- No storage.objects policies are created for these buckets on purpose:
-- uploads only happen through signed upload URLs minted by the server.
