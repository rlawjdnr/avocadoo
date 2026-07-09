self.addEventListener('push', (event) => {
  let data = {};

  try {
    data = event.data?.json() || {};
  } catch {
    data = {};
  }

  const title = data.title || '알림';
  const options = {
    body: data.body || '',
    icon: './app-icon-192-v20260703.png',
    badge: './app-icon-192-v20260703.png',
    data: {
      url: data.url || './',
      entryId: data.entryId || '',
      commentId: data.commentId || '',
      type: data.type || '',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = new URL(event.notification.data?.url || './', self.location.origin).href;
  const target = new URL(targetUrl);

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const targetClient = clientList.find((client) => {
        const clientUrl = new URL(client.url);
        return clientUrl.origin === target.origin && clientUrl.pathname === target.pathname;
      });
      if (targetClient) {
        if ('navigate' in targetClient) {
          return targetClient.navigate(targetUrl).then((client) => (client || targetClient).focus());
        }
        return targetClient.focus();
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
