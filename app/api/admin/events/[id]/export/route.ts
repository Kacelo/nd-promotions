import { NextResponse } from 'next/server';
import { currentAdmin } from '@/lib/auth';
import { db } from '@/lib/supabase';
import { formatRegistered } from '@/lib/format';
import type { EventRow, RegistrationRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

/** Escape for CSV and neutralise spreadsheet formula injection. */
function cell(v: unknown): string {
  let s = v == null ? '' : String(v);
  const isPhone = /^\+[\d ]+$/.test(s);
  if (!isPhone && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await currentAdmin())) return new NextResponse('Unauthorised', { status: 401 });
  const { id } = await params;

  const [{ data: ev }, { data: regs }] = await Promise.all([
    db().from('events').select('*').eq('id', id).maybeSingle(),
    db().from('registrations').select('*').eq('event_id', id).order('created_at'),
  ]);
  if (!ev) return new NextResponse('Not found', { status: 404 });
  const event = ev as EventRow;
  const site = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;

  const header = [
    '#', 'Guest', 'WhatsApp', 'Email', 'Status', 'Date registered',
    'Dietary', 'Heard via', 'Looking forward to',
    ...(event.custom_question ? [event.custom_question] : []),
    'Proof of payment (admin login required)',
  ];
  const rows = ((regs ?? []) as RegistrationRow[]).map((r, i) => [
    i + 1, r.full_name, r.phone, r.email, r.status, formatRegistered(r.created_at),
    r.dietary, r.heard_from, r.looking_forward,
    ...(event.custom_question ? [r.custom_answer] : []),
    `${site}/api/admin/proof/${r.id}`,
  ]);

  const csv = '﻿' + [header, ...rows].map((row) => row.map(cell).join(',')).join('\r\n');
  const filename = `${event.slug}-guest-list-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
