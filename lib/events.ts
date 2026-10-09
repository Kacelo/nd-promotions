import 'server-only';
import { db } from './supabase';
import type { EventRow } from './types';

export async function getEventBySlug(slug: string): Promise<EventRow | null> {
  const { data } = await db().from('events').select('*').eq('slug', slug).maybeSingle();
  return (data as EventRow) ?? null;
}

/** The event shown at "/": the next upcoming one, else the most recent. */
export async function getFeaturedEvent(): Promise<EventRow | null> {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Windhoek' });
  const upcoming = await db()
    .from('events')
    .select('*')
    .gte('event_date', today)
    .order('event_date', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (upcoming.data) return upcoming.data as EventRow;
  const latest = await db()
    .from('events')
    .select('*')
    .order('event_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (latest.data as EventRow) ?? null;
}

/** Active (non-cancelled) registrations for an event. */
export async function countTaken(eventId: string): Promise<number> {
  const { count } = await db()
    .from('registrations')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .neq('status', 'cancelled');
  return count ?? 0;
}

export function isAcceptingRsvps(event: EventRow, taken: number) {
  return event.rsvp_open && taken < event.capacity;
}
