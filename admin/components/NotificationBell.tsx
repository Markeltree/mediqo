'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';
import { disablePush, enablePush, getPushStatus, syncPush, type PushStatus } from '../lib/webPush';
import { useFeedback, type Tone } from './Feedback';
import type { Role } from '../lib/types';

type Item = { _id: string; title: string; body: string; read: boolean; createdAt: string; data?: { type?: string } };

const POLL_MS = 30_000;

function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function toneOf(title: string): Tone {
  const t = title.toLowerCase();
  if (t.includes('cancel') || t.includes('needs changes')) return 'error';
  if (t.includes('confirm') || t.includes('live') || t.includes('completed')) return 'success';
  if (t.includes('request') || t.includes('soon') || t.includes('upcoming')) return 'warning';
  return 'info';
}

function linkFor(role: Role, item: Item) {
  if (item.data?.type === 'appointment') return role === 'admin' ? '/appointments' : '/facility/appointments';
  if (item.data?.type === 'facility') return role === 'admin' ? '/facilities' : '/facility';
  return null;
}

/** Sidebar bell: unread count, recent notifications, live toasts and the browser-push switch. */
export function NotificationBell({ role }: { role: Role }) {
  const router = useRouter();
  const { toast } = useFeedback();
  const [items, setItems] = useState<Item[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [push, setPush] = useState<PushStatus>('unsupported');
  const [busy, setBusy] = useState(false);
  const newest = useRef<string | null>(null);
  const box = useRef<HTMLDivElement>(null);

  const load = useCallback(async (announce: boolean) => {
    const d = await api<{ notifications: Item[]; unread: number }>('/notifications').catch(() => null);
    if (!d) return;
    // Toast anything that arrived since the last poll (push events also trigger a reload)
    const since = newest.current;
    if (announce && since !== null) {
      const fresh = d.notifications.filter((n) => !n.read && n.createdAt > since);
      fresh.slice(0, 3).reverse().forEach((n) => toast({ title: n.title, message: n.body, tone: toneOf(n.title), duration: 6000 }));
    }
    newest.current = d.notifications[0]?.createdAt ?? newest.current ?? '';
    setItems(d.notifications);
    setUnread(d.unread);
  }, [toast]);

  useEffect(() => {
    load(false);
    const timer = setInterval(() => document.visibilityState === 'visible' && load(true), POLL_MS);
    getPushStatus().then(setPush);
    syncPush().catch(() => undefined);

    // The service worker tells open tabs about a push, and asks us to navigate if it cannot
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'mediqo-push') load(true);
      if (e.data?.type === 'mediqo-open') router.push(new URL(e.data.url).pathname);
    };
    navigator.serviceWorker?.addEventListener('message', onMessage);
    return () => {
      clearInterval(timer);
      navigator.serviceWorker?.removeEventListener('message', onMessage);
    };
  }, [load, router]);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const markAll = async () => {
    setItems((list) => list.map((n) => ({ ...n, read: true })));
    setUnread(0);
    await api('/notifications/read-all', { method: 'POST' }).catch(() => undefined);
  };

  const openItem = (n: Item) => {
    if (!n.read) {
      setItems((list) => list.map((x) => (x._id === n._id ? { ...x, read: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
      api(`/notifications/${n._id}/read`, { method: 'POST' }).catch(() => undefined);
    }
    const href = linkFor(role, n);
    if (href) {
      setOpen(false);
      router.push(href);
    }
  };

  const togglePush = async () => {
    setBusy(true);
    try {
      if (push === 'on') {
        await disablePush();
        setPush('off');
        toast({ tone: 'info', title: 'Desktop alerts off', message: 'You will still see notifications here.' });
      } else {
        const status = await enablePush();
        setPush(status);
        if (status === 'on') toast({ tone: 'success', title: 'Desktop alerts on', message: 'New bookings will pop up even when this tab is closed.' });
        else if (status === 'denied') toast({ tone: 'error', title: 'Notifications are blocked', message: 'Allow notifications for this site in your browser settings, then try again.', duration: 7000 });
      }
    } catch (e: any) {
      toast({ tone: 'error', title: 'Could not change desktop alerts', message: e.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bell-wrap" ref={box}>
      <button className={`bell${unread ? ' has-unread' : ''}`} onClick={() => setOpen((o) => !o)} aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        <span>Notifications</span>
        {unread > 0 && <span className="bell-count">{unread > 99 ? '99+' : unread}</span>}
      </button>

      {open && (
        <div className="bell-panel" role="dialog" aria-label="Notifications">
          <div className="bell-head">
            <strong>Notifications</strong>
            {unread > 0 && <button className="link-btn" onClick={markAll}>Mark all read</button>}
          </div>

          {push !== 'unsupported' && push !== 'disabled' && (
            <div className={`push-row${push === 'on' ? ' on' : ''}`}>
              <div>
                <strong>Desktop alerts</strong>
                <span>{push === 'on' ? 'On for this browser' : push === 'denied' ? 'Blocked in browser settings' : 'Get new bookings even when this tab is closed'}</span>
              </div>
              <button
                className={`switch${push === 'on' ? ' on' : ''}`}
                onClick={togglePush}
                disabled={busy || push === 'denied'}
                role="switch"
                aria-checked={push === 'on'}
                aria-label="Desktop alerts"
              />
            </div>
          )}

          <div className="bell-list">
            {items.length === 0 && <div className="bell-empty">No notifications yet</div>}
            {items.slice(0, 20).map((n) => (
              <button key={n._id} className={`bell-item ${toneOf(n.title)}${n.read ? '' : ' unread'}`} onClick={() => openItem(n)}>
                <span className="bell-dot" />
                <span className="bell-text">
                  <strong>{n.title}</strong>
                  <span>{n.body}</span>
                  <em>{timeAgo(n.createdAt)}</em>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
