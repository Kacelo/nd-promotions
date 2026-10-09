import { NextResponse } from 'next/server';
import { db, PROOF_BUCKET } from '@/lib/supabase';
import { getEventBySlug } from '@/lib/events';
import { MAX_PROOF_BYTES, sniffProofMime } from '@/lib/proof';

export const dynamic = 'force-dynamic';

const clean = (v: unknown, max: number) => {
  if (typeof v !== 'string') return '';
  return v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
};

function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, '');
  let local = digits.replace(/^\+?264/, '').replace(/^0/, '');
  if (digits.startsWith('+') && !digits.startsWith('+264')) {
    // international number entered with its own country code
    return /^\+\d{8,15}$/.test(digits) ? digits : null;
  }
  local = local.replace(/\D/g, '');
  if (!/^\d{7,10}$/.test(local)) return null;
  return `+264${local}`;
}

/**
 * Step 2 of an RSVP: save the registration.
 * The database trigger is the real capacity gate — it locks the event row,
 * so simultaneous submissions are serialised and can never exceed capacity.
 */
export async function POST(req: Request) {
  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const proofPath = clean(b.proofPath, 200);
  const removeProof = async () => {
    if (proofPath) await db().storage.from(PROOF_BUCKET).remove([proofPath]);
  };

  // Honeypot: real people never fill the hidden "website" field.
  if (clean(b.website, 200)) {
    await removeProof();
    return NextResponse.json({ ok: true });
  }

  const event = await getEventBySlug(clean(b.slug, 100));
  if (!event) return NextResponse.json({ error: 'Event not found.' }, { status: 404 });

  const fullName = clean(b.fullName, 120);
  const phone = normalisePhone(clean(b.phone, 30));
  const email = clean(b.email, 200).toLowerCase() || null;
  const errors: Record<string, string> = {};
  if (fullName.length < 2) errors.fullName = 'Please enter your full name.';
  if (!phone) errors.phone = 'Please enter a valid WhatsApp number.';
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.email = 'Please enter a valid email address.';
  if (b.confirmPaid !== true) errors.confirmPaid = 'Please confirm that you have made the payment.';
  // Proof must be one of OUR signed uploads for THIS event.
  const pathOk = new RegExp(`^${event.id}/[0-9a-f-]{36}\\.(pdf|jpg|png)$`).test(proofPath);
  if (!pathOk) errors.proof = 'Please upload your proof of payment.';
  if (Object.keys(errors).length) {
    return NextResponse.json({ error: 'Please check the highlighted fields.', fields: errors }, { status: 400 });
  }

  // Verify the uploaded file really exists and really is a PDF/JPG/PNG.
  const { data: file, error: dlErr } = await db().storage.from(PROOF_BUCKET).download(proofPath);
  if (dlErr || !file) {
    return NextResponse.json({ error: 'Your upload did not finish. Please attach the file again.', fields: { proof: 'Upload again.' } }, { status: 400 });
  }
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const realMime = sniffProofMime(head);
  if (!realMime || file.size > MAX_PROOF_BYTES) {
    await removeProof();
    return NextResponse.json({ error: 'That file is not a valid PDF, JPG or PNG (max 10 MB).', fields: { proof: 'Invalid file.' } }, { status: 400 });
  }

  const { data, error } = await db()
    .from('registrations')
    .insert({
      event_id: event.id,
      full_name: fullName,
      phone,
      email,
      dietary: clean(b.dietary, 500) || null,
      heard_from: clean(b.heardFrom, 100) || null,
      looking_forward: clean(b.lookingForward, 1000) || null,
      custom_answer: event.custom_question ? clean(b.customAnswer, 1000) || null : null,
      proof_path: proofPath,
      proof_mime: realMime,
      proof_filename: clean(b.proofFilename, 150) || null,
    })
    .select('id')
    .single();

  if (error) {
    const msg = `${error.message} ${error.details ?? ''}`;
    // Same upload submitted twice (double-click / retry): the first one already saved it.
    if (error.code === '23505' && msg.includes('proof_path')) {
      return NextResponse.json({ ok: true });
    }
    await removeProof();
    if (msg.includes('EVENT_FULL') || msg.includes('RSVP_CLOSED')) {
      return NextResponse.json({ error: 'closed', closed: true }, { status: 409 });
    }
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'This WhatsApp number has already RSVP’d for this event.', fields: { phone: 'Already registered.' } },
        { status: 409 },
      );
    }
    console.error('registration insert failed', error);
    return NextResponse.json({ error: 'Something went wrong saving your RSVP. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id });
}
