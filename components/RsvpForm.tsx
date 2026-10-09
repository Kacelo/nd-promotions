'use client';

import { useRef, useState } from 'react';
import { browserStorage } from '@/lib/browser-storage';
import { HEARD_FROM_OPTIONS, type PaymentMethod } from '@/lib/types';
import { MAX_PROOF_BYTES, PROOF_ACCEPT, guessProofMime } from '@/lib/proof';
import { ArrowIcon, CheckIcon, LockIcon, NamibiaFlag, SealIcon, UploadIcon } from './icons';

type PublicEvent = {
  slug: string;
  name: string;
  capacity: number;
  price: string;
  payment_method: PaymentMethod;
  bank_name: string | null;
  account_name: string | null;
  account_number: string | null;
  branch_code: string | null;
  payment_reference: string | null;
  ewallet_number: string | null;
  ewallet_name: string | null;
  ewallet_providers: string[];
  custom_question: string | null;
};

type Props = { event: PublicEvent; open: boolean; closedByCapacity: boolean; spotsLeft: number };

function ClosedMessage({ capacity, byCapacity }: { capacity: number; byCapacity: boolean }) {
  return (
    <div className="closed" role="status">
      <div className="seal"><SealIcon /></div>
      <h3>RSVPs are now closed</h3>
      <p>
        {byCapacity
          ? `All ${capacity} spaces have been reserved. Thank you for the love — we hope to see you at the next one.`
          : 'RSVPs for this event are no longer being accepted. Thank you for your interest.'}
      </p>
    </div>
  );
}

export default function RsvpForm({ event, open, closedByCapacity, spotsLeft }: Props) {
  const [state, setState] = useState<'form' | 'sending' | 'done' | 'closed'>(open ? 'form' : 'closed');
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);

  const storage = browserStorage();

  // If it was open when the page loaded and closed while filling in, the last spot was just taken.
  if (state === 'closed') return <ClosedMessage capacity={event.capacity} byCapacity={closedByCapacity || open} />;

  if (state === 'done') {
    return (
      <div className="done" role="status">
        <div className="seal"><CheckIcon /></div>
        <h3>Thank you — your RSVP is in.</h3>
        <p>We’ve received your details and proof of payment. Your place will be confirmed on WhatsApp once your payment has been verified.</p>
      </div>
    );
  }

  function pickFile(f: File | undefined | null) {
    setFields((x) => ({ ...x, proof: '' }));
    if (!f) return;
    if (!guessProofMime(f.name, f.type)) {
      setFields((x) => ({ ...x, proof: 'Please choose a PDF, JPG or PNG file.' }));
      return;
    }
    if (f.size > MAX_PROOF_BYTES) {
      setFields((x) => ({ ...x, proof: 'That file is larger than 10 MB. Try a screenshot or a smaller PDF.' }));
      return;
    }
    setFile(f);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const fd = new FormData(e.currentTarget);
    const v = (k: string) => String(fd.get(k) ?? '').trim();

    const errs: Record<string, string> = {};
    if (v('fullName').length < 2) errs.fullName = 'Please enter your full name.';
    if (v('phone').replace(/\D/g, '').length < 7) errs.phone = 'Please enter your WhatsApp number.';
    if (v('email') && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v('email'))) errs.email = 'Please enter a valid email address.';
    if (!file) errs.proof = 'Please upload your proof of payment.';
    if (!fd.get('confirmPaid')) errs.confirmPaid = 'Please tick to confirm you have paid.';
    setFields(errs);
    if (Object.keys(errs).length) {
      setError('Please check the highlighted fields.');
      return;
    }

    setState('sending');
    try {
      const mime = guessProofMime(file!.name, file!.type)!;
      // 1. Get a private, one-time upload slot from our server
      const slot = await fetch('/api/rsvp/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: event.slug, mime, size: file!.size }),
      }).then((r) => r.json().then((j) => ({ status: r.status, ...j })));
      if (slot.closed) return setState('closed');
      if (!slot.path) throw new Error(slot.error || 'Upload could not start.');

      // 2. Upload the file directly to private storage
      const up = await storage
        .from('payment-proofs')
        .uploadToSignedUrl(slot.path, slot.token, file!, { contentType: mime });
      if (up.error) throw new Error('Your file could not be uploaded. Please check your connection and try again.');

      // 3. Save the RSVP (server re-checks capacity inside the database)
      const res = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: event.slug,
          fullName: v('fullName'),
          phone: v('phone'),
          email: v('email'),
          dietary: v('dietary'),
          heardFrom: v('heardFrom'),
          lookingForward: v('lookingForward'),
          customAnswer: v('customAnswer'),
          website: v('website'),
          confirmPaid: true,
          proofPath: slot.path,
          proofFilename: file!.name,
        }),
      });
      const out = await res.json();
      if (out.closed) return setState('closed');
      if (!res.ok) {
        setFields(out.fields ?? {});
        if (out.fields?.proof) setFile(null);
        throw new Error(out.error || 'Something went wrong.');
      }
      setState('done');
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setState('form');
    }
  }

  const f = (name: string) => (fields[name] ? 'field has-error' : 'field');
  const errText = (name: string) => (fields[name] ? <div className="err">{fields[name]}</div> : null);
  const sending = state === 'sending';

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate>
      <div className="rsvp-head">
        <h2>RSVP</h2>
        <p>Please complete the form below to secure your place at {event.name}.</p>
        {spotsLeft <= 10 && <span className="left-count">{spotsLeft} {spotsLeft === 1 ? 'space' : 'spaces'} left</span>}
      </div>

      {error && <div className="form-error" role="alert">{error}</div>}

      <div className={f('fullName')}>
        <label htmlFor="fullName">Full name <span className="req">*</span></label>
        <input className="input" id="fullName" name="fullName" autoComplete="name" placeholder="Enter your full name" required maxLength={120} />
        {errText('fullName')}
      </div>

      <div className={f('phone')}>
        <label htmlFor="phone">WhatsApp number <span className="req">*</span></label>
        <div className="phone">
          <span className="cc"><NamibiaFlag className="flag" />+264</span>
          <input className="input" id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="81 234 5678" required maxLength={20} />
        </div>
        {errText('phone')}
      </div>

      <div className={f('email')}>
        <label htmlFor="email">Email address <span className="opt">(optional)</span></label>
        <input className="input" id="email" name="email" type="email" autoComplete="email" placeholder="Enter your email address" maxLength={200} />
        {errText('email')}
      </div>

      <div className="field">
        <label htmlFor="dietary">Dietary requirements / allergies <span className="opt">(optional)</span></label>
        <input className="input" id="dietary" name="dietary" placeholder="E.g. vegetarian, no dairy, allergies, etc." maxLength={500} />
      </div>

      <div className="field">
        <label htmlFor="heardFrom">How did you hear about {event.name}? <span className="opt">(optional)</span></label>
        <select className="select" id="heardFrom" name="heardFrom" defaultValue="">
          <option value="" disabled>Select an option</option>
          {HEARD_FROM_OPTIONS.map((o) => <option key={o}>{o}</option>)}
        </select>
      </div>

      <div className="field">
        <label htmlFor="lookingForward">What are you most looking forward to? <span className="opt">(optional)</span></label>
        <textarea className="textarea" id="lookingForward" name="lookingForward" placeholder="E.g. meeting new women, the conversations, wellness, inspiration, etc." maxLength={1000} />
      </div>

      {event.custom_question && (
        <div className="field">
          <label htmlFor="customAnswer">{event.custom_question} <span className="opt">(optional)</span></label>
          <textarea className="textarea" id="customAnswer" name="customAnswer" placeholder="Tell us what this season of your life looks like for you." maxLength={1000} />
        </div>
      )}

      <div className="hp" aria-hidden="true">
        <label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>

      <div className="divider" />

      <div className="pay">
        <h2>Payment</h2>
        {event.payment_method === 'ewallet' ? (
          <>
            <p>Please send {event.price} by e-wallet to:</p>
            <div className="bank">
              <div>Phone number: <b>{event.ewallet_number}</b></div>
              {event.ewallet_name && <div>Name: <b>{event.ewallet_name}</b></div>}
              {event.ewallet_providers.length > 0 && <div>Accepted: <b>{event.ewallet_providers.join(', ')}</b> e-wallet</div>}
            </div>
          </>
        ) : (
          <>
            <p>Please make the payment of {event.price} to the following details:</p>
            <div className="bank">
              {event.bank_name && <div>Bank: <b>{event.bank_name}</b></div>}
              {event.account_name && <div>Account name: <b>{event.account_name}</b></div>}
              {event.account_number && <div>Account number: <b>{event.account_number}</b></div>}
              {event.branch_code && <div>Branch code: <b>{event.branch_code}</b></div>}
              <div>Reference: <b>{event.payment_reference || 'Your full name'}</b></div>
            </div>
          </>
        )}
      </div>

      <div className={f('proof')} style={{ marginTop: 22 }}>
        <span className="label">Upload proof of payment <span className="req" style={{ color: 'var(--danger)' }}>*</span></span>
        <label
          className={`dropzone${drag ? ' drag' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); pickFile(e.dataTransfer.files?.[0]); }}
        >
          <input type="file" accept={PROOF_ACCEPT} onChange={(e) => pickFile(e.target.files?.[0])} aria-label="Upload proof of payment" />
          <div>
            <UploadIcon />
            {file ? (
              <div><span className="chosen">{file.name}</span><br />Tap to change file</div>
            ) : (
              <div>Click to upload or drag and drop<br />(PDF, JPG, PNG · max 10 MB)</div>
            )}
          </div>
        </label>
        {errText('proof')}
      </div>

      <div className={f('confirmPaid')}>
        <label className="check">
          <input type="checkbox" name="confirmPaid" value="yes" />
          <span>I confirm that I have made the payment of {event.price} and understand that my place will be confirmed once my payment has been verified. <span style={{ color: 'var(--danger)' }}>*</span></span>
        </label>
        {errText('confirmPaid')}
      </div>

      <button className="btn" type="submit" disabled={sending}>
        {sending ? 'Sending…' : <>Confirm RSVP <ArrowIcon /></>}
      </button>
      <div className="secure"><LockIcon /> Your information is secure.</div>
    </form>
  );
}
