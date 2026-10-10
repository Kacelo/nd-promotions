'use client';

import { useActionState, useState } from 'react';
import { browserStorage } from '@/lib/browser-storage';
import { createImageUpload, saveEvent, type FormState } from './actions';
import { EWALLET_PROVIDERS, type EventRow, type PaymentMethod } from '@/lib/types';
import { IMAGE_TYPES, MAX_IMAGE_BYTES } from '@/lib/media';
import { compressImage, MAX_ORIGINAL_BYTES } from '@/lib/compress-image';

type Props = { event?: EventRow };

function slugify(s: string) {
  return s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-');
}

export default function EventForm({ event }: Props) {
  const storage = browserStorage();

  // Images go straight to storage first, so the form submit only carries their URLs
  // (files in the action body would hit the server action size limit).
  async function submit(prev: FormState, fd: FormData): Promise<FormState> {
    const imageFields = [
      ['hero_file', 'hero_image_url'],
      ['about_file', 'about_image_url'],
      ...[0, 1, 2].map((i) => [`package_file_${i}`, `package_image_url_${i}`]),
    ];
    for (const [fileField, urlField] of imageFields) {
      const original = fd.get(fileField);
      fd.delete(fileField);
      if (!(original instanceof File) || original.size === 0) continue;
      if (!IMAGE_TYPES[original.type]) return { error: 'Images must be JPG, PNG or WebP.' };
      if (original.size > MAX_ORIGINAL_BYTES) return { error: `“${original.name}” is too large — images must be under 25 MB.` };
      let file: File;
      try {
        file = await compressImage(original);
      } catch {
        return { error: `“${original.name}” could not be read. Try saving it as a JPG first.` };
      }
      if (file.size > MAX_IMAGE_BYTES) return { error: `“${original.name}” is still over 5 MB after compressing — try a smaller image.` };
      const slot = await createImageUpload(String(fd.get('slug') ?? ''), file.type, file.size);
      if ('error' in slot) return { error: slot.error };
      const up = await storage.from('event-media').uploadToSignedUrl(slot.path, slot.token, file, { contentType: file.type });
      if (up.error) return { error: 'Image upload failed: ' + up.error.message };
      fd.set(urlField, slot.url);
    }
    return saveEvent(prev, fd);
  }

  const [state, action, pending] = useActionState<FormState, FormData>(submit, undefined);
  const [slug, setSlug] = useState(event?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(!!event);
  const [payMethod, setPayMethod] = useState<PaymentMethod>(event?.payment_method ?? 'bank');
  const e = event;

  return (
    <form action={action} className="a-form">
      {e && <input type="hidden" name="id" value={e.id} />}
      {state?.error && <div className="a-error" role="alert">{state.error}</div>}

      <fieldset>
        <legend>Basics</legend>
        <div className="a-grid">
          <label className="a-label">Event name *
            <input className="a-input" name="name" required defaultValue={e?.name}
              onChange={(ev) => { if (!slugTouched) setSlug(slugify(ev.target.value)); }} />
          </label>
          <label className="a-label">Web address *
            <input className="a-input" name="slug" required value={slug}
              onChange={(ev) => { setSlugTouched(true); setSlug(ev.target.value); }} />
            <span className="hint">yoursite.com/<b>{slug || 'her-era'}</b></span>
          </label>
        </div>
        <div className="a-grid">
          <label className="a-label">Tagline<input className="a-input" name="tagline" defaultValue={e?.tagline ?? ''} placeholder="A more intentional you." /></label>
          <label className="a-label">Subtitle<input className="a-input" name="subtitle" defaultValue={e?.subtitle ?? ''} placeholder="Because we never stop becoming." /></label>
        </div>
        <div className="a-grid">
          <label className="a-label">Date *<input className="a-input" type="date" name="event_date" required defaultValue={e?.event_date} /></label>
          <label className="a-label">Start time<input className="a-input" type="time" name="start_time" defaultValue={e?.start_time?.slice(0, 5) ?? ''} /></label>
          <label className="a-label">End time<input className="a-input" type="time" name="end_time" defaultValue={e?.end_time?.slice(0, 5) ?? ''} /></label>
        </div>
        <div className="a-grid">
          <label className="a-label">Venue<input className="a-input" name="venue" defaultValue={e?.venue ?? ''} placeholder="Windhoek, Namibia" /></label>
          <label className="a-label">Venue note<input className="a-input" name="venue_note" defaultValue={e?.venue_note ?? ''} placeholder="Venue details shared upon confirmation." /></label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Tickets & capacity</legend>
        <div className="a-grid">
          <label className="a-label">Guest limit *<input className="a-input" type="number" min={1} name="capacity" required defaultValue={e?.capacity ?? 25} /></label>
          <label className="a-label">Price<input className="a-input" type="number" min={0} step="0.01" name="price" defaultValue={e?.price ?? 0} /></label>
          <label className="a-label">Currency symbol<input className="a-input" name="currency" defaultValue={e?.currency ?? 'N$'} /></label>
        </div>
        <label className="a-label">What the ticket includes <span className="hint">One per line</span>
          <textarea className="a-textarea" name="inclusions" defaultValue={e?.inclusions.join('\n') ?? ''} placeholder={'Journal + pen\nFood + refreshments'} />
        </label>
        <label className="a-check"><input type="checkbox" name="rsvp_open" defaultChecked={e?.rsvp_open ?? true} /> RSVPs open</label>
        <span className="hint" style={{ fontSize: 13, color: 'var(--muted)' }}>RSVPs close automatically once the guest limit is reached, whatever this is set to.</span>
      </fieldset>

      <fieldset>
        <legend>Payment details</legend>
        <div className="a-toggle" role="radiogroup" aria-label="How guests pay">
          {([['bank', 'Bank transfer'], ['ewallet', 'E-wallet']] as const).map(([value, label]) => (
            <label key={value} className={payMethod === value ? 'on' : ''}>
              <input type="radio" name="payment_method" value={value} checked={payMethod === value} onChange={() => setPayMethod(value)} />
              {label}
            </label>
          ))}
        </div>

        {/* Both sections stay mounted so the hidden one's details are kept for switching back. */}
        <div className="a-grid" hidden={payMethod !== 'bank'}>
          <label className="a-label">Bank<input className="a-input" name="bank_name" defaultValue={e?.bank_name ?? ''} /></label>
          <label className="a-label">Account name<input className="a-input" name="account_name" defaultValue={e?.account_name ?? ''} /></label>
          <label className="a-label">Account number<input className="a-input" name="account_number" defaultValue={e?.account_number ?? ''} /></label>
          <label className="a-label">Branch code<input className="a-input" name="branch_code" defaultValue={e?.branch_code ?? ''} /></label>
          <label className="a-label">Payment reference<input className="a-input" name="payment_reference" defaultValue={e?.payment_reference ?? 'Your full name'} /></label>
        </div>

        <div hidden={payMethod !== 'ewallet'}>
          <div className="a-grid">
            <label className="a-label">E-wallet phone number *
              <input className="a-input" type="tel" name="ewallet_number" defaultValue={e?.ewallet_number ?? ''} placeholder="081 234 5678" required={payMethod === 'ewallet'} />
            </label>
            <label className="a-label">Name on the e-wallet<input className="a-input" name="ewallet_name" defaultValue={e?.ewallet_name ?? ''} /></label>
          </div>
          <span className="a-label" style={{ marginTop: 14 }}>E-wallets you accept *</span>
          <div className="a-checks">
            {EWALLET_PROVIDERS.map((p) => (
              <label key={p} className="a-check">
                <input type="checkbox" name="ewallet_providers" value={p} defaultChecked={e?.ewallet_providers.includes(p) ?? false} /> {p}
              </label>
            ))}
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend>Page content</legend>
        <label className="a-label">About <span className="hint">Leave a blank line between paragraphs</span>
          <textarea className="a-textarea" name="about" rows={6} defaultValue={e?.about ?? ''} />
        </label>
        <label className="a-label">Highlight lines <span className="hint">One per line, e.g. “Different ages.”</span>
          <textarea className="a-textarea" name="about_highlight" defaultValue={e?.about_highlight ?? ''} />
        </label>
        <label className="a-label">Extra RSVP question <span className="hint">Optional, e.g. “What are you currently becoming?”</span>
          <input className="a-input" name="custom_question" defaultValue={e?.custom_question ?? ''} />
        </label>
        <div className="a-grid">
          <label className="a-label">Tickets card headline <span className="hint">Replaces a spaces count, e.g. “25 women. One table.”</span>
            <input className="a-input" name="spaces_title" defaultValue={e?.spaces_title ?? ''} />
          </label>
          <label className="a-label">Tickets card line <span className="hint">Optional, shown under the headline</span>
            <input className="a-input" name="spaces_text" defaultValue={e?.spaces_text ?? ''} />
          </label>
        </div>
        <div className="a-grid">
          <label className="a-label">Dress code title<input className="a-input" name="dress_code_title" defaultValue={e?.dress_code_title ?? ''} placeholder="Soft Neutrals & Rich Tones" /></label>
          <label className="a-label">Dress code colours <span className="hint">Hex codes, comma separated</span>
            <input className="a-input" name="dress_palette" defaultValue={e?.dress_palette.join(', ') ?? ''} placeholder="#efe4da, #d8aaa4, #4a2c22" />
          </label>
        </div>
        <label className="a-label">Dress code description<textarea className="a-textarea" name="dress_code_text" defaultValue={e?.dress_code_text ?? ''} /></label>
      </fieldset>

      <fieldset>
        <legend>Images</legend>
        <div className="a-grid">
          <div className="a-label">Hero background
            {e?.hero_image_url && <img className="thumb" src={e.hero_image_url} alt="" />}
            <input className="a-input" type="file" name="hero_file" accept="image/jpeg,image/png,image/webp" />
            <input className="a-input" name="hero_image_url" defaultValue={e?.hero_image_url ?? ''} placeholder="…or paste an image URL" />
          </div>
          <div className="a-label">About section photo
            {e?.about_image_url && <img className="thumb" src={e.about_image_url} alt="" />}
            <input className="a-input" type="file" name="about_file" accept="image/jpeg,image/png,image/webp" />
            <input className="a-input" name="about_image_url" defaultValue={e?.about_image_url ?? ''} placeholder="…or paste an image URL" />
          </div>
        </div>
        <span className="hint" style={{ fontSize: 13, color: 'var(--muted)' }}>JPG, PNG or WebP, up to 25 MB — images are resized and compressed automatically. Clear a URL field to remove an image.</span>
      </fieldset>

      <fieldset>
        <legend>Package images</legend>
        <label className="a-label">Heading <span className="hint">Optional, e.g. “The HER ERA package”</span>
          <input className="a-input" name="package_title" defaultValue={e?.package_title ?? ''} />
        </label>
        <div className="a-grid" style={{ marginTop: 16 }}>
          {[0, 1, 2].map((i) => {
            const url = e?.package_images[i];
            return (
              <div className="a-label" key={i}>Image {i + 1}
                {url && <img className="thumb" src={url} alt="" />}
                <input className="a-input" type="file" name={`package_file_${i}`} accept="image/jpeg,image/png,image/webp" />
                <input className="a-input" name={`package_image_url_${i}`} defaultValue={url ?? ''} placeholder="…or paste an image URL" />
              </div>
            );
          })}
        </div>
        <span className="hint" style={{ fontSize: 13, color: 'var(--muted)' }}>Shown under “What your ticket includes”, side by side. Use one, two or three — empty slots are skipped.</span>
      </fieldset>

      <div className="a-actions">
        <button className="a-btn primary" disabled={pending}>{pending ? 'Saving…' : e ? 'Save changes' : 'Create event'}</button>
      </div>
    </form>
  );
}
