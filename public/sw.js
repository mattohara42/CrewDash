// Shows CrewDash result notifications and opens the regatta when one is tapped.

function readPayload(event) {
  try {
    return event.data ? event.data.json() : {};
  } catch {
    // Show something even if the payload is malformed. iOS can stop delivering
    // to a site whose push events don't show a notification.
    return { body: event.data ? event.data.text() : "" };
  }
}

self.addEventListener("push", (event) => {
  const data = readPayload(event);
  const options = {
    body: data.body || "New results are in.",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: data.url || "/" },
  };
  // Only set a tag when there is one. Some browsers drop notifications with an empty tag.
  if (data.tag) options.tag = data.tag;
  event.waitUntil(self.registration.showNotification(data.title || "CrewDash", options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  // Only paths on this site, whatever the payload says.
  const url = new URL(event.notification.data?.url || "/", self.location.origin);
  const target = url.origin === self.location.origin ? url.href : self.location.origin;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const w of windows) {
        if (w.url === target && "focus" in w) return w.focus();
      }
      return self.clients.openWindow(target);
    }),
  );
});
