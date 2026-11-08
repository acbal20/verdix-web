(function () {
  const home = document.getElementById("browser-home");
  const iframe = document.getElementById("browser-iframe");
  const fallback = document.getElementById("browser-fallback");
  const urlForm = document.getElementById("url-form");
  const urlInput = document.getElementById("url-input");
  const backBtn = document.getElementById("back-btn");
  const reloadBtn = document.getElementById("reload-btn");
  const goBtn = document.getElementById("go-btn");
  const externalBtn = document.getElementById("external-btn");
  const fallbackOpen = document.getElementById("fallback-open");

  const blockedHosts = [
    "google.com",
    "youtube.com",
    "web.whatsapp.com",
    "mail.google.com",
    "facebook.com",
    "instagram.com",
    "twitter.com",
    "x.com",
    "github.com",
    "tiktok.com",
  ];

  let currentUrl = "";
  let lastUrl = "";
  let history = [];

  function normalize(raw) {
    const value = raw.trim();
    if (!value) return "";
    if (/^https?:\/\//i.test(value)) return value;
    if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(value)) return "https://" + value;
    return "search.html?q=" + encodeURIComponent(value);
  }

  function isBlocked(url) {
    try {
      const host = new URL(url).hostname.replace(/^www\./, "");
      return blockedHosts.some((b) => host === b || host.endsWith("." + b));
    } catch (e) {
      return false;
    }
  }

  function showFallback(url) {
    home.style.display = "none";
    iframe.style.display = "none";
    fallback.classList.add("show");
    fallback.dataset.url = url;
  }

  function navigate(raw, push) {
    const url = normalize(raw);
    if (!url) return;

    if (push !== false && currentUrl) history.push(currentUrl);
    currentUrl = url;

    urlInput.value = url;
    lastUrl = url;

    if (isBlocked(url)) {
      showFallback(url);
      window.open(url, "_blank", "noopener");
      return;
    }

    home.style.display = "none";
    fallback.classList.remove("show");
    iframe.style.display = "block";
    iframe.src = url;
  }

  function goHome() {
    currentUrl = "";
    lastUrl = "";
    iframe.src = "about:blank";
    iframe.style.display = "none";
    fallback.classList.remove("show");
    home.style.display = "grid";
    urlInput.value = "";
    urlInput.focus();
  }

  document.querySelectorAll("#browser-home a[data-url]").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      navigate(link.dataset.url);
    });
  });

  urlForm.addEventListener("submit", (e) => {
    e.preventDefault();
    navigate(urlInput.value);
  });

  goBtn.addEventListener("click", () => navigate(urlInput.value));

  reloadBtn.addEventListener("click", () => {
    if (currentUrl) navigate(currentUrl, false);
  });

  backBtn.addEventListener("click", () => {
    const prev = history.pop();
    if (prev) navigate(prev, false);
    else goHome();
  });

  externalBtn.addEventListener("click", () => {
    if (lastUrl) window.open(lastUrl, "_blank", "noopener");
  });

  fallbackOpen.addEventListener("click", () => {
    const url = fallback.dataset.url || lastUrl;
    if (url) window.open(url, "_blank", "noopener");
  });

  urlInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      urlInput.value = lastUrl;
      urlInput.blur();
    }
  });
})();
