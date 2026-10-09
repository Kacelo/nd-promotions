import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/supabase';
import { formatEventDate, formatRegistered } from '@/lib/format';
import type { EventRow, RegistrationRow } from '@/lib/types';
import { DeleteEventButton, DeleteRegistrationButton, RsvpToggle, StatusSelect } from '../../AdminControls';

export default async function EventAdmin({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ data: ev }, { data: regsRaw }] = await Promise.all([
    db().from('events').select('*').eq('id', id).maybeSingle(),
    db().from('registrations').select('*').eq('event_id', id).order('created_at', { ascending: true }),
  ]);
  if (!ev) notFound();
  const event = ev as EventRow;
  const regs = (regsRaw ?? []) as RegistrationRow[];

  const active = regs.filter((r) => r.status !== 'cancelled');
  const byStatus = (s: string) => regs.filter((r) => r.status === s).length;
  const full = active.length >= event.capacity;
  const pct = Math.min(100, Math.round((active.length / event.capacity) * 100));

  return (
    <>
      <div className="a-row">
        <div>
          <p className="a-sub" style={{ margin: '0 0 6px' }}><Link href="/admin">← All events</Link></p>
          <h1 className="a-h1">{event.name}</h1>
          <p className="a-sub">
            {formatEventDate(event.event_date, 'long') as string} ·{' '}
            {full ? <span className="pill full">Full — RSVPs closed</span> : event.rsvp_open ? <span className="pill open">RSVPs open</span> : <span className="pill closed">RSVPs closed</span>}
          </p>
        </div>
        <div className="a-actions">
          <a className="a-btn primary" href={`/api/admin/events/${event.id}/export`}>Export guest list (CSV)</a>
          <a className="a-btn" href={`/${event.slug}`} target="_blank" rel="noreferrer">View public page ↗</a>
          <Link className="a-btn" href={`/admin/events/${event.id}/edit`}>Edit event</Link>
          <RsvpToggle id={event.id} open={event.rsvp_open} />
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="k">Current registrations</div>
          <div className="v">{active.length} <small>/ {event.capacity}</small></div>
          <div className="meter"><i style={{ width: `${pct}%` }} /></div>
        </div>
        <div className="stat"><div className="k">Pending</div><div className="v">{byStatus('pending')}</div></div>
        <div className="stat"><div className="k">Paid</div><div className="v">{byStatus('paid')}</div></div>
        <div className="stat"><div className="k">Confirmed</div><div className="v">{byStatus('confirmed')}</div></div>
        <div className="stat"><div className="k">Cancelled</div><div className="v">{byStatus('cancelled')}</div></div>
      </div>

      <div className="table-wrap">
        {regs.length === 0 ? (
          <div className="a-empty">No registrations yet. Share <b>/{event.slug}</b> to start receiving RSVPs.</div>
        ) : (
          <table className="a-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Guest</th>
                <th>Contact</th>
                <th>Email</th>
                <th>Proof of payment</th>
                <th>Date registered</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {regs.map((r, i) => (
                <tr key={r.id} className={r.status}>
                  <td>{i + 1}</td>
                  <td>
                    <div className="name">{r.full_name}</div>
                    {r.dietary && <div className="extra">Dietary: {r.dietary}</div>}
                    {r.heard_from && <div className="extra">Heard via: {r.heard_from}</div>}
                    {r.looking_forward && <div className="extra">Looking forward to: {r.looking_forward}</div>}
                    {r.custom_answer && <div className="extra">{(event.custom_question ?? 'Answer').replace(/[?:.\s]+$/, '')}: {r.custom_answer}</div>}
                  </td>
                  <td className="nowrap">
                    <a href={`https://wa.me/${r.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">{r.phone}</a>
                  </td>
                  <td>{r.email ? <a href={`mailto:${r.email}`}>{r.email}</a> : <span style={{ color: 'var(--muted)' }}>—</span>}</td>
                  <td className="nowrap">
                    <a className="a-btn small" href={`/api/admin/proof/${r.id}`} target="_blank" rel="noreferrer">View</a>{' '}
                    <a className="a-btn small" href={`/api/admin/proof/${r.id}?download=1`}>Download</a>
                    <div className="extra">{r.proof_mime === 'application/pdf' ? 'PDF' : r.proof_mime === 'image/png' ? 'PNG' : 'JPG'}</div>
                  </td>
                  <td className="nowrap">{formatRegistered(r.created_at)}</td>
                  <td><StatusSelect id={r.id} value={r.status} /></td>
                  <td><DeleteRegistrationButton id={r.id} name={r.full_name} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="a-sub" style={{ marginTop: 14, fontSize: 13 }}>
        Cancelled registrations don’t count towards the guest limit — cancelling one re-opens a spot automatically.
      </p>

      <div style={{ marginTop: 40 }}>
        <DeleteEventButton id={event.id} name={event.name} />
      </div>
    </>
  );
}
