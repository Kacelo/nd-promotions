import { NextResponse } from 'next/server';
import { db, PROOF_BUCKET } from '@/lib/supabase';
import { countTaken, getEventBySlug, isAcceptingRsvps } from '@/lib/events';
import { MAX_PROOF_BYTES, PROOF_TYPES } from '@/lib/proof';

export const dynamic = 'force-dynamic';

/**
 * Step 1 of an RSVP: the browser asks for a one-time signed upload slot in the
 * PRIVATE payment-proofs bucket. The file goes straight to storage (so large
 * files don't hit the serverless body limit) and is never publicly readable.
 */
export async function POST(req: Request) {
  let body: { slug?: string; mime?: string; size?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const ext = PROOF_TYPES[body.mime ?? ''];
  if (!ext) return NextResponse.json({ error: 'Please upload a PDF, JPG or PNG file.' }, { status: 400 });
  if (!body.size || body.size > MAX_PROOF_BYTES)
    return NextResponse.json({ error: 'File is too large — the limit is 10 MB.' }, { status: 400 });

  const event = await getEventBySlug(String(body.slug ?? ''));
  if (!event) return NextResponse.json({ error: 'Event not found.' }, { status: 404 });

  const taken = await countTaken(event.id);
  if (!isAcceptingRsvps(event, taken))
    return NextResponse.json({ error: 'closed', closed: true }, { status: 409 });

  const path = `${event.id}/${crypto.randomUUID()}.${ext}`;
  const { data, error } = await db().storage.from(PROOF_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    console.error('signed upload url failed', error);
    return NextResponse.json({ error: 'Could not prepare the upload. Please try again.' }, { status: 500 });
  }
  return NextResponse.json({ path: data.path, token: data.token });
}
