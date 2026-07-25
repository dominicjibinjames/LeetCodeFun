/* Patterngard service worker — Web Push */
self.addEventListener("push", (event) => {
  let data = { title: "Patterngard", body: "Your kingdom needs attention.", url: "/queue" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    /* ignore */
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      data: { url: data.url || "/queue" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/queue";
  event.waitUntil(clients.openWindow(url));
});
