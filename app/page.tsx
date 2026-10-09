import EventPage from '@/components/EventPage';
import { countTaken, getFeaturedEvent } from '@/lib/events';

export const dynamic = 'force-dynamic'; // spots-left must always be live

export default async function Home() {
  const event = await getFeaturedEvent();
  if (!event) {
    return (
      <main className="empty-state">
        <div>
          <h1>Coming soon</h1>
          <p>There are no events open for RSVP right now.</p>
        </div>
      </main>
    );
  }
  return <EventPage event={event} taken={await countTaken(event.id)} />;
}
