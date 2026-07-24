(function installActivationTableGuard() {
  if (window.__sevenGoldActivationTableGuardInstalled) return;
  window.__sevenGoldActivationTableGuardInstalled = true;

  var pendingButton = null;
  var originalContent = "";
  var errorObserver = null;

  function isActivationButton(button) {
    return Boolean(
      button &&
        /confirmar\s+e\s+ativar\s+tabela/i.test(button.textContent || "")
    );
  }

  function unlockActivationButton() {
    if (!pendingButton || !pendingButton.isConnected) {
      pendingButton = null;
      return;
    }

    pendingButton.disabled = false;
    pendingButton.removeAttribute("aria-busy");
    pendingButton.removeAttribute("data-activation-pending");
    pendingButton.innerHTML = originalContent;
    pendingButton = null;

    if (errorObserver) {
      errorObserver.disconnect();
      errorObserver = null;
    }
  }

  function watchForActivationError() {
    if (errorObserver || !document.body) return;

    errorObserver = new MutationObserver(function () {
      var pageText = document.body.innerText || "";
      if (
        /erro[^.\n]*(ativar|ativa[cç][aã]o|tabela)|n[aã]o foi poss[ií]vel[^.\n]*(ativar|tabela)/i.test(
          pageText
        )
      ) {
        unlockActivationButton();
      }
    });

    errorObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  document.addEventListener(
    "click",
    function (event) {
      var button = event.target.closest("button");
      if (!isActivationButton(button)) return;

      if (button.getAttribute("data-activation-pending") === "true") {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }

      pendingButton = button;
      originalContent = button.innerHTML;
      button.setAttribute("data-activation-pending", "true");

      // Let the original click handler start, then lock the control before a
      // second user interaction can dispatch another activation request.
      queueMicrotask(function () {
        if (!pendingButton || !pendingButton.isConnected) return;
        pendingButton.disabled = true;
        pendingButton.setAttribute("aria-busy", "true");
        pendingButton.textContent = "Ativando tabela...";
        watchForActivationError();
      });
    },
    true
  );

  var nativeAlert = window.alert.bind(window);
  window.alert = function (message) {
    if (
      pendingButton &&
      /erro|falha|n[aã]o foi poss[ií]vel|inv[aá]lid/i.test(String(message || ""))
    ) {
      unlockActivationButton();
    }
    return nativeAlert(message);
  };

  window.addEventListener("unhandledrejection", unlockActivationButton);
  window.addEventListener("error", unlockActivationButton);
})();
