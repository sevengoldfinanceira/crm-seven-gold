(() => {
  const storageKey = "seven-gold-consortium-start-date";
  const input = document.querySelector("#consortium-start-input");
  const preview = document.querySelector("#time-preview");
  const status = document.querySelector("#time-editor-status");

  input.value = localStorage.getItem(storageKey) || "2023-04-15";

  const calculate = () => {
    const [year, month, day] = input.value.split("-").map(Number);
    const start = new Date(year, month - 1, day);
    const today = new Date();
    let years = today.getFullYear() - start.getFullYear();
    let months = today.getMonth() - start.getMonth();
    let days = today.getDate() - start.getDate();

    if (days < 0) {
      months -= 1;
      days += new Date(today.getFullYear(), today.getMonth(), 0).getDate();
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    preview.textContent = `${years} anos, ${months} meses e ${days} dias`;
  };

  input.addEventListener("input", calculate);
  document.querySelector("#save-consortium-start").addEventListener("click", () => {
    localStorage.setItem(storageKey, input.value);
    status.textContent = "Data inicial salva com sucesso.";
  });
  calculate();
})();
