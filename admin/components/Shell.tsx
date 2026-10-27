'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { api, clearToken, getToken } from '../lib/api';
import { disablePush } from '../lib/webPush';
import { NotificationBell } from './NotificationBell';
import { SessionContext, type Session } from '../lib/session';
import { homeFor, STAFF_ROLES, type Facility, type Role, type User } from '../lib/types';

type NavItem = { href: string; label: string };

function navFor(user: User, facility: Facility | null): NavItem[] {
  if (user.role === 'admin') {
    return [
      { href: '/dashboard', label: 'Overview' },
      { href: '/facilities', label: 'Hospitals & clinics' },
      { href: '/doctors', label: 'Doctors' },
      { href: '/appointments', label: 'Appointments' },
      { href: '/users', label: 'Users' },
    ];
  }
  const items: NavItem[] = [{ href: '/facility', label: facility?.type === 'clinic' ? 'My clinic' : 'Overview' }];
  if (!facility) return items;
  items.push({ href: '/facility/appointments', label: 'Appointments' });
  if (facility.type === 'hospital') {
    items.push({ href: '/facility/departments', label: 'Departments' });
    items.push({ href: '/facility/doctors', label: 'Doctors' });
    if (user.role === 'facility_admin') items.push({ href: '/facility/staff', label: 'Reception staff' });
  } else {
    items.push({ href: '/facility/doctors', label: 'Fee & timings' });
  }
  return items;
}

/**
 * Guards panel pages: redirects to /login unless signed in with one of `allow`,
 * and loads the user's hospital/clinic for facility staff.
 */
export function Shell({ children, allow = ['admin'] }: { children: ReactNode; allow?: Role[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<Omit<Session, 'reload'> | null>(null);

  const signOut = useCallback(() => {
    clearToken();
    router.replace('/login');
  }, [router]);

  const load = useCallback(async () => {
    if (!getToken()) return signOut();
    try {
      const { user } = await api<{ user: User }>('/auth/me');
      if (user.role === 'patient') return signOut();
      if (!allow.includes(user.role)) return router.replace(homeFor(user.role));
      if (user.mustChangePassword && pathname !== '/account') return router.replace('/account');

      let facility: Facility | null = null;
      let canManage = false;
      if (STAFF_ROLES.includes(user.role)) {
        const res = await api<{ facility: Facility; canManage: boolean }>('/facility/me').catch(() => null);
        facility = res?.facility ?? null;
        canManage = res?.canManage ?? false;
      }
      setSession({ user, facility, canManage });
    } catch {
      signOut();
    }
    // allow is a fresh array literal on every render, so it is left out to avoid refetch loops
  }, [pathname, router, signOut]);

  useEffect(() => {
    load();
  }, [load]);

  // The browser keeps its push subscription; the next user to sign in here re-links it
  const userSignOut = () => disablePush({ unsubscribe: false }).catch(() => undefined).finally(signOut);

  if (!session) return <div style={{ padding: 40, color: 'var(--muted)' }}>Loading…</div>;

  const nav = navFor(session.user, session.facility);

  return (
    <SessionContext.Provider value={{ ...session, reload: load }}>
      <div className="layout">
        <aside className="sidebar">
          <div className="brand">mediqo<span>.</span> {session.user.role === 'admin' ? 'admin' : 'partner'}</div>
          {session.facility && <div className="facility-name">{session.facility.name}</div>}
          <NotificationBell role={session.user.role} />
          <nav className="nav">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className={pathname === item.href ? 'active' : ''}>
                {item.label}
              </Link>
            ))}
            <Link href="/account" className={pathname === '/account' ? 'active' : ''}>Account</Link>
          </nav>
          <div className="whoami">
            {session.user.name}
            <span>{session.user.role.replace('_', ' ')}</span>
          </div>
          <button className="btn" style={{ marginTop: 12, width: '100%' }} onClick={userSignOut}>
            Sign out
          </button>
        </aside>
        <main className="main" key={pathname}>
          {children}
        </main>
      </div>
    </SessionContext.Provider>
  );
}
