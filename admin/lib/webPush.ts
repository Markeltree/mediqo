import { api } from './api';

export type PushStatus = 'unsupported' | 'disabled' | 'denied' | 'off' | 'on';

export const pushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

let keyPromise: Promise<{ enabled: boolean; publicKey: string | null }> | null = null;
const serverKey = () =>
  (keyPromise ??= api<{ enabled: boolean; publicKey: string | null }>('/notifications/web-push/key').catch((e) => {
    keyPromise = null; // retry on the next call
    throw e;
  }));

const registration = () => navigator.serviceWorker.register('/sw.js');

export async function getPushStatus(): Promise<PushStatus> {
  if (!pushSupported()) return 'unsupported';
  const { enabled } = await serverKey().catch(() => ({ enabled: false }));
  if (!enabled) return 'disabled';
  if (Notification.permission === 'denied') return 'denied';
  const sub = await (await registration()).pushManager.getSubscription();
  return sub && Notification.permission === 'granted' ? 'on' : 'off';
}

/** Asks for permission, subscribes this browser and registers it with the API. */
export async function enablePush(): Promise<PushStatus> {
  if (!pushSupported()) return 'unsupported';
  const { enabled, publicKey } = await serverKey();
  if (!enabled || !publicKey) return 'disabled';

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off';

  const reg = await registration();
  await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) }));
  await api('/notifications/web-push', { method: 'POST', body: JSON.stringify(sub.toJSON()) });
  return 'on';
}

/** Re-sends an existing subscription after sign-in, since the browser may now belong to another user. */
export async function syncPush() {
  if ((await getPushStatus()) !== 'on') return;
  const sub = await (await registration()).pushManager.getSubscription();
  if (sub) await api('/notifications/web-push', { method: 'POST', body: JSON.stringify(sub.toJSON()) });
}

/**
 * Stops pushes to this browser for the signed-in user. Call before clearing the auth token.
 * On sign-out the browser keeps its subscription (`unsubscribe: false`) so the next user is re-linked by syncPush.
 */
export async function disablePush({ unsubscribe = true } = {}) {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration('/sw.js');
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await api('/notifications/web-push', { method: 'DELETE', body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => undefined);
  if (unsubscribe) await sub.unsubscribe();
}
