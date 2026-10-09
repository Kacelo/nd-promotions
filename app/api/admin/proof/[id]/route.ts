import { NextResponse } from 'next/server';
import { currentAdmin } from '@/lib/auth';
import { db, PROOF_BUCKET } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * Proof of payment viewer. Admin-only. Redirects to a signed URL that
 * expires after 60 seconds, so the file never has a permanent public link.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await currentAdmin())) return NextResponse.redirect(new URL('/admin/login', req.url));

  const { id } = await params;
  const { data: reg } = await db()
    .from('registrations')
    .select('full_name, proof_path, proof_mime')
    .eq('id', id)
    .maybeSingle();
  if (!reg) return new NextResponse('Not found', { status: 404 });

  const download = new URL(req.url).searchParams.has('download');
  const ext = reg.proof_path.split('.').pop();
  const niceName = `proof-of-payment-${reg.full_name.replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase()}.${ext}`;

  const { data, error } = await db()
    .storage.from(PROOF_BUCKET)
    .createSignedUrl(reg.proof_path, 60, download ? { download: niceName } : undefined);
  if (error || !data) return new NextResponse('Could not open file', { status: 500 });

  const res = NextResponse.redirect(data.signedUrl);
  res.headers.set('Cache-Control', 'no-store');
  return res;
}
