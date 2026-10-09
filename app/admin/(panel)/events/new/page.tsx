import Link from 'next/link';
import EventForm from '../../EventForm';

export default function NewEvent() {
  return (
    <>
      <p className="a-sub" style={{ margin: '0 0 6px' }}><Link href="/admin">← All events</Link></p>
      <h1 className="a-h1" style={{ marginBottom: 22 }}>New event</h1>
      <EventForm />
    </>
  );
}
