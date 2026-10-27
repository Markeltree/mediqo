/* Mediqo web panel service worker: shows browser push notifications and opens the right page on click. */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data && event.data.text() };
  }

  event.waitUntil(
    (async () => {
      // Open tabs refresh their bell and show an in-page toast
      const tabs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      tabs.forEach((tab) => tab.postMessage({ type: 'mediqo-push', payload }));

      await self.registration.showNotification(payload.title || 'Mediqo', {
        body: payload.body || '',
        tag: payload.tag || undefined,
        renotify: Boolean(payload.tag),
        requireInteraction: /request/i.test(payload.title || ''),
        data: { url: payload.url || '/' },
      });
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href;

  event.waitUntil(
    (async () => {
      const tabs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const tab = tabs.find((t) => t.url.startsWith(self.location.origin));
      if (tab) {
        await tab.focus();
        return tab.navigate(url).catch(() => tab.postMessage({ type: 'mediqo-open', url }));
      }
      return self.clients.openWindow(url);
    })()
  );
});
