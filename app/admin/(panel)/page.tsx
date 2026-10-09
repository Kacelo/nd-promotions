import Link from 'next/link';
import { db } from '@/lib/supabase';
import { formatEventDate } from '@/lib/format';
import type { EventRow } from '@/lib/types';

export default async function AdminHome() {
  const [{ data: events }, { data: counts }] = await Promise.all([
    db().from('events').select('*').order('event_date', { ascending: false }),
    db().from('event_counts').select('event_id, taken'),
  ]);
  const taken = new Map((counts ?? []).map((c) => [c.event_id as string, c.taken as number]));

  return (
    <>
      <div className="a-row">
        <div>
          <h1 className="a-h1">Events</h1>
          <p className="a-sub">Pick an event to see its guest list.</p>
        </div>
        <Link className="a-btn primary" href="/admin/events/new">+ New event</Link>
      </div>

      <div className="events-list">
        {(events as EventRow[] | null)?.length ? (
          (events as EventRow[]).map((e) => {
            const t = taken.get(e.id) ?? 0;
            const full = t >= e.capacity;
            return (
              <Link key={e.id} href={`/admin/events/${e.id}`} className="a-card event-item">
                <div>
                  <h3>{e.name}</h3>
                  <div className="meta">{formatEventDate(e.event_date, 'long') as string} · /{e.slug}</div>
                </div>
                <div className="a-actions" style={{ alignItems: 'center' }}>
                  <strong>{t} / {e.capacity}</strong>
                  {full ? <span className="pill full">Full</span> : e.rsvp_open ? <span className="pill open">Open</span> : <span className="pill closed">Closed</span>}
                </div>
              </Link>
            );
          })
        ) : (
          <div className="a-card a-empty">No events yet. Create your first one.</div>
        )}
      </div>
    </>
  );
}
