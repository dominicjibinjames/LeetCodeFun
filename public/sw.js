/* Patterngard service worker — Web Push */
const ICON = "/icons/patterngard-192.png";
const BADGE = "/icons/patterngard-badge.png";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

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
  // #region agent log
  event.waitUntil(
    (async () => {
      try {
        await fetch("http://127.0.0.1:7792/ingest/48f6c65e-228d-42ba-b906-d4f53717a7c3", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Debug-Session-Id": "9e8e6e",
          },
          body: JSON.stringify({
            sessionId: "9e8e6e",
            runId: "push-debug",
            hypothesisId: "G",
            location: "public/sw.js:push",
            message: "service worker received push",
            data: {
              title: String(data.title || "").slice(0, 80),
              bodyLen: String(data.body || "").length,
              hasClients: (await self.clients.matchAll({ type: "window" })).length,
            },
            timestamp: Date.now(),
          }),
        });
      } catch {
        /* ignore */
      }
      await self.registration.showNotification(data.title, {
        body: data.body,
        icon: data.icon || ICON,
        badge: data.badge || BADGE,
        data: { url: data.url || "/queue" },
      });
    })(),
  );
  // #endregion
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/queue";
  event.waitUntil(clients.openWindow(url));
});
