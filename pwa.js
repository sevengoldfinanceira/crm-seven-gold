(() => {
  if (!("serviceWorker" in navigator)) return;

  let refreshing = false;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  const showUpdateBanner = (reg) => {
    if (document.getElementById("pwa-update-banner")) return;

    const banner = document.createElement("div");
    banner.id = "pwa-update-banner";
    banner.style.position = "fixed";
    banner.style.bottom = "20px";
    banner.style.left = "50%";
    banner.style.transform = "translateX(-50%)";
    banner.style.background = "#1e1b29";
    banner.style.color = "#ffffff";
    banner.style.padding = "12px 20px";
    banner.style.borderRadius = "12px";
    banner.style.boxShadow = "0 10px 25px rgba(0,0,0,0.5)";
    banner.style.display = "flex";
    banner.style.alignItems = "center";
    banner.style.gap = "15px";
    banner.style.zIndex = "99999";
    banner.style.border = "1px solid rgba(255, 255, 255, 0.1)";
    banner.style.fontFamily = "Inter, sans-serif";
    banner.style.fontSize = "14px";
    banner.style.fontWeight = "600";

    const text = document.createElement("span");
    text.textContent = "Uma nova atualização do CRM está disponível!";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Atualizar agora";
    btn.style.background = "#d4a017";
    btn.style.color = "#150126";
    btn.style.border = "none";
    btn.style.padding = "6px 12px";
    btn.style.borderRadius = "8px";
    btn.style.cursor = "pointer";
    btn.style.fontWeight = "800";
    btn.style.fontSize = "12px";
    btn.style.transition = "background 0.2s";
    
    btn.addEventListener("mouseover", () => {
      btn.style.background = "#f4b017";
    });
    btn.addEventListener("mouseout", () => {
      btn.style.background = "#d4a017";
    });

    btn.addEventListener("click", () => {
      if (reg.waiting) {
        reg.waiting.postMessage({ type: "SKIP_WAITING" });
      }
      banner.remove();
    });

    banner.append(text, btn);
    document.body.appendChild(banner);
  };

  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("/service-worker.js", { scope: "/" });
      
      if (reg.waiting) {
        showUpdateBanner(reg);
      }

      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            showUpdateBanner(reg);
          }
        });
      });

    } catch (error) {
      console.warn("Falha ao registrar service worker.", error);
    }
  });
})();
