import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/supabase';
import type { EventRow } from '@/lib/types';
import EventForm from '../../../EventForm';

export default async function EditEvent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data } = await db().from('events').select('*').eq('id', id).maybeSingle();
  if (!data) notFound();
  const event = data as EventRow;
  return (
    <>
      <p className="a-sub" style={{ margin: '0 0 6px' }}><Link href={`/admin/events/${id}`}>← Back to guest list</Link></p>
      <h1 className="a-h1" style={{ marginBottom: 22 }}>Edit {event.name}</h1>
      <EventForm event={event} />
    </>
  );
}
