'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { db, MEDIA_BUCKET, PROOF_BUCKET } from '@/lib/supabase';
import { EWALLET_PROVIDERS, STATUSES, type RegistrationStatus } from '@/lib/types';
import { IMAGE_TYPES, MAX_IMAGE_BYTES } from '@/lib/media';

export type FormState = { error?: string } | undefined;

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const orNull = (s: string) => (s === '' ? null : s);
const lines = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean);

/**
 * Admin images skip the server action body limit: the browser asks for a
 * one-time signed slot here, uploads straight to the public media bucket,
 * and only the resulting URL is submitted with the event form.
 */
export async function createImageUpload(
  slug: string,
  mime: string,
  size: number,
): Promise<{ token: string; path: string; url: string } | { error: string }> {
  await requireAdmin();
  const ext = IMAGE_TYPES[mime];
  if (!ext) return { error: 'Images must be JPG, PNG or WebP.' };
  if (!(size > 0) || size > MAX_IMAGE_BYTES) return { error: 'Images must be under 5 MB.' };
  const folder = /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) ? slug : 'unsorted';
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { data, error } = await db().storage.from(MEDIA_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { error: 'Could not prepare the image upload. Please try again.' };
  return { token: data.token, path: data.path, url: db().storage.from(MEDIA_BUCKET).getPublicUrl(data.path).data.publicUrl };
}

export async function saveEvent(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const id = str(fd, 'id');
  const slug = str(fd, 'slug').toLowerCase();
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return { error: 'Web address must be lowercase letters, numbers and dashes (e.g. her-era-2027).' };
  if (['admin', 'api'].includes(slug)) return { error: 'That web address is reserved.' };
  if (!str(fd, 'name')) return { error: 'Event name is required.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str(fd, 'event_date'))) return { error: 'Event date is required.' };
  const capacity = parseInt(str(fd, 'capacity'), 10);
  if (!(capacity > 0)) return { error: 'Guest limit must be at least 1.' };
  const price = Number(str(fd, 'price') || '0');
  if (!(price >= 0)) return { error: 'Price must be a number.' };

  const paymentMethod = str(fd, 'payment_method') === 'ewallet' ? 'ewallet' : 'bank';
  const ewalletNumber = str(fd, 'ewallet_number');
  const ewalletProviders = fd.getAll('ewallet_providers').map(String).filter((p) => EWALLET_PROVIDERS.includes(p));
  if (paymentMethod === 'ewallet') {
    if (ewalletNumber.replace(/\D/g, '').length < 7) return { error: 'Enter the phone number guests should send the e-wallet to.' };
    if (ewalletProviders.length === 0) return { error: 'Tick at least one e-wallet you accept.' };
  }

  const palette = str(fd, 'dress_palette').split(/[\s,]+/).filter(Boolean);
  if (palette.some((c) => !/^#[0-9a-fA-F]{3,8}$/.test(c))) return { error: 'Dress code colours must be hex codes like #d8aaa4.' };

  const row = {
    slug,
    name: str(fd, 'name'),
    tagline: orNull(str(fd, 'tagline')),
    subtitle: orNull(str(fd, 'subtitle')),
    event_date: str(fd, 'event_date'),
    start_time: orNull(str(fd, 'start_time')),
    end_time: orNull(str(fd, 'end_time')),
    venue: orNull(str(fd, 'venue')),
    venue_note: orNull(str(fd, 'venue_note')),
    about: orNull(str(fd, 'about')),
    about_highlight: orNull(str(fd, 'about_highlight')),
    hero_image_url: orNull(str(fd, 'hero_image_url')),
    about_image_url: orNull(str(fd, 'about_image_url')),
    price,
    currency: str(fd, 'currency') || 'N$',
    inclusions: lines(str(fd, 'inclusions')),
    capacity,
    rsvp_open: fd.get('rsvp_open') === 'on',
    dress_code_title: orNull(str(fd, 'dress_code_title')),
    dress_code_text: orNull(str(fd, 'dress_code_text')),
    dress_palette: palette,
    payment_method: paymentMethod,
    bank_name: orNull(str(fd, 'bank_name')),
    account_name: orNull(str(fd, 'account_name')),
    account_number: orNull(str(fd, 'account_number')),
    branch_code: orNull(str(fd, 'branch_code')),
    payment_reference: orNull(str(fd, 'payment_reference')),
    ewallet_number: orNull(ewalletNumber),
    ewallet_name: orNull(str(fd, 'ewallet_name')),
    ewallet_providers: ewalletProviders,
    package_title: orNull(str(fd, 'package_title')),
    package_images: [0, 1, 2].map((i) => str(fd, `package_image_url_${i}`)).filter(Boolean),
    custom_question: orNull(str(fd, 'custom_question')),
    spaces_title: orNull(str(fd, 'spaces_title')),
    spaces_text: orNull(str(fd, 'spaces_text')),
  };

  const q = id
    ? db().from('events').update(row).eq('id', id).select('id').single()
    : db().from('events').insert(row).select('id').single();
  const { data, error } = await q;
  if (error) {
    if (error.code === '23505') return { error: 'Another event already uses that web address.' };
    return { error: error.message };
  }
  revalidatePath('/admin');
  redirect(`/admin/events/${data.id}`);
}

export async function setRsvpOpen(eventId: string, open: boolean) {
  await requireAdmin();
  await db().from('events').update({ rsvp_open: open }).eq('id', eventId);
  revalidatePath(`/admin/events/${eventId}`);
}

export async function setStatus(regId: string, status: RegistrationStatus): Promise<{ error?: string }> {
  await requireAdmin();
  if (!STATUSES.includes(status)) return { error: 'Unknown status.' };
  const { data, error } = await db().from('registrations').update({ status }).eq('id', regId).select('event_id').single();
  if (error) {
    const msg = `${error.message}`;
    if (msg.includes('EVENT_FULL')) return { error: 'The event is full — cancel another registration or raise the guest limit first.' };
    if (error.code === '23505') return { error: 'This number already has an active registration for this event.' };
    return { error: error.message };
  }
  revalidatePath(`/admin/events/${data.event_id}`);
  return {};
}

export async function deleteRegistration(regId: string) {
  await requireAdmin();
  const { data } = await db().from('registrations').select('event_id, proof_path').eq('id', regId).single();
  if (!data) return;
  await db().from('registrations').delete().eq('id', regId);
  await db().storage.from(PROOF_BUCKET).remove([data.proof_path]);
  revalidatePath(`/admin/events/${data.event_id}`);
}

export async function deleteEvent(eventId: string) {
  await requireAdmin();
  const { data: regs } = await db().from('registrations').select('proof_path').eq('event_id', eventId);
  const paths = (regs ?? []).map((r) => r.proof_path);
  for (let i = 0; i < paths.length; i += 100) {
    await db().storage.from(PROOF_BUCKET).remove(paths.slice(i, i + 100));
  }
  await db().from('events').delete().eq('id', eventId);
  revalidatePath('/admin');
  redirect('/admin');
}
