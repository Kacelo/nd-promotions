import Link from 'next/link';
import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth';
import '../admin.css';

export const metadata: Metadata = { title: 'Admin', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const email = await requireAdmin();
  return (
    <div className="admin">
      <header className="admin-top">
        <Link href="/admin" className="brand">Events admin</Link>
        <div className="who">
          <span>{email}</span>
          <form action="/admin/logout" method="post">
            <button className="a-btn small">Sign out</button>
          </form>
        </div>
      </header>
      <main className="admin-main">{children}</main>
    </div>
  );
}
