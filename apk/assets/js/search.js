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
    const wrap = el("div", "result-list");
    list.forEach((item) => {
      const card = el("article", "result-item");
      const title = el("a", "result-title", item.title);
      title.href = item.url;
      title.target = "_blank";
      title.rel = "noopener noreferrer";
      const url = el("div", "result-url", hostLabel(item.url) || item.source || "");
      const desc = el("p", "result-desc", item.description || "");
      card.append(url, title, desc);
      wrap.appendChild(card);
    });
    return wrap;
  }

  function renderImages(list) {
    const grid = el("div", "result-images");
    list.forEach((item) => {
      const link = el("a", "result-image");
      link.href = item.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      const img = document.createElement("img");
      img.src = item.image || "";
      img.alt = item.title || "Imagen";
      img.loading = "lazy";
      img.referrerPolicy = "no-referrer";
      const meta = el("span", "result-image-meta", item.title || "");
      link.append(img, meta);
      grid.appendChild(link);
    });
    return grid;
  }

  function renderVideos(list) {
    const wrap = el("div", "result-list");
    list.forEach((item) => {
      const card = el("a", "result-video");
      card.href = item.url;
      card.target = "_blank";
      card.rel = "noopener noreferrer";
      const thumb = el("div", "result-video-thumb");
      if (item.image) {
        const img = document.createElement("img");
        img.src = item.image;
        img.alt = "";
        img.loading = "lazy";
        img.referrerPolicy = "no-referrer";
        thumb.appendChild(img);
      }
      const body = el("div", "result-video-body");
      body.append(
        el("div", "result-title", item.title),
        el("div", "result-desc", item.description || "")
      );
      card.append(thumb, body);
      wrap.appendChild(card);
    });
    return wrap;
  }

  function renderNews(list) {
    const wrap = el("div", "result-list");
    list.forEach((item) => {
      const card = el("article", "result-item");
      const title = el("a", "result-title", item.title);
      title.href = item.url;
      title.target = "_blank";
      title.rel = "noopener noreferrer";
      const meta = el("div", "result-url", item.description || item.source || "");
      card.append(title, meta);
      wrap.appendChild(card);
    });
    return wrap;
  }

  function render(type, list) {
    resultsContainer.innerHTML = "";
    if (!list.length) {
      setStatus("No encontramos resultados. Probá con otra búsqueda.", false);
      return;
    }
    setStatus("", false);
    const renderers = {
      web: renderWeb,
      images: renderImages,
      videos: renderVideos,
      news: renderNews,
    };
    resultsContainer.appendChild((renderers[type] || renderWeb)(list));
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
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(q)}&type=${encodeURIComponent(kind)}`
      );
      const data = await response.json();
      if (current !== requestId) return;
      if (!response.ok || data.error) {
        throw new Error(typeof data.error === "string" ? data.error : "Error en la búsqueda");
      }
      render(kind, Array.isArray(data.results) ? data.results : []);
    } catch (err) {
      if (current !== requestId) return;
      resultsContainer.innerHTML = "";
      setStatus("No se pudo buscar: " + err.message, true);
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
