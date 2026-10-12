/**
 * Netlify scheduled function: once a day, run a tiny real query against Supabase so
 * free-tier projects don't get paused after a week of inactivity between events.
 *
 * Uses the service-role key because RLS blocks anon access to every table.
 * Scheduled functions only run on the published production deploy.
 */
export default async function keepAlive(): Promise<Response> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('keep-alive: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return new Response('missing env', { status: 500 });
  }

  const res = await fetch(`${url}/rest/v1/events?select=id&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) {
    console.error(`keep-alive: Supabase answered ${res.status}: ${await res.text()}`);
    return new Response('ping failed', { status: 502 });
  }
  console.log('keep-alive: Supabase pinged OK');
  return new Response('ok');
}

// Every day at 06:00 UTC (08:00 in Windhoek).
export const config = { schedule: '0 6 * * *' };
