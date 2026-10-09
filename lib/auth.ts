import 'server-only';
import { redirect } from 'next/navigation';
import { authClient } from './supabase';

function allowList(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** Returns the admin's email, or null if the visitor is not an allowed admin. */
export async function currentAdmin(): Promise<string | null> {
  const supabase = await authClient();
  const { data } = await supabase.auth.getUser(); // verifies the JWT with Supabase
  const email = data.user?.email?.toLowerCase();
  if (!email || !allowList().includes(email)) return null;
  return email;
}

/** For pages and server actions: bounce to login if not an admin. */
export async function requireAdmin(): Promise<string> {
  const email = await currentAdmin();
  if (!email) redirect('/admin/login');
  return email;
}
