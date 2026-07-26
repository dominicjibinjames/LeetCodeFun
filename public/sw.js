/* Patterngard service worker — Web Push */
const ICON = "/icons/patterngard-192.png";
const BADGE = "/icons/patterngard-badge.png";

self.addEventListener("push", (event) => {
  let data = {
    title: "The kingdom calls, my liege",
    body: "Your kingdom needs attention.",
    url: "/queue",
    icon: ICON,
    badge: BADGE,
  };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    /* ignore */
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || ICON,
      badge: data.badge || BADGE,
      data: { url: data.url || "/queue" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/queue";
  event.waitUntil(clients.openWindow(url));
});
