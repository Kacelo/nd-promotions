import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import EventPage from '@/components/EventPage';
import { countTaken, getEventBySlug } from '@/lib/events';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const event = await getEventBySlug((await params).slug);
  return event
    ? { title: `${event.name} — RSVP`, description: event.tagline ?? undefined }
    : { title: 'Event not found' };
}

export default async function Page({ params }: Params) {
  const event = await getEventBySlug((await params).slug);
  if (!event) notFound();
  return <EventPage event={event} taken={await countTaken(event.id)} />;
}
