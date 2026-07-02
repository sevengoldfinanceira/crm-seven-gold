(function () {
  "use strict";

  if (window.SevenGoldSearchableSelect) return;

  const instances = new WeakMap();
  let openInstance = null;
  let optionSequence = 0;

  const normalizeText = (value) => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  const searchPlaceholderFor = (select) => {
    const key = `${select.name || ""} ${select.id || ""}`.toLowerCase();
    if (key.includes("cargo") || key.includes("role")) return "Buscar cargo...";
    if (key.includes("respons") || key.includes("assigned")) return "Buscar responsável...";
    if (key.includes("vendedor") || key.includes("seller")) return "Buscar vendedor...";
    if (key.includes("status")) return "Buscar status...";
    if (key.includes("etapa") || key.includes("stage")) return "Buscar etapa...";
    if (key.includes("setor") || key.includes("sector")) return "Buscar setor...";
    return "Buscar opção...";
  };

  const checkSvg = () => '<svg class="sg-search-select__check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';
  const chevronSvg = '<svg class="sg-search-select__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>';
  const searchSvg = '<svg class="sg-search-select__search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="20" y1="20" x2="16.2" y2="16.2"/></svg>';

  class SearchableSelect {
    constructor(select) {
      this.select = select;
      this.multiple = select.multiple;
      this.optionButtons = [];
      this.activeIndex = -1;
      this.destroyed = false;

      this.root = document.createElement("div");
      this.root.className = "sg-search-select";
      this.root.dataset.forSelect = select.id || select.name || "select";

      this.trigger = document.createElement("button");
      this.trigger.type = "button";
      this.trigger.className = "sg-search-select__trigger";
      this.trigger.setAttribute("role", "combobox");
      this.trigger.setAttribute("aria-haspopup", "listbox");
      this.trigger.setAttribute("aria-expanded", "false");
      const labelText = select.getAttribute("aria-label")
        || select.labels?.[0]?.querySelector("span, .label, .sg-label")?.textContent?.trim()
        || select.name
        || select.id
        || "Campo de seleção";
      this.trigger.setAttribute("aria-label", labelText);

      this.valueElement = document.createElement("span");
      this.valueElement.className = "sg-search-select__value";
      this.trigger.append(this.valueElement);
      this.trigger.insertAdjacentHTML("beforeend", chevronSvg);

      this.dropdown = document.createElement("div");
      this.dropdown.className = "sg-search-select__dropdown";
      this.supportsPopover = typeof this.dropdown.showPopover === "function";
      if (this.supportsPopover) this.dropdown.setAttribute("popover", "manual");

      this.searchWrap = document.createElement("div");
      this.searchWrap.className = "sg-search-select__search-wrap";
      this.searchWrap.insertAdjacentHTML("beforeend", searchSvg);
      this.search = document.createElement("input");
      this.search.type = "search";
      this.search.className = "sg-search-select__search";
      this.search.placeholder = select.dataset.searchPlaceholder || searchPlaceholderFor(select);
      this.search.autocomplete = "off";
      this.search.setAttribute("aria-label", this.search.placeholder);
      this.searchWrap.append(this.search);

      this.optionsElement = document.createElement("div");
      this.optionsElement.className = "sg-search-select__options";
      this.optionsElement.setAttribute("role", "listbox");
      this.optionsElement.id = `sg-select-listbox-${++optionSequence}`;
      this.trigger.setAttribute("aria-controls", this.optionsElement.id);
      if (this.multiple) this.optionsElement.setAttribute("aria-multiselectable", "true");
      this.dropdown.append(this.searchWrap, this.optionsElement);

      select.classList.add("sg-search-select-native");
      select.setAttribute("aria-hidden", "true");
      select.tabIndex = -1;
      select.insertAdjacentElement("afterend", this.root);
      this.root.append(this.trigger);
      document.body.append(this.dropdown);

      this.bindEvents();
      this.sync();

      this.optionObserver = new MutationObserver(() => this.sync());
      this.optionObserver.observe(select, { childList: true, subtree: true, attributes: true, attributeFilter: ["disabled", "label", "value", "selected"] });
    }

    bindEvents() {
      this.trigger.addEventListener("click", () => this.toggle());
      this.trigger.addEventListener("keydown", (event) => {
        if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
          event.preventDefault();
          this.open();
        }
      });
      this.search.addEventListener("input", () => this.filter(this.search.value));
      this.search.addEventListener("keydown", (event) => this.handleSearchKeydown(event));
      this.select.addEventListener("change", () => this.sync());
      this.select.addEventListener("input", () => this.sync());
      this.select.addEventListener("focus", () => this.trigger.focus());
      this.select.addEventListener("invalid", () => {
        this.trigger.focus();
        this.open();
      });
    }

    selectedOptions() {
      return [...this.select.options].filter((option) => option.selected);
    }

    sync() {
      if (this.destroyed || !this.select.isConnected) return;
      const selected = this.selectedOptions();
      const fallback = this.select.options[0]?.textContent?.trim() || this.select.dataset.placeholder || "Selecione";
      const selectedLabels = selected.filter((option) => option.value !== "").map((option) => option.textContent.trim());
      this.valueElement.textContent = selectedLabels.length ? selectedLabels.join(", ") : fallback;
      this.valueElement.classList.toggle("is-placeholder", selectedLabels.length === 0);
      this.root.classList.toggle("is-disabled", this.select.disabled);
      this.trigger.disabled = this.select.disabled;
      this.trigger.setAttribute("aria-disabled", String(this.select.disabled));
      if (this.isOpen()) this.renderOptions();
    }

    renderOptions() {
      this.optionsElement.replaceChildren();
      this.optionButtons = [];
      const fragment = document.createDocumentFragment();

      [...this.select.options].forEach((option) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "sg-search-select__option";
        button.dataset.value = option.value;
        button.dataset.search = normalizeText(option.textContent);
        button.disabled = option.disabled;
        button.setAttribute("role", "option");
        button.setAttribute("aria-selected", String(option.selected));
        button.id = `sg-select-option-${++optionSequence}`;
        button.classList.toggle("is-selected", option.selected);

        const label = document.createElement("span");
        label.textContent = option.textContent.trim();
        button.append(label);
        button.insertAdjacentHTML("beforeend", checkSvg());
        button.addEventListener("click", () => this.choose(option));
        fragment.append(button);
        this.optionButtons.push(button);
      });

      this.optionsElement.append(fragment);
      this.filter(this.search.value);
    }

    choose(option) {
      if (option.disabled) return;
      if (this.multiple) option.selected = !option.selected;
      else this.select.value = option.value;

      this.select.dispatchEvent(new Event("input", { bubbles: true }));
      this.select.dispatchEvent(new Event("change", { bubbles: true }));
      this.sync();

      if (!this.multiple) {
        this.close();
        this.trigger.focus();
      } else {
        this.search.focus();
      }
    }

    filter(query) {
      const normalizedQuery = normalizeText(query);
      let visibleCount = 0;
      this.optionButtons.forEach((button) => {
        const visible = !normalizedQuery || button.dataset.search.includes(normalizedQuery);
        button.hidden = !visible;
        button.classList.remove("is-active");
        if (visible) visibleCount += 1;
      });

      this.optionsElement.querySelector(".sg-search-select__empty")?.remove();
      if (!visibleCount) {
        const empty = document.createElement("p");
        empty.className = "sg-search-select__empty";
        empty.textContent = "Nenhuma opção encontrada";
        this.optionsElement.append(empty);
      }
      this.activeIndex = -1;
    }

    visibleButtons() {
      return this.optionButtons.filter((button) => !button.hidden && !button.disabled);
    }

    handleSearchKeydown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        this.close();
        this.trigger.focus();
        return;
      }
      if (!["ArrowDown", "ArrowUp", "Enter"].includes(event.key)) return;

      const buttons = this.visibleButtons();
      if (!buttons.length) return;
      event.preventDefault();

      if (event.key === "Enter") {
        if (this.activeIndex >= 0 && buttons[this.activeIndex]) buttons[this.activeIndex].click();
        return;
      }

      buttons.forEach((button) => button.classList.remove("is-active"));
      const direction = event.key === "ArrowDown" ? 1 : -1;
      this.activeIndex = (this.activeIndex + direction + buttons.length) % buttons.length;
      const active = buttons[this.activeIndex];
      active.classList.add("is-active");
      active.scrollIntoView({ block: "nearest" });
      this.search.setAttribute("aria-activedescendant", active.id);
    }

    isOpen() {
      return this.dropdown.classList.contains("is-open");
    }

    toggle() {
      if (this.isOpen()) this.close();
      else this.open();
    }

    open() {
      if (this.select.disabled || this.destroyed) return;
      if (openInstance && openInstance !== this) openInstance.close();
      openInstance = this;
      const ownerDialog = this.select.closest("dialog[open]");
      if (ownerDialog && this.dropdown.parentElement !== ownerDialog) {
        ownerDialog.append(this.dropdown);
      } else if (!ownerDialog && this.dropdown.parentElement !== document.body) {
        document.body.append(this.dropdown);
      }
      this.root.classList.add("is-open");
      this.dropdown.classList.add("is-open");
      if (this.supportsPopover && !this.dropdown.matches(":popover-open")) {
        try {
          this.dropdown.showPopover();
        } catch (error) {
          this.supportsPopover = false;
          this.dropdown.removeAttribute("popover");
          if (ownerDialog) ownerDialog.append(this.dropdown);
        }
      }
      this.trigger.setAttribute("aria-expanded", "true");
      this.search.value = "";
      this.renderOptions();
      this.positionDropdown();
      requestAnimationFrame(() => this.search.focus());
    }

    close() {
      this.root.classList.remove("is-open");
      this.dropdown.classList.remove("is-open");
      if (this.supportsPopover && this.dropdown.matches(":popover-open")) {
        try {
          this.dropdown.hidePopover();
        } catch (_) {}
      }
      this.trigger.setAttribute("aria-expanded", "false");
      this.search.removeAttribute("aria-activedescendant");
      if (openInstance === this) openInstance = null;
    }

    positionDropdown() {
      if (!this.isOpen()) return;
      const rect = this.trigger.getBoundingClientRect();
      const viewportPadding = 10;
      const width = Math.max(rect.width, 220);
      const left = Math.min(Math.max(viewportPadding, rect.left), window.innerWidth - width - viewportPadding);
      const spaceBelow = window.innerHeight - rect.bottom;
      const estimatedHeight = Math.min(390, this.dropdown.scrollHeight || 390);
      const openAbove = spaceBelow < estimatedHeight + 12 && rect.top > spaceBelow;

      this.dropdown.style.width = `${Math.min(width, window.innerWidth - viewportPadding * 2)}px`;
      this.dropdown.style.left = `${left}px`;
      if (openAbove) {
        this.dropdown.style.top = "auto";
        this.dropdown.style.bottom = `${window.innerHeight - rect.top + 7}px`;
        this.dropdown.style.transformOrigin = "bottom center";
      } else {
        this.dropdown.style.top = `${rect.bottom + 7}px`;
        this.dropdown.style.bottom = "auto";
        this.dropdown.style.transformOrigin = "top center";
      }
    }

    destroy() {
      this.destroyed = true;
      this.optionObserver.disconnect();
      this.dropdown.remove();
      this.root.remove();
      this.select.classList.remove("sg-search-select-native");
      this.select.removeAttribute("aria-hidden");
      this.select.tabIndex = 0;
    }
  }

  const enhance = (select) => {
    if (!(select instanceof HTMLSelectElement) || instances.has(select) || select.dataset.nativeSelect === "true") return;
    const instance = new SearchableSelect(select);
    instances.set(select, instance);
  };

  const enhanceWithin = (root) => {
    if (root instanceof HTMLSelectElement) enhance(root);
    root.querySelectorAll?.("select").forEach(enhance);
  };

  document.addEventListener("click", (event) => {
    if (!openInstance) return;
    if (openInstance.root.contains(event.target) || openInstance.dropdown.contains(event.target)) return;
    openInstance.close();
  }, true);

  document.addEventListener("reset", () => {
    setTimeout(() => document.querySelectorAll("select").forEach((select) => instances.get(select)?.sync()), 0);
  }, true);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && openInstance) {
      openInstance.close();
      openInstance.trigger.focus();
    }
  });

  window.addEventListener("resize", () => openInstance?.positionDropdown());
  window.addEventListener("scroll", () => openInstance?.positionDropdown(), true);

  const pageObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) enhanceWithin(node);
      });
      mutation.removedNodes.forEach((node) => {
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        const removedSelects = node instanceof HTMLSelectElement ? [node] : [...node.querySelectorAll?.("select") || []];
        queueMicrotask(() => removedSelects.forEach((select) => {
          if (select.isConnected) return;
          instances.get(select)?.destroy();
          instances.delete(select);
        }));
      });
    });
  });

  const start = () => {
    enhanceWithin(document);
    pageObserver.observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();

  window.SevenGoldSearchableSelect = { enhance, refresh: () => enhanceWithin(document) };
})();
