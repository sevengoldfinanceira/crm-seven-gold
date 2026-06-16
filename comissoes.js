(function () {
  const buttons = document.querySelectorAll("[data-show-commission]");

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const target = document.getElementById(button.dataset.showCommission);
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
})();
