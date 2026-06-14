(() => {
  const storageKey = (year) => `seven-gold-owner-history-${year}`;
  const photoStorageKey = (year) => `seven-gold-owner-photo-${year}`;
  const photoPositionKey = (year) => `seven-gold-owner-photo-position-${year}`;
  const photoZoomKey = (year) => `seven-gold-owner-photo-zoom-${year}`;
  const galleryOrderKey = (year) => `seven-gold-owner-gallery-order-${year}`;
  const consortiumStartKey = "seven-gold-consortium-start-date";
  const timeCardOrderKey = "seven-gold-time-card-order";
  const photoBucketName = "company-documents";
  const photoSlots = ["2023-1", "2023-2", "2023-3", "2024-1", "2024-2", "2024-3", "2025-1", "2025-2", "2025-3", "2026-1", "2026-2", "2026-3"];
  let photoStorageUser = null;
  let settingsSyncTimer = null;

  const getPhotoStoragePath = (slot) => `${photoStorageUser.id}/owner-history/${slot}.jpg`;
  const getPhotoSettingsPath = () => `${photoStorageUser.id}/owner-history/settings.json`;

  const dataUrlToBlob = async (dataUrl) => {
    const response = await fetch(dataUrl);
    return response.blob();
  };

  const blobToDataUrl = (blob) =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => resolve(reader.result));
      reader.readAsDataURL(blob);
    });

  const collectPhotoSettings = () => ({
    positions: Object.fromEntries(photoSlots.map((slot) => [slot, localStorage.getItem(photoPositionKey(slot))])),
    zooms: Object.fromEntries(photoSlots.map((slot) => [slot, localStorage.getItem(photoZoomKey(slot))])),
    galleryOrders: Object.fromEntries(["2023", "2024", "2025", "2026"].map((year) => [year, localStorage.getItem(galleryOrderKey(year))])),
  });

  const syncPhotoSettings = async () => {
    const client = window.sevenGoldAuth;
    if (!client || !photoStorageUser) return;

    const file = new Blob([JSON.stringify(collectPhotoSettings())], { type: "application/json" });
    const { error } = await client.storage.from(photoBucketName).upload(getPhotoSettingsPath(), file, {
      contentType: "application/json",
      upsert: true,
    });

    if (error) {
      console.warn("Nao foi possivel sincronizar os ajustes das fotos.", error.message);
    }
  };

  const schedulePhotoSettingsSync = () => {
    window.clearTimeout(settingsSyncTimer);
    settingsSyncTimer = window.setTimeout(syncPhotoSettings, 500);
  };

  const uploadPhoto = async (slot, photo) => {
    const client = window.sevenGoldAuth;
    if (!client || !photoStorageUser || !photo) return false;

    const file = typeof photo === "string" ? await dataUrlToBlob(photo) : photo;
    const { error } = await client.storage.from(photoBucketName).upload(getPhotoStoragePath(slot), file, {
      contentType: "image/jpeg",
      upsert: true,
    });

    if (error) {
      console.warn(`Nao foi possivel sincronizar a foto ${slot}.`, error.message);
      return false;
    }

    return true;
  };

  const loadRemotePhotoSettings = async () => {
    const client = window.sevenGoldAuth;
    const { data, error } = await client.storage.from(photoBucketName).download(getPhotoSettingsPath());
    if (error || !data) return;

    let settings;
    try {
      settings = JSON.parse(await data.text());
    } catch {
      return;
    }

    Object.entries(settings.positions || {}).forEach(([slot, value]) => value && localStorage.setItem(photoPositionKey(slot), value));
    Object.entries(settings.zooms || {}).forEach(([slot, value]) => value && localStorage.setItem(photoZoomKey(slot), value));
    Object.entries(settings.galleryOrders || {}).forEach(([year, value]) => value && localStorage.setItem(galleryOrderKey(year), value));
  };

  const initializePersistentPhotos = async () => {
    const client = window.sevenGoldAuth;
    if (!client) return;

    const { data } = await client.auth.getUser();
    if (!data.user) return;
    photoStorageUser = data.user;

    await loadRemotePhotoSettings();

    await Promise.all(photoSlots.map(async (slot) => {
      const localPhoto = localStorage.getItem(photoStorageKey(slot));
      const { data: remotePhoto, error } = await client.storage.from(photoBucketName).download(getPhotoStoragePath(slot));

      if (!error && remotePhoto) {
        localStorage.setItem(photoStorageKey(slot), await blobToDataUrl(remotePhoto));
        return;
      }

      if (localPhoto) {
        await uploadPhoto(slot, localPhoto);
      }
    }));

    await syncPhotoSettings();
    document.querySelectorAll(".year-photo-box").forEach(renderPhoto);
  };
  const roleRows = {
    "2023": ["ANTES DO CONSÓRCIO", "ANTES DO CONSÓRCIO", "ANTES DO CONSÓRCIO", "J. ALFA - TELEMARKETING", "J. ALFA - TELEMARKETING", "J. ALFA - VENDEDOR", "J. ALFA - VENDEDOR", "J. ALFA - VENDEDOR", "J. ALFA - VENDEDOR", "J. ALFA - VENDEDOR", "FORA DO CONSÓRCIO", "FORA DO CONSÓRCIO", "-"],
    "2024": ["J. ALFA - VENDEDOR", "J. ALFA - APADRINHANDO", "SMK - COORDENADOR", "SMK - COORDENADOR", "SMK - COORDENADOR", "SMK - COORDENADOR", "FORA DO CONSÓRCIO", "IMOBY - VENDEDOR", "IMOBY - VENDEDOR", "IMOBY - VENDEDOR", "IMOBY - APADRINHANDO", "IMOBY - APADRINHANDO", "-"],
    "2025": ["IMOBY - COORDENADOR", "IMOBY - COORDENADOR", "IMOBY - COORDENADOR", "UEKI - COORDENADOR", "UEKI - COORDENADOR", "LC - COORDENADOR", "LC - COORDENADOR", "LC - COORDENADOR", "LC - COORDENADOR", "LC - COORDENADOR", "DG - COORDENADOR", "DG - COORDENADOR", "-"],
    "2026": ["DG - COORDENADOR", "FORA DO CONSÓRCIO", "FORA DO CONSÓRCIO", "FORA DO CONSÓRCIO", "FORA DO CONSÓRCIO", "ALPHA - REP. JÚNIOR", "-", "-", "-", "-", "-", "-", "-"],
  };
  const inactiveReasons = {
    "2023": ["ANTES DO CONSÓRCIO", "ANTES DO CONSÓRCIO", "ANTES DO CONSÓRCIO", "", "", "", "", "", "", "", "DEPRESSÃO", "DEPRESSÃO"],
    "2024": ["", "", "", "", "", "", "TUBERCULOSE", "", "", "", "", ""],
    "2025": ["", "", "", "", "", "", "", "", "", "", "", ""],
    "2026": ["", "BORDERLINE E SUPERDOTAÇÃO", "BORDERLINE E SUPERDOTAÇÃO", "BORDERLINE E SUPERDOTAÇÃO", "BORDERLINE E SUPERDOTAÇÃO", "", "", "", "", "", "", ""],
  };

  const timeGrid = document.querySelector(".career-time-grid");
  const savedTimeOrder = JSON.parse(localStorage.getItem(timeCardOrderKey) || "null");
  if (savedTimeOrder) {
    savedTimeOrder.forEach((id) => {
      const card = timeGrid.querySelector(`[data-time-card="${id}"]`);
      if (card) timeGrid.append(card);
    });
  }

  let draggedTimeCard = null;
  timeGrid.addEventListener("dragstart", (event) => {
    draggedTimeCard = event.target.closest("[data-time-card]");
    if (!draggedTimeCard) return;
    draggedTimeCard.classList.add("is-dragging-time");
    event.dataTransfer.effectAllowed = "move";
  });
  timeGrid.addEventListener("dragover", (event) => {
    if (!draggedTimeCard) return;
    event.preventDefault();
    const target = event.target.closest("[data-time-card]");
    if (!target || target === draggedTimeCard) return;
    const rect = target.getBoundingClientRect();
    const after = event.clientX > rect.left + rect.width / 2;
    timeGrid.insertBefore(draggedTimeCard, after ? target.nextSibling : target);
  });
  timeGrid.addEventListener("dragend", () => {
    if (!draggedTimeCard) return;
    draggedTimeCard.classList.remove("is-dragging-time");
    localStorage.setItem(
      timeCardOrderKey,
      JSON.stringify([...timeGrid.querySelectorAll("[data-time-card]")].map((card) => card.dataset.timeCard)),
    );
    draggedTimeCard = null;
  });
  const averageRows = {
    "2023": ["-", "R$ 929.514,29", "3,71", "R$ 250.253,85", "R$ 2.898,59"],
    "2024": ["-", "R$ 990.575,03", "4,00", "R$ 247.643,76", "R$ 4.073,78"],
    "2025": ["-", "R$ 2.010.253,01", "6,25", "R$ 321.640,48", "R$ 10.556,63"],
    "2026": ["-", "R$ 3.300.000,00", "10,00", "R$ 330.000,00", "R$ 12.300,00"],
  };

  ["2023", "2024", "2025", "2026"].forEach((year) => {
    if (!localStorage.getItem(photoStorageKey(`${year}-1`)) && localStorage.getItem(photoStorageKey(year))) {
      localStorage.setItem(photoStorageKey(`${year}-1`), localStorage.getItem(photoStorageKey(year)));
      localStorage.setItem(photoPositionKey(`${year}-1`), localStorage.getItem(photoPositionKey(year)) || JSON.stringify({ x: 50, y: 50 }));
      localStorage.setItem(photoZoomKey(`${year}-1`), localStorage.getItem(photoZoomKey(year)) || "1.22");
    }
  });

  document.querySelectorAll(".year-photo-gallery").forEach((gallery) => {
    const boxes = [...gallery.querySelectorAll(".year-photo-box")];
    const year = boxes[0]?.dataset.yearPhoto.split("-")[0];
    const savedOrder = JSON.parse(localStorage.getItem(galleryOrderKey(year)) || "null");

    if (savedOrder) {
      savedOrder.forEach((id) => {
        const box = boxes.find((item) => item.dataset.yearPhoto === id);
        if (box) gallery.append(box);
      });
    }

    gallery.querySelectorAll(".year-photo-box").forEach((box) => {
      const handle = document.createElement("button");
      handle.type = "button";
      handle.className = "year-photo-drag";
      handle.draggable = true;
      handle.title = "Arrastar foto";
      handle.setAttribute("aria-label", "Arrastar foto para outra posição deste ano");
      handle.textContent = "⠿";
      box.append(handle);
    });

    let draggedBox = null;
    gallery.addEventListener("dragstart", (event) => {
      const handle = event.target.closest(".year-photo-drag");
      if (!handle) {
        event.preventDefault();
        return;
      }
      draggedBox = handle.closest(".year-photo-box");
      draggedBox.classList.add("is-reordering");
      event.dataTransfer.effectAllowed = "move";
    });

    gallery.addEventListener("dragover", (event) => {
      if (!draggedBox) return;
      event.preventDefault();
      const target = event.target.closest(".year-photo-box");
      if (!target || target === draggedBox || target.parentElement !== gallery) return;
      const targetRect = target.getBoundingClientRect();
      gallery.insertBefore(draggedBox, event.clientX < targetRect.left + targetRect.width / 2 ? target : target.nextSibling);
    });

    gallery.addEventListener("dragend", () => {
      if (!draggedBox) return;
      draggedBox.classList.remove("is-reordering");
      const order = [...gallery.querySelectorAll(".year-photo-box")].map((box) => box.dataset.yearPhoto);
      localStorage.setItem(galleryOrderKey(year), JSON.stringify(order));
      schedulePhotoSettingsSync();
      draggedBox = null;
    });
  });

  const photoEditButton = document.querySelector("#toggle-photo-edit");
  photoEditButton.addEventListener("click", () => {
    const isEditing = document.body.classList.toggle("photo-edit-mode");
    photoEditButton.textContent = isEditing ? "Concluir" : "Editar fotos";
    photoEditButton.classList.toggle("is-active", isEditing);
  });

  const ensureRoleRows = () => {
    document.querySelectorAll(".year-detail").forEach((details) => {
      const year = details.querySelector("summary strong")?.textContent.trim();
      const body = details.querySelector(".owner-sheet-table tbody");
      if (!year || !body || body.querySelector(".career-role-row")) return;

      const row = document.createElement("tr");
      row.className = "career-role-row";
      const label = document.createElement("th");
      label.textContent = "Cargo / modalidade";
      row.append(label);
      roleRows[year].forEach((value, index) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        if (index === 12) cell.classList.add("total-cell");
        row.append(cell);
      });
      body.prepend(row);
    });
  };

  const addAverageColumns = () => {
    document.querySelectorAll(".year-detail").forEach((details) => {
      const year = details.querySelector("summary strong")?.textContent.trim();
      const table = details.querySelector(".owner-sheet-table");
      if (!year || !table || table.dataset.averageAdded === "true") return;

      const headerRow = table.querySelector("thead tr");
      const averageHeader = document.createElement("th");
      averageHeader.textContent = "Média";
      averageHeader.className = "average-head-cell";
      headerRow.append(averageHeader);

      const rows = [...table.querySelectorAll("tbody tr")];
      rows.forEach((row, rowIndex) => {
        const cell = document.createElement("td");
        cell.textContent = averageRows[year]?.[rowIndex] || "-";
        cell.className = "average-cell";
        row.append(cell);
      });

      table.dataset.averageAdded = "true";
    });
  };

  const applySavedYear = (details) => {
    const year = details.querySelector("summary strong")?.textContent.trim();
    const table = details.querySelector(".owner-sheet-table");
    if (!year || !table) return;

    const saved = JSON.parse(localStorage.getItem(storageKey(year)) || "null");
    if (!saved?.rows) return;

    const outdatedRoleRows = {
      "2023": ["Fora do consórcio", "Fora do consórcio", "Fora do consórcio"],
      "2024": ["Pausa"],
      "2026": ["Fora do consórcio", "Doente"],
    };
    const shouldRefreshRoleRow =
      saved.rows.length === 5 &&
      (outdatedRoleRows[year]?.some((value) => saved.rows[0].includes(value)) ||
        saved.rows[0].some((value) => /VEND\.|COORD\.|APADR\./i.test(value)) ||
        (year === "2023" && saved.rows[0][3] !== "J. ALFA - TELEMARKETING") ||
        (year === "2023" && saved.rows[0][4] !== "J. ALFA - TELEMARKETING") ||
        (year === "2024" && saved.rows[0][2] !== "SMK - COORDENADOR") ||
        (year === "2024" && saved.rows[0][1] !== "J. ALFA - APADRINHANDO") ||
        saved.rows[0].some((value) => /Vendedor|Coordenador|Representante|Apadrinhando|Antes do consórcio/i.test(value)));
    if (shouldRefreshRoleRow) {
      saved.rows[0] = roleRows[year];
      localStorage.setItem(storageKey(year), JSON.stringify(saved));
    }

    const rows = saved.rows.length === 4 ? [roleRows[year], ...saved.rows] : saved.rows;
    table.querySelectorAll("tbody tr").forEach((row, rowIndex) => {
      row.querySelectorAll("td").forEach((cell, cellIndex) => {
        const value = rows[rowIndex]?.[cellIndex];
        if (typeof value === "string") cell.textContent = value;
      });
    });
  };

  const formatDuration = (months) => {
    if (months <= 0) return "Ainda não registrado";
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    const parts = [];
    if (years) parts.push(`${years} ${years === 1 ? "ano" : "anos"}`);
    if (remainingMonths) parts.push(`${remainingMonths} ${remainingMonths === 1 ? "mês" : "meses"}`);
    return parts.join(" e ");
  };

  const calculateConsortiumTime = () => {
    const savedStart = localStorage.getItem(consortiumStartKey) || "2023-04-15";
    const [startYear, startMonth, startDay] = savedStart.split("-").map(Number);
    const start = new Date(startYear, startMonth - 1, startDay);
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

    const parts = [];
    if (years) parts.push(`${years} ${years === 1 ? "ano" : "anos"}`);
    if (months) parts.push(`${months} ${months === 1 ? "mês" : "meses"}`);
    if (days || !parts.length) parts.push(`${days} ${days === 1 ? "dia" : "dias"}`);
    document.querySelector("#consortium-time").textContent = parts.join(", ");
    document.querySelector("#consortium-start-label").textContent =
      `Desde ${String(startDay).padStart(2, "0")}/${String(startMonth).padStart(2, "0")}/${startYear}`;
  };

  const calculateRoleTimes = () => {
    const counts = { fora: 0, vendedor: 0, coordenador: 0, representante: 0, apadrinhando: 0, telemarketing: 0 };
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    Object.entries(roleRows).forEach(([yearText, defaultRoles]) => {
      const year = Number(yearText);
      const saved = JSON.parse(localStorage.getItem(storageKey(yearText)) || "null");
      const savedRoles = saved?.rows?.length === 5 ? saved.rows[0] : null;
      const monthlyRoles = (savedRoles || defaultRoles).slice(0, 12);

      monthlyRoles.forEach((roleValue, month) => {
        const isClosedMonth = year < currentYear || (year === currentYear && month < currentMonth);
        if (!isClosedMonth) return;

        const role = String(roleValue || "").toLocaleLowerCase("pt-BR");
        if (role.includes("fora cons.") || role.includes("fora do consórcio") || role.includes("fora do consorcio")) counts.fora += 1;
        if (role.includes("vendedor") || role.includes("vend.")) counts.vendedor += 1;
        if (role.includes("coordenador") || role.includes("coord.")) counts.coordenador += 1;
        if (role.includes("representante") || role.includes("rep.")) counts.representante += 1;
        if (role.includes("apadrinhando") || role.includes("apadr.")) counts.apadrinhando += 1;
        if (role.includes("telemarketing")) counts.telemarketing += 1;
      });
    });

    const targets = {
      fora: ["#outside-time", "#outside-months"],
      vendedor: ["#seller-time", "#seller-months"],
      coordenador: ["#coordinator-time", "#coordinator-months"],
      representante: ["#representative-time", "#representative-months"],
      apadrinhando: ["#sponsor-time", "#sponsor-months"],
      telemarketing: ["#telemarketing-time", "#telemarketing-months"],
    };
    Object.entries(targets).forEach(([role, selectors]) => {
      document.querySelector(selectors[0]).textContent = formatDuration(counts[role]);
      document.querySelector(selectors[1]).textContent = `${counts[role]} ${counts[role] === 1 ? "mês registrado" : "meses registrados"}`;
    });
  };

  const mergeInactiveMonths = () => {
    document.querySelectorAll(".year-detail .owner-sheet-table").forEach((table) => {
      if (table.dataset.inactiveMerged === "true") return;

      const year = table.closest(".year-detail")?.querySelector("summary strong")?.textContent.trim();
      const rows = [...table.querySelectorAll("tbody tr")];
      const roleRow = rows.find((row) => row.classList.contains("career-role-row"));
      const dataRows = rows.filter((row) => !row.classList.contains("career-role-row"));
      if (!year || !roleRow || dataRows.length < 4) return;

      const roleCells = [...roleRow.querySelectorAll("td")].slice(0, 12);
      const roles = roleCells.map((cell) => cell.textContent.trim());
      const groups = [];
      let groupStart = 0;

      roles.forEach((role, index) => {
        const nextRole = roles[index + 1];
        if (role !== nextRole) {
          groups.push({ start: groupStart, end: index, role });
          groupStart = index + 1;
        }
      });

      groups
        .slice()
        .reverse()
        .forEach(({ start, end, role }) => {
          const normalizedRole = role.toLocaleLowerCase("pt-BR");
          const isInactive =
            normalizedRole.includes("fora cons.") ||
            normalizedRole.includes("antes cons.") ||
            normalizedRole.includes("fora do consórcio") ||
            normalizedRole.includes("fora do consorcio") ||
            normalizedRole.includes("antes do consórcio") ||
            normalizedRole.includes("antes do consorcio");
          const span = end - start + 1;

          if (span > 1) {
            const firstRoleCell = roleCells[start];
            firstRoleCell.colSpan = span;
            roleCells.slice(start + 1, end + 1).forEach((cell) => cell.remove());
          }

          if (!isInactive) return;

          const label = inactiveReasons[year]?.[start] || "FORA DO CONSÓRCIO";
          const firstCell = dataRows[0].querySelectorAll("td")[start];
          if (!firstCell) return;

          firstCell.textContent = label;
          firstCell.rowSpan = 4;
          firstCell.colSpan = span;
          firstCell.classList.add("inactive-month-cell");
          dataRows[0].querySelectorAll("td").forEach((cell, cellIndex) => {
            if (cellIndex > start && cellIndex <= end) cell.remove();
          });
          dataRows.slice(1, 4).forEach((row) => {
            row.querySelectorAll("td").forEach((cell, cellIndex) => {
              if (cellIndex >= start && cellIndex <= end) cell.remove();
            });
          });
        });

      table.dataset.inactiveMerged = "true";
    });
  };
  /*
        const normalizedRole = role.toLocaleLowerCase("pt-BR");
        const isInactive =
          normalizedRole.includes("fora do consórcio") ||
          normalizedRole.includes("fora do consorcio") ||
          normalizedRole.includes("antes do consórcio") ||
          normalizedRole.includes("antes do consorcio");
        if (!isInactive) return;

        const label = role.includes(" - ") ? role.split(" - ").slice(1).join(" - ") : role;
        const firstCell = dataRows[0].querySelectorAll("td")[monthIndex];
        if (!firstCell) return;

        firstCell.textContent = label;
        firstCell.rowSpan = 4;
        firstCell.classList.add("inactive-month-cell");
        dataRows.slice(1, 4).forEach((row) => row.querySelectorAll("td")[monthIndex]?.remove());
        });

      table.dataset.inactiveMerged = "true";
    });
  };

  */

  const refreshHistory = () => {
    document.querySelectorAll(".year-detail").forEach(applySavedYear);
    calculateRoleTimes();
    addAverageColumns();
    mergeInactiveMonths();
  };

  window.addEventListener("focus", () => {
    calculateConsortiumTime();
    calculateRoleTimes();
  });

  document.querySelectorAll(".edit-year-link").forEach((link) => {
    link.addEventListener("click", (event) => event.stopPropagation());
  });

  const photoInput = document.querySelector("#year-photo-input");
  let selectedPhotoYear = null;

  const renderPhoto = (button) => {
    const year = button.dataset.yearPhoto;
    const image = button.querySelector("img");
    const label = button.querySelector("span");
    const savedPhoto = localStorage.getItem(photoStorageKey(year));
    const savedPosition = JSON.parse(localStorage.getItem(photoPositionKey(year)) || "null");
    const savedZoom = Number(localStorage.getItem(photoZoomKey(year))) || 1.22;

    if (savedPhoto) {
      image.src = savedPhoto;
      image.style.transformOrigin = `${savedPosition?.x ?? 50}% ${savedPosition?.y ?? 50}%`;
      image.style.setProperty("--photo-zoom", savedZoom);
      image.hidden = false;
      label.textContent = "Arraste para ajustar";
      button.classList.add("has-photo");
      return;
    }

    image.removeAttribute("src");
    image.hidden = true;
    label.textContent = "Adicionar foto";
    button.classList.remove("has-photo");
  };

  document.querySelectorAll(".year-photo-box").forEach((button) => {
    renderPhoto(button);
    let dragStart = null;
    button.querySelector("img").addEventListener("dragstart", (event) => event.preventDefault());

    button.addEventListener("pointerdown", (event) => {
      if (!document.body.classList.contains("photo-edit-mode") || !button.classList.contains("has-photo") || event.target.closest(".year-photo-change, .year-photo-zoom, .year-photo-drag")) return;
      event.preventDefault();
      const year = button.dataset.yearPhoto;
      const position = JSON.parse(localStorage.getItem(photoPositionKey(year)) || "null") || { x: 50, y: 50 };
      dragStart = { pointerX: event.clientX, pointerY: event.clientY, x: position.x, y: position.y };
      button.setPointerCapture(event.pointerId);
      button.classList.add("is-dragging");
    });

    button.addEventListener("pointermove", (event) => {
      if (!dragStart || !button.hasPointerCapture(event.pointerId)) return;
      event.preventDefault();
      const rect = button.getBoundingClientRect();
      const deltaX = ((event.clientX - dragStart.pointerX) / rect.width) * 100;
      const deltaY = ((event.clientY - dragStart.pointerY) / rect.height) * 100;
      const position = {
        x: Math.max(0, Math.min(100, dragStart.x - deltaX)),
        y: Math.max(0, Math.min(100, dragStart.y - deltaY)),
      };
      button.querySelector("img").style.transformOrigin = `${position.x}% ${position.y}%`;
      button.dataset.pendingPosition = JSON.stringify(position);
    });

    const finishDrag = (event) => {
      if (!dragStart) return;
      if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);
      if (button.dataset.pendingPosition) {
        localStorage.setItem(photoPositionKey(button.dataset.yearPhoto), button.dataset.pendingPosition);
        schedulePhotoSettingsSync();
      }
      dragStart = null;
      button.classList.remove("is-dragging");
    };

    button.addEventListener("pointerup", finishDrag);
    button.addEventListener("pointercancel", finishDrag);

    button.querySelector(".year-photo-change").addEventListener("click", () => {
      selectedPhotoYear = button.dataset.yearPhoto;
      photoInput.value = "";
      photoInput.click();
    });

    button.querySelectorAll("[data-photo-zoom]").forEach((zoomButton) => {
      zoomButton.addEventListener("click", () => {
        if (!button.classList.contains("has-photo")) return;
        const year = button.dataset.yearPhoto;
        const currentZoom = Number(localStorage.getItem(photoZoomKey(year))) || 1.22;
        const nextZoom = Math.max(1, Math.min(2, currentZoom + Number(zoomButton.dataset.photoZoom)));
        localStorage.setItem(photoZoomKey(year), nextZoom.toFixed(2));
        schedulePhotoSettingsSync();
        button.querySelector("img").style.setProperty("--photo-zoom", nextZoom);
      });
    });
  });

  photoInput.addEventListener("change", () => {
    const file = photoInput.files?.[0];
    if (!file || !selectedPhotoYear) return;

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const preview = new Image();
      preview.addEventListener("load", () => {
        const maxWidth = 1000;
        const maxHeight = 650;
        const scale = Math.min(maxWidth / preview.width, maxHeight / preview.height, 1);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(preview.width * scale);
        canvas.height = Math.round(preview.height * scale);
        canvas.getContext("2d").drawImage(preview, 0, 0, canvas.width, canvas.height);

        localStorage.setItem(photoStorageKey(selectedPhotoYear), canvas.toDataURL("image/jpeg", 0.84));
        localStorage.setItem(photoPositionKey(selectedPhotoYear), JSON.stringify({ x: 50, y: 50 }));
        localStorage.setItem(photoZoomKey(selectedPhotoYear), "1.22");
        canvas.toBlob((blob) => uploadPhoto(selectedPhotoYear, blob), "image/jpeg", 0.84);
        schedulePhotoSettingsSync();
        const button = document.querySelector(`[data-year-photo="${selectedPhotoYear}"]`);
        if (button) renderPhoto(button);
      });
      preview.src = reader.result;
    });
    reader.readAsDataURL(file);
  });

  ensureRoleRows();
  addAverageColumns();
  calculateConsortiumTime();
  refreshHistory();
  initializePersistentPhotos();
  window.addEventListener("focus", refreshHistory);
  window.addEventListener("storage", refreshHistory);
})();
