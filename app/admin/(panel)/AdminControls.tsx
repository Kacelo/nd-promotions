'use client';

import { useState, useTransition } from 'react';
import { deleteEvent, deleteRegistration, setRsvpOpen, setStatus } from './actions';
import { STATUSES, type RegistrationStatus } from '@/lib/types';

const LABEL: Record<RegistrationStatus, string> = {
  pending: 'Pending',
  paid: 'Paid',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
};

export function StatusSelect({ id, value }: { id: string; value: RegistrationStatus }) {
  const [current, setCurrent] = useState(value);
  const [pending, start] = useTransition();
  return (
    <select
      className={`status-select ${current}`}
      value={current}
      disabled={pending}
      aria-label="Registration status"
      onChange={(e) => {
        const next = e.target.value as RegistrationStatus;
        const prev = current;
        setCurrent(next);
        start(async () => {
          const res = await setStatus(id, next);
          if (res.error) {
            setCurrent(prev);
            alert(res.error);
          }
        });
      }}
    >
      {STATUSES.map((s) => <option key={s} value={s}>{LABEL[s]}</option>)}
    </select>
  );
}

export function DeleteRegistrationButton({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      className="a-btn small danger"
      disabled={pending}
      onClick={() => {
        if (confirm(`Permanently delete ${name}'s registration and proof of payment?\n\nTip: choose "Cancelled" instead if you want to keep a record.`))
          start(() => deleteRegistration(id));
      }}
    >
      Delete
    </button>
  );
}

export function RsvpToggle({ id, open }: { id: string; open: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button className="a-btn" disabled={pending} onClick={() => start(() => setRsvpOpen(id, !open))}>
      {open ? 'Close RSVPs' : 'Re-open RSVPs'}
    </button>
  );
}

export function DeleteEventButton({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      className="a-btn danger"
      disabled={pending}
      onClick={() => {
        const typed = prompt(`This permanently deletes "${name}", all registrations and all proofs of payment.\n\nType DELETE to confirm.`);
        if (typed === 'DELETE') start(() => deleteEvent(id));
      }}
    >
      Delete event
    </button>
  );
}
