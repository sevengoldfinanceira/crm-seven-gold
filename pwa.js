(() => {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", async () => {
    try {
      await navigator.serviceWorker.register("/service-worker.js", { scope: "/" });
    } catch (error) {
      console.warn("Nao foi possivel registrar o modo aplicativo.", error);
    }
  });
})();
