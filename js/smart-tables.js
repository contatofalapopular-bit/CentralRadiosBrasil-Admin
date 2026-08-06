/**
 * Admin 3.15.0 — Navegação Inteligente das Listagens.
 * Melhora tabelas largas sem alterar dados, rotas ou regras dos módulos.
 */
(function () {
  "use strict";

  const STORAGE_PREFIX = "crb-admin-smart-table-v1";
  const MIN_COLUMNS = 6;
  const DEFAULT_PAGE_SIZE = 50;
  const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];
  const states = new Map();
  let scanScheduled = false;

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();
  }

  function storageGet(key, fallback) {
    try {
      const value = localStorage.getItem(`${STORAGE_PREFIX}:${key}`);
      return value === null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  function storageSet(key, value) {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}:${key}`, JSON.stringify(value));
    } catch {
      // Preferências são opcionais; o painel continua funcionando sem localStorage.
    }
  }

  function getTableKey(table) {
    const tbody = table.tBodies?.[0];
    if (tbody?.id) return tbody.id;
    if (table.id) return table.id;
    const page = table.closest("section[id$='-page']")?.id || "lista";
    const index = Array.from(document.querySelectorAll(`#${CSS.escape(page)} table`)).indexOf(table);
    return `${page}-${Math.max(0, index)}`;
  }

  function getHeaders(table) {
    return Array.from(table.tHead?.rows?.[0]?.cells || []);
  }

  function chooseAnchorIndex(headers) {
    const priorities = [
      /emissora/,
      /^radio(?:\s|$)/,
      /radio\s*\/\s*stream/,
      /interessado/,
      /solicitacao/,
      /protocolo/,
      /nome/
    ];
    for (const pattern of priorities) {
      const index = headers.findIndex((cell) => pattern.test(normalizeText(cell.textContent)));
      if (index >= 0) return index;
    }
    return 0;
  }

  function chooseActionsIndex(headers) {
    const index = headers.findIndex((cell) => /^(acoes|acao)$/.test(normalizeText(cell.textContent)));
    return index >= 0 ? index : headers.length - 1;
  }

  function shouldEnhance(wrapper, table) {
    if (!wrapper || !table || wrapper.dataset.smartTableSkip === "true") return false;
    if (table.closest(".modal-card,.form-section,.audiencia-detail-card,.central-detail-card")) return false;
    const headers = getHeaders(table);
    return headers.length >= MIN_COLUMNS && Boolean(table.tBodies?.length);
  }

  function createButton(label, title, action) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "smart-table-control-button";
    button.innerHTML = label;
    button.title = title;
    button.setAttribute("aria-label", title);
    button.dataset.smartAction = action;
    return button;
  }

  function buildControls(state) {
    const controls = document.createElement("div");
    controls.className = "smart-table-controls";
    controls.innerHTML = `
      <div class="smart-table-controls__nav">
        <span class="smart-table-controls__hint">Navegue pelas colunas sem descer até o fim da lista</span>
      </div>
      <div class="smart-table-controls__options"></div>
    `;

    const nav = controls.querySelector(".smart-table-controls__nav");
    nav.prepend(
      createButton("⇤", "Ir para o início da tabela", "start"),
      createButton("←", "Rolar para a esquerda", "left"),
      createButton("→", "Rolar para a direita", "right"),
      createButton("⇥", "Ir para o fim da tabela", "end")
    );

    const options = controls.querySelector(".smart-table-controls__options");
    const compact = createButton("▦ <span>Compacto</span>", "Alternar modo compacto", "compact");
    compact.classList.toggle("is-active", state.compact);
    compact.setAttribute("aria-pressed", state.compact ? "true" : "false");
    options.appendChild(compact);

    const columns = document.createElement("details");
    columns.className = "smart-table-columns";
    columns.innerHTML = `
      <summary>☷ <span>Colunas</span></summary>
      <div class="smart-table-columns__panel">
        <strong>Colunas visíveis</strong>
        <div class="smart-table-columns__list"></div>
        <small>A identificação principal e as ações permanecem visíveis para facilitar a operação.</small>
      </div>
    `;
    options.appendChild(columns);
    state.columnsDetails = columns;

    controls.addEventListener("click", (event) => {
      const button = event.target.closest("[data-smart-action]");
      if (!button) return;
      const action = button.dataset.smartAction;
      if (action === "compact") {
        state.compact = !state.compact;
        state.table.classList.toggle("smart-table-compact", state.compact);
        button.classList.toggle("is-active", state.compact);
        button.setAttribute("aria-pressed", state.compact ? "true" : "false");
        storageSet(`${state.key}:compact`, state.compact);
        requestAnimationFrame(() => updateScroller(state));
        return;
      }
      const amount = Math.max(260, Math.round(state.wrapper.clientWidth * 0.72));
      if (action === "start") state.wrapper.scrollTo({ left: 0, behavior: "smooth" });
      if (action === "end") state.wrapper.scrollTo({ left: state.wrapper.scrollWidth, behavior: "smooth" });
      if (action === "left") state.wrapper.scrollBy({ left: -amount, behavior: "smooth" });
      if (action === "right") state.wrapper.scrollBy({ left: amount, behavior: "smooth" });
    });

    return controls;
  }

  function buildTopScroll(state) {
    const topScroll = document.createElement("div");
    topScroll.className = "smart-table-top-scroll";
    topScroll.setAttribute("aria-label", "Rolagem horizontal superior da tabela");
    topScroll.tabIndex = 0;
    const spacer = document.createElement("div");
    spacer.className = "smart-table-top-scroll__spacer";
    topScroll.appendChild(spacer);
    state.topScroll = topScroll;
    state.topSpacer = spacer;

    let syncing = false;
    topScroll.addEventListener("scroll", () => {
      if (syncing) return;
      syncing = true;
      state.wrapper.scrollLeft = topScroll.scrollLeft;
      syncing = false;
      updateEdgeState(state);
    });
    state.wrapper.addEventListener("scroll", () => {
      if (syncing) return;
      syncing = true;
      topScroll.scrollLeft = state.wrapper.scrollLeft;
      syncing = false;
      updateEdgeState(state);
    }, { passive: true });

    state.wrapper.addEventListener("wheel", (event) => {
      if (!event.shiftKey || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      state.wrapper.scrollLeft += event.deltaY;
    }, { passive: false });

    return topScroll;
  }

  function updateEdgeState(state) {
    const max = Math.max(0, state.wrapper.scrollWidth - state.wrapper.clientWidth);
    state.host.classList.toggle("can-scroll-left", state.wrapper.scrollLeft > 3);
    state.host.classList.toggle("can-scroll-right", state.wrapper.scrollLeft < max - 3);
    const buttons = state.controls.querySelectorAll("[data-smart-action]");
    buttons.forEach((button) => {
      const action = button.dataset.smartAction;
      if (action === "start" || action === "left") button.disabled = state.wrapper.scrollLeft <= 3;
      if (action === "end" || action === "right") button.disabled = state.wrapper.scrollLeft >= max - 3;
    });
  }

  function updateScroller(state) {
    if (!document.body.contains(state.table)) return;
    const width = Math.max(state.table.scrollWidth, state.wrapper.scrollWidth);
    state.topSpacer.style.width = `${width}px`;
    const canScroll = state.wrapper.scrollWidth > state.wrapper.clientWidth + 3;
    state.topScroll.classList.toggle("is-hidden", !canScroll);
    if (!canScroll) {
      state.wrapper.scrollLeft = 0;
      state.topScroll.scrollLeft = 0;
    }
    updateEdgeState(state);
  }

  function applyStickyColumns(state) {
    const rows = Array.from(state.table.rows || []);
    rows.forEach((row) => {
      Array.from(row.cells || []).forEach((cell, index) => {
        cell.classList.toggle("smart-sticky-anchor", index === state.anchorIndex);
        cell.classList.toggle("smart-sticky-actions", index === state.actionsIndex);
      });
    });
  }

  function compactActions(state) {
    const tbody = state.table.tBodies?.[0];
    if (!tbody) return;
    Array.from(tbody.rows).forEach((row) => {
      const cell = row.cells?.[state.actionsIndex];
      if (!cell || cell.querySelector(":scope > .smart-action-stack")) return;
      const actions = Array.from(cell.children).filter((node) =>
        node.matches?.("button,a") && !node.classList.contains("hidden")
      );
      if (!actions.length) return;
      const stack = document.createElement("div");
      stack.className = "smart-action-stack";
      actions.forEach((action) => stack.appendChild(action));
      cell.appendChild(stack);
    });
  }

  function decorateLongCells(state) {
    const tbody = state.table.tBodies?.[0];
    if (!tbody) return;
    Array.from(tbody.rows).forEach((row) => {
      Array.from(row.cells || []).forEach((cell, index) => {
        if (index === state.actionsIndex || cell.colSpan > 1) return;
        cell.classList.add("smart-cell-clamp");
        const text = String(cell.textContent || "").replace(/\s+/g, " ").trim();
        if (text.length > 34 && !cell.title) cell.title = text;
      });
    });
  }

  function getHiddenColumns(state) {
    const value = storageGet(`${state.key}:hidden-columns`, []);
    return new Set(Array.isArray(value) ? value.map(Number) : []);
  }

  function applyColumnVisibility(state) {
    const hidden = getHiddenColumns(state);
    hidden.delete(state.anchorIndex);
    hidden.delete(state.actionsIndex);
    Array.from(state.table.rows || []).forEach((row) => {
      Array.from(row.cells || []).forEach((cell, index) => {
        cell.classList.toggle("smart-column-hidden", hidden.has(index));
      });
    });
    if (state.columnsDetails) {
      state.columnsDetails.querySelectorAll("input[data-column-index]").forEach((input) => {
        input.checked = !hidden.has(Number(input.dataset.columnIndex));
      });
    }
  }

  function buildColumnChooser(state) {
    const list = state.columnsDetails.querySelector(".smart-table-columns__list");
    list.innerHTML = "";
    state.headers.forEach((header, index) => {
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.type = "checkbox";
      input.dataset.columnIndex = String(index);
      input.disabled = index === state.anchorIndex || index === state.actionsIndex;
      const hidden = getHiddenColumns(state);
      input.checked = !hidden.has(index) || input.disabled;
      input.addEventListener("change", () => {
        const current = getHiddenColumns(state);
        if (input.checked) current.delete(index);
        else current.add(index);
        storageSet(`${state.key}:hidden-columns`, Array.from(current));
        applyColumnVisibility(state);
        requestAnimationFrame(() => updateScroller(state));
      });
      const text = document.createElement("span");
      text.textContent = String(header.textContent || `Coluna ${index + 1}`).trim();
      label.append(input, text);
      list.appendChild(label);
    });
  }

  function getDataRows(state) {
    const tbody = state.table.tBodies?.[0];
    if (!tbody) return [];
    return Array.from(tbody.rows).filter((row) => {
      if (row.cells.length <= 1 && row.cells[0]?.colSpan > 1) return false;
      return !row.querySelector(".empty-state,.ocorrencias-empty,.streaming-empty");
    });
  }

  function buildPagination(state) {
    if (state.key === "central-table-body" || state.wrapper.parentElement?.querySelector(":scope > .central-pagination")) return null;
    const pagination = document.createElement("div");
    pagination.className = "smart-table-pagination is-hidden";
    pagination.innerHTML = `
      <span class="smart-table-pagination__status">0 registros</span>
      <label>Por página <select aria-label="Registros por página"></select></label>
      <button type="button" data-page-action="first" title="Primeira página">⇤</button>
      <button type="button" data-page-action="prev" title="Página anterior">←</button>
      <strong class="smart-table-pagination__page">1 / 1</strong>
      <button type="button" data-page-action="next" title="Próxima página">→</button>
      <button type="button" data-page-action="last" title="Última página">⇥</button>
    `;
    const select = pagination.querySelector("select");
    PAGE_SIZE_OPTIONS.forEach((size) => {
      const option = document.createElement("option");
      option.value = String(size);
      option.textContent = String(size);
      select.appendChild(option);
    });
    select.value = String(state.pageSize);
    select.addEventListener("change", () => {
      state.pageSize = Number(select.value) || DEFAULT_PAGE_SIZE;
      state.page = 1;
      storageSet(`${state.key}:page-size`, state.pageSize);
      applyPagination(state);
    });
    pagination.addEventListener("click", (event) => {
      const button = event.target.closest("[data-page-action]");
      if (!button) return;
      const rows = getDataRows(state);
      const pages = Math.max(1, Math.ceil(rows.length / state.pageSize));
      const action = button.dataset.pageAction;
      if (action === "first") state.page = 1;
      if (action === "prev") state.page = Math.max(1, state.page - 1);
      if (action === "next") state.page = Math.min(pages, state.page + 1);
      if (action === "last") state.page = pages;
      applyPagination(state);
      state.controls.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return pagination;
  }

  function applyPagination(state) {
    if (!state.pagination) return;
    const rows = getDataRows(state);
    const total = rows.length;
    const pages = Math.max(1, Math.ceil(total / state.pageSize));
    state.page = Math.min(Math.max(1, state.page), pages);
    const start = (state.page - 1) * state.pageSize;
    const end = start + state.pageSize;
    rows.forEach((row, index) => { row.hidden = index < start || index >= end; });
    state.pagination.classList.toggle("is-hidden", total <= state.pageSize);
    state.pagination.querySelector(".smart-table-pagination__status").textContent = total
      ? `${start + 1}–${Math.min(end, total)} de ${total} registros`
      : "0 registros";
    state.pagination.querySelector(".smart-table-pagination__page").textContent = `${state.page} / ${pages}`;
    state.pagination.querySelector('[data-page-action="first"]').disabled = state.page <= 1;
    state.pagination.querySelector('[data-page-action="prev"]').disabled = state.page <= 1;
    state.pagination.querySelector('[data-page-action="next"]').disabled = state.page >= pages;
    state.pagination.querySelector('[data-page-action="last"]').disabled = state.page >= pages;
    requestAnimationFrame(() => updateScroller(state));
  }

  function refreshState(state, resetPage) {
    if (!document.body.contains(state.table)) return;
    if (resetPage) state.page = 1;
    applyStickyColumns(state);
    compactActions(state);
    decorateLongCells(state);
    applyColumnVisibility(state);
    applyPagination(state);
    requestAnimationFrame(() => updateScroller(state));
  }

  function initializeWrapper(wrapper) {
    if (wrapper.dataset.smartTableReady === "true") return;
    const table = wrapper.querySelector(":scope > table") || wrapper.querySelector("table");
    if (!shouldEnhance(wrapper, table)) return;

    const headers = getHeaders(table);
    const key = getTableKey(table);
    const card = wrapper.parentElement;
    const host = document.createElement("div");
    host.className = "smart-table-host";
    card?.classList.add("smart-table-card-host");
    wrapper.parentNode.insertBefore(host, wrapper);
    host.appendChild(wrapper);
    wrapper.dataset.smartTableReady = "true";
    wrapper.classList.add("smart-table-scroll");
    table.classList.add("smart-table");
    table.dataset.smartTableKey = key;

    const state = {
      key,
      host,
      wrapper,
      table,
      headers,
      anchorIndex: chooseAnchorIndex(headers),
      actionsIndex: chooseActionsIndex(headers),
      compact: Boolean(storageGet(`${key}:compact`, false)),
      page: 1,
      pageSize: Number(storageGet(`${key}:page-size`, DEFAULT_PAGE_SIZE)) || DEFAULT_PAGE_SIZE,
      controls: null,
      topScroll: null,
      topSpacer: null,
      columnsDetails: null,
      pagination: null,
      observer: null,
      resizeObserver: null
    };

    state.controls = buildControls(state);
    state.topScroll = buildTopScroll(state);
    host.insertBefore(state.topScroll, wrapper);
    host.insertBefore(state.controls, state.topScroll);
    state.pagination = buildPagination(state);
    if (state.pagination) host.appendChild(state.pagination);
    table.classList.toggle("smart-table-compact", state.compact);
    buildColumnChooser(state);

    const tbody = table.tBodies[0];
    state.observer = new MutationObserver(() => {
      clearTimeout(state.refreshTimer);
      state.refreshTimer = setTimeout(() => refreshState(state, true), 20);
    });
    state.observer.observe(tbody, { childList: true, subtree: true });

    if ("ResizeObserver" in window) {
      state.resizeObserver = new ResizeObserver(() => updateScroller(state));
      state.resizeObserver.observe(wrapper);
      state.resizeObserver.observe(table);
    }

    states.set(key, state);
    refreshState(state, false);
  }

  function scan() {
    scanScheduled = false;
    document.querySelectorAll(".table-scroll").forEach(initializeWrapper);
  }

  function scheduleScan() {
    if (scanScheduled) return;
    scanScheduled = true;
    requestAnimationFrame(scan);
  }

  document.addEventListener("DOMContentLoaded", () => {
    scheduleScan();
    const observer = new MutationObserver(scheduleScan);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", () => states.forEach(updateScroller), { passive: true });
    window.addEventListener("hashchange", () => setTimeout(() => states.forEach(updateScroller), 60));
  });

  window.SmartTablesAdmin = Object.freeze({
    refresh() { states.forEach((state) => refreshState(state, false)); },
    version: "3.15.0"
  });
})();
