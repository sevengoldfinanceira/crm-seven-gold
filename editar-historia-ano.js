(() => {
  const years = {
    "2023": [
      ["ANTES DO CONSÓRCIO", "ANTES DO CONSÓRCIO", "ANTES DO CONSÓRCIO", "J. ALFA - TELEMARKETING", "J. ALFA - TELEMARKETING", "J. ALFA - VENDEDOR", "J. ALFA - VENDEDOR", "J. ALFA - VENDEDOR", "J. ALFA - VENDEDOR", "J. ALFA - VENDEDOR", "FORA DO CONSÓRCIO", "FORA DO CONSÓRCIO", "-"],
      ["Fora do consorcio", "Fora do consorcio", "Fora do consorcio", "R$ 261.000,00", "R$ 980.000,00", "R$ 533.600,00", "R$ 840.000,00", "R$ 1.497.000,00", "R$ 815.000,00", "R$ 1.580.000,00", "Depressao", "Depressao", "R$ 6.506.600,00"],
      ["-", "-", "-", "1", "4", "2", "4", "7", "3", "5", "-", "-", "26"],
      ["-", "-", "-", "R$ 261.000,00", "R$ 245.000,00", "R$ 266.800,00", "R$ 210.000,00", "R$ 213.857,14", "R$ 271.666,67", "R$ 316.000,00", "-", "-", "R$ 250.253,85"],
      ["-", "-", "-", "R$ 522,00", "R$ 1.960,00", "R$ 1.467,20", "R$ 5.040,80", "R$ 5.316,50", "R$ 2.740,00", "R$ 3.243,60", "-", "-", "R$ 20.290,10"],
    ],
    "2024": [
      ["J. ALFA - VENDEDOR", "J. ALFA - APADRINHANDO", "SMK - COORDENADOR", "SMK - COORDENADOR", "SMK - COORDENADOR", "SMK - COORDENADOR", "FORA DO CONSÓRCIO", "IMOBY - VENDEDOR", "IMOBY - VENDEDOR", "IMOBY - VENDEDOR", "IMOBY - APADRINHANDO", "IMOBY - APADRINHANDO", "-"],
      ["R$ 880.000,00", "R$ 1.420.000,00", "R$ 350.000,00", "R$ 2.070.000,00", "R$ 1.700.000,00", "R$ 240.000,00", "Tuberculose", "R$ 1.130.000,00", "R$ 721.555,33", "R$ 1.132.885,00", "R$ 582.885,00", "R$ 669.000,00", "R$ 10.896.325,33"],
      ["4", "5", "1", "8", "6", "2", "-", "5", "3", "5", "3", "2", "44"],
      ["R$ 220.000,00", "R$ 284.000,00", "R$ 350.000,00", "R$ 258.750,00", "R$ 283.333,33", "R$ 120.000,00", "-", "R$ 226.000,00", "R$ 240.518,44", "R$ 226.577,00", "R$ 194.295,00", "R$ 334.500,00", "R$ 247.643,76"],
      ["R$ 2.570,00", "R$ 4.130,00", "R$ 700,00", "R$ 7.760,00", "R$ 4.900,00", "R$ 1.875,00", "-", "R$ 8.500,00", "R$ 3.247,00", "R$ 5.987,31", "R$ 3.338,75", "R$ 1.803,50", "R$ 44.811,56"],
    ],
    "2025": [
      ["IMOBY - COORDENADOR", "IMOBY - COORDENADOR", "IMOBY - COORDENADOR", "UEKI - COORDENADOR", "UEKI - COORDENADOR", "LC - COORDENADOR", "LC - COORDENADOR", "LC - COORDENADOR", "LC - COORDENADOR", "LC - COORDENADOR", "DG - COORDENADOR", "DG - COORDENADOR", "-"],
      ["R$ 1.900.000,00", "R$ 2.490.000,00", "R$ 2.325.000,00", "R$ 3.350.000,00", "R$ 4.970.000,00", "R$ 464.000,00", "R$ 2.526.726,74", "R$ 1.012.366,35", "R$ 724.943,00", "R$ 1.004.000,00", "R$ 1.230.000,00", "R$ 2.126.000,00", "R$ 24.123.036,09"],
      ["8", "10", "6", "8", "13", "2", "7", "3", "3", "4", "4", "7", "75"],
      ["R$ 237.500,00", "R$ 249.000,00", "R$ 387.500,00", "R$ 418.750,00", "R$ 382.307,69", "R$ 232.000,00", "R$ 360.960,96", "R$ 337.455,45", "R$ 241.647,67", "R$ 251.000,00", "R$ 307.500,00", "R$ 303.714,29", "R$ 321.640,48"],
      ["R$ 11.341,30", "R$ 15.390,00", "R$ 14.441,40", "R$ 6.325,00", "R$ 10.530,00", "R$ 1.188,00", "R$ 11.145,23", "R$ 3.991,19", "R$ 3.612,07", "R$ 3.458,50", "R$ 4.920,00", "R$ 8.667,00", "R$ 95.009,69"],
    ],
    "2026": [
      ["DG - COORDENADOR", "FORA DO CONSÓRCIO", "FORA DO CONSÓRCIO", "FORA DO CONSÓRCIO", "FORA DO CONSÓRCIO", "ALPHA - REP. JÚNIOR", "-", "-", "-", "-", "-", "-", "-"],
      ["R$ 3.300.000,00", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "R$ 3.300.000,00"],
      ["10", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "10"],
      ["R$ 330.000,00", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "R$ 330.000,00"],
      ["R$ 12.300,00", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "R$ 12.300,00"],
    ],
  };

  const rowLabels = ["Cargo / modalidade", "Credito vendido", "Cotas", "Media", "Comissao"];
  const averageRows = {
    "2023": ["-", "R$ 929.514,29", "3,71", "R$ 250.253,85", "R$ 2.898,59"],
    "2024": ["-", "R$ 990.575,03", "4,00", "R$ 247.643,76", "R$ 4.073,78"],
    "2025": ["-", "R$ 2.010.253,01", "6,25", "R$ 321.640,48", "R$ 10.556,63"],
    "2026": ["-", "R$ 3.300.000,00", "10,00", "R$ 330.000,00", "R$ 12.300,00"],
  };
  const roleOptions = [
    { value: "TELEMARKETING", label: "Telemarketing" },
    { value: "VENDEDOR", label: "Vendedor" },
    { value: "APADRINHANDO", label: "Apadrinhando" },
    { value: "COORDENADOR", label: "Coordenador" },
    { value: "REP. JÚNIOR", label: "Representante Júnior" },
    { value: "REP. PLENO", label: "Representante Pleno" },
    { value: "FORA DO CONSÓRCIO", label: "Fora do consórcio" },
    { value: "ANTES DO CONSÓRCIO", label: "Antes do consórcio" },
    { value: "-", label: "Sem informação" },
  ];
  const params = new URLSearchParams(window.location.search);
  const year = params.get("ano");
  const storageKey = `seven-gold-owner-history-${year}`;
  const tableBody = document.querySelector("#editor-table-body");
  const status = document.querySelector("#save-status");

  if (!years[year]) {
    document.querySelector("#editor-title").textContent = "Ano nao encontrado";
    document.querySelector(".year-editor-panel").hidden = true;
    return;
  }

  document.title = `Seven Gold | Editar ${year}`;
  document.querySelector("#editor-title").textContent = `Editar ${year}`;

  const getRows = () => {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
    const outdatedRoleRows = {
      "2023": ["Fora do consórcio", "Pausa"],
      "2024": ["Pausa"],
      "2026": ["Fora do consórcio", "Doente"],
    };
    if (
      saved?.rows?.length === 5 &&
      (outdatedRoleRows[year]?.some((value) => saved.rows[0].includes(value)) ||
        saved.rows[0].some((value) => /VEND\.|COORD\.|APADR\./i.test(value)) ||
        (year === "2023" && saved.rows[0][3] !== "J. ALFA - TELEMARKETING") ||
        (year === "2023" && saved.rows[0][4] !== "J. ALFA - TELEMARKETING") ||
        (year === "2024" && saved.rows[0][2] !== "SMK - COORDENADOR") ||
        (year === "2024" && saved.rows[0][1] !== "J. ALFA - APADRINHANDO") ||
        saved.rows[0].some((value) => /Vendedor|Coordenador|Representante|Apadrinhando|Antes do consórcio/i.test(value)))
    ) {
      saved.rows[0] = years[year][0];
      localStorage.setItem(storageKey, JSON.stringify(saved));
    }
    const rows = saved?.rows?.length === 4 ? [years[year][0], ...saved.rows] : saved?.rows || years[year];
    return rows.map((row, rowIndex) => (row.length === 13 ? [...row, averageRows[year][rowIndex] || "-"] : row));
  };

  const render = () => {
    tableBody.innerHTML = "";
    getRows().forEach((values, rowIndex) => {
      const row = document.createElement("tr");
      const label = document.createElement("th");
      label.textContent = rowLabels[rowIndex];
      row.append(label);

      values.forEach((value, cellIndex) => {
        const cell = document.createElement("td");
        if (cellIndex === values.length - 2) cell.classList.add("total-cell");
        if (cellIndex === values.length - 1) cell.classList.add("average-cell");

        if (rowIndex === 0 && cellIndex < 12) {
          cell.classList.add("role-editor-cell");
          const normalizedValue = String(value || "-").trim();
          const matchingRole = roleOptions.find((option) => normalizedValue.endsWith(option.value));
          const company = matchingRole && !["FORA DO CONSÓRCIO", "ANTES DO CONSÓRCIO", "-"].includes(matchingRole.value)
            ? normalizedValue.slice(0, -matchingRole.value.length).replace(/\s*-\s*$/, "").trim()
            : "";

          const companyInput = document.createElement("input");
          companyInput.type = "text";
          companyInput.className = "role-company-input";
          companyInput.placeholder = "Empresa";
          companyInput.value = company;
          companyInput.setAttribute("aria-label", `Empresa ${cellIndex + 1}`);

          const roleSelect = document.createElement("select");
          roleSelect.className = "role-select";
          roleSelect.setAttribute("aria-label", `Cargo ${cellIndex + 1}`);
          roleOptions.forEach((option) => {
            const item = document.createElement("option");
            item.value = option.value;
            item.textContent = option.label;
            item.selected = matchingRole?.value === option.value;
            roleSelect.append(item);
          });

          [companyInput, roleSelect].forEach((control) => {
            control.addEventListener("input", () => {
              status.textContent = "Existem alteracoes que ainda nao foram salvas.";
              status.classList.add("pending");
            });
          });
          const roleLabel = document.createElement("small");
          roleLabel.textContent = "Cargo";
          const companyLabel = document.createElement("small");
          companyLabel.textContent = "Empresa";
          cell.append(roleLabel, roleSelect, companyLabel, companyInput);
          row.append(cell);
          return;
        }

        const input = document.createElement("input");
        input.type = "text";
        input.value = value;
        input.setAttribute("aria-label", `${rowLabels[rowIndex]} ${cellIndex + 1}`);
        input.addEventListener("input", () => {
          status.textContent = "Existem alteracoes que ainda nao foram salvas.";
          status.classList.add("pending");
        });
        cell.append(input);
        row.append(cell);
      });
      tableBody.append(row);
    });
  };

  const save = () => {
    const rows = [...tableBody.querySelectorAll("tr")].map((row, rowIndex) => {
      if (rowIndex === 0) {
        return [...row.querySelectorAll("td")].map((cell, cellIndex) => {
          if (cellIndex >= 12) return cell.querySelector("input")?.value.trim() || "-";
          const company = cell.querySelector(".role-company-input")?.value.trim().toUpperCase() || "";
          const role = cell.querySelector(".role-select")?.value || "-";
          return company && !["FORA DO CONSÓRCIO", "ANTES DO CONSÓRCIO", "-"].includes(role) ? `${company} - ${role}` : role;
        });
      }
      return [...row.querySelectorAll("input")].map((input) => input.value.trim() || "-");
    });
    localStorage.setItem(storageKey, JSON.stringify({ year, rows, updatedAt: new Date().toISOString() }));
    status.textContent = `Alteracoes de ${year} salvas com sucesso.`;
    status.classList.remove("pending");
    status.classList.add("saved");
  };

  const reset = () => {
    if (!window.confirm(`Restaurar todos os dados originais de ${year}?`)) return;
    localStorage.removeItem(storageKey);
    render();
    status.textContent = `Dados originais de ${year} restaurados.`;
    status.classList.remove("pending");
  };

  document.querySelector("#save-year").addEventListener("click", save);
  document.querySelector("#save-year-bottom").addEventListener("click", save);
  document.querySelector("#reset-year").addEventListener("click", reset);
  render();
})();
