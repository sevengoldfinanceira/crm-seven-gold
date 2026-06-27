(() => {
  if (!("serviceWorker" in navigator)) return;

  let refreshing = false;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  window.addEventListener("load", async () => {
    try {
      await navigator.serviceWorker.register("/service-worker.js", { scope: "/" });
    } catch (error) {
      console.warn("Falha ao registrar service worker.", error);
    }
  });
})();
