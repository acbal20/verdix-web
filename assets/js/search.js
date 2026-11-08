(function () {
  const form = document.getElementById("search-form");
  const input = document.getElementById("search-input");
  const resultsContainer = document.getElementById("search-results");
  const statusEl = document.getElementById("search-status");
  const tabs = Array.from(document.querySelectorAll(".tab"));

  if (!form || !input || !resultsContainer) return;

  let activeType = "web";
  let lastQuery = "";
  let requestId = 0;

  function setStatus(message, isError) {
    if (!statusEl) return;
    if (!message) {
      statusEl.hidden = true;
      statusEl.textContent = "";
      return;
    }
    statusEl.hidden = false;
    statusEl.textContent = message;
    statusEl.classList.toggle("is-error", !!isError);
  }

  function setActiveTab(type) {
    activeType = type;
    tabs.forEach((tab) => {
      const on = tab.dataset.type === type;
      tab.classList.toggle("active", on);
      tab.setAttribute("aria-selected", on ? "true" : "false");
    });
    input.placeholder = {
      web: "Buscá en la web...",
      images: "Buscá imágenes...",
      videos: "Buscá videos...",
      news: "Buscá noticias...",
    }[type] || "Buscá...";
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function hostLabel(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch (e) {
      return "";
    }
  }

  function renderWeb(list) {
    const wrap = el("div", "verdix-result");
    list.forEach((item) => {
      const card = el("article", "verdix-result-item");
      const content = el("div", "verdix-result-content");
      const url = el("div", "verdix-result-url", hostLabel(item.url) || item.source || "");
      const title = el("a", "verdix-result-title", item.title);
      title.href = item.url;
      title.target = "_blank";
      title.rel = "noopener noreferrer";
      const desc = el("p", "verdix-result-snippet", item.snippet || item.description || "");
      content.append(url, title, desc);
      card.appendChild(content);
      wrap.appendChild(card);
    });
    return wrap;
  }

  function renderFallback(query, kind) {
    const wrap = el("div", "verdix-result-fallback");
    wrap.appendChild(el("div", "verdix-logo", "∞"));
    wrap.appendChild(el("p", "", "Verdix Search está en modo fallback. Configura BRAVE_API_KEY en Vercel para búsquedas reales."));
    const actions = el("div", "verdix-external-links");
    const targets = {
      web: [
        ["Google", `https://www.google.com/search?q=${encodeURIComponent(query)}`],
        ["DuckDuckGo", `https://duckduckgo.com/?q=${encodeURIComponent(query)}`],
        ["Wikipedia", `https://es.wikipedia.org/w/index.php?search=${encodeURIComponent(query)}`],
      ],
      images: [
        ["Google Imágenes", `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`],
        ["DuckDuckGo Imágenes", `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`],
      ],
      videos: [
        ["YouTube", `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`],
        ["DuckDuckGo Videos", `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=videos&ia=videos`],
      ],
      news: [
        ["Google Noticias", `https://news.google.com/search?q=${encodeURIComponent(query)}&hl=es`],
        ["DuckDuckGo Noticias", `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iar=news&ia=news`],
      ],
    };
    (targets[kind] || targets.web).forEach(([label, url]) => {
      const link = el("a", "", label);
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      actions.appendChild(link);
    });
    wrap.appendChild(actions);
    return wrap;
  }

  function render(kind, list) {
    resultsContainer.innerHTML = "";
    if (!list.length) {
      setStatus("No encontramos resultados. Probá con otra búsqueda.", false);
      return;
    }
    setStatus("", false);
    const renderers = {
      web: renderWeb,
    };
    resultsContainer.appendChild((renderers[kind] || renderWeb)(list));
  }

  function syncUrl(query, type, push) {
    if (!window.history || !window.history.pushState) return;
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (type && type !== "web") params.set("type", type);
    const url = "search.html" + (params.toString() ? "?" + params.toString() : "");
    try {
      if (push) window.history.pushState({ query, type }, "", url);
      else window.history.replaceState({ query, type }, "", url);
    } catch (e) {
      /* ignore */
    }
  }

  async function search(query, type, options) {
    const q = (query !== undefined ? query : input.value).trim();
    const kind = type || activeType;
    const opts = options || {};

    if (!q) {
      input.focus();
      return;
    }

    input.value = q;
    lastQuery = q;
    const current = ++requestId;

    resultsContainer.innerHTML = "";
    setStatus("Buscando en Verdix…", false);
    if (opts.push !== false) syncUrl(q, kind, true);

    try {
      const apiBase = (window.VERDIX_API_BASE || "").replace(/\/$/, "");
      const response = await fetch(
        `${apiBase}/api/search?q=${encodeURIComponent(q)}&type=${encodeURIComponent(kind)}`
      );
      const data = await response.json();
      if (current !== requestId) return;
      if (!response.ok || data.error) {
        throw new Error(typeof data.error === "string" ? data.error : "Error en la búsqueda");
      }
      render(kind, Array.isArray(data.results) ? data.results : []);
      if (data.fallback) {
        const fb = renderFallback(q, kind);
        resultsContainer.appendChild(fb);
      }
    } catch (err) {
      if (current !== requestId) return;
      const fb = renderFallback(q, kind);
      resultsContainer.appendChild(fb);
      setStatus("Verdix Search no está disponible ahora. Probá estos resultados alternativos.", false);
    }
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      if (tab.dataset.type === activeType) return;
      setActiveTab(tab.dataset.type);
      if (lastQuery) search(lastQuery, activeType, { push: false });
      syncUrl(lastQuery, activeType, false);
    });
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    search(input.value, activeType, { push: true });
  });

  document.querySelectorAll(".chip[data-q]").forEach((chip) => {
    chip.addEventListener("click", () => {
      input.value = chip.dataset.q;
      search(chip.dataset.q, activeType, { push: true });
    });
  });

  window.addEventListener("popstate", (e) => {
    const state = e.state || {};
    if (state.query) {
      setActiveTab(state.type || "web");
      input.value = state.query;
      search(state.query, activeType, { push: false });
    }
  });

  const params = new URLSearchParams(window.location.search);
  const initialQuery = params.get("q") || "";
  const initialType = params.get("type");
  if (initialType && tabs.some((t) => t.dataset.type === initialType)) {
    setActiveTab(initialType);
  }
  if (initialQuery) {
    input.value = initialQuery;
    search(initialQuery, activeType, { push: false });
  }
})();