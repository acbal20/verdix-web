/* ============================================================
   VERDIX AI — Cliente con markdown, imágenes y sesión Google
   ============================================================ */

(function () {
  const form = document.getElementById("chat-form");
  const textarea = document.getElementById("chat-text");
  const sendBtn = document.getElementById("send-btn");
  const log = document.getElementById("chat-log");

  const GOOGLE_CLIENT_ID = "TU_GOOGLE_CLIENT_ID.apps.googleusercontent.com";

  /* ---------- Estado ---------- */
  let busy = false;
  let currentUser = null;

  const messages = [
    {
      role: "system",
      content:
        "Eres Verdix AI, un asistente amable, claro, inteligente y útil. Respondes en el idioma del usuario, de forma concisa y precisa. Puedes ayudar con programación, preguntas generales, creatividad, soporte del ecosistema Verdix (Browser, Search, OS), generar imágenes y ejecutar comandos del sistema operativo. Siempre mantén un tono profesional pero cercano.",
    },
  ];

  /* ---------- Utilidades ---------- */
  function scrollToEnd() {
    log.scrollTop = log.scrollHeight;
  }

  function escapeHtml(txt) {
    const d = document.createElement("div");
    d.textContent = txt;
    return d.innerHTML;
  }

  /* ---------- Renderizado Markdown simple ---------- */
  function renderMarkdown(text) {
    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Negritas: **texto**
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Cursiva: *texto* o _texto_
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Código inline: `texto`
    html = html.replace(/`(.+?)`/g, '<code>$1</code>');
    // Bloques de código: ```texto```
    html = html.replace(/```([\s\S]*?)```/g, (match, code) =>
      '<pre><code>' + escapeHtml(code.trim()) + '</code></pre>'
    );
    // Títulos: # Texto
    html = html.replace(/^# (.+)$/gm, '<h3>$1</h3>');
    // Listas: - Texto
    html = html.replace(/^[-•] (.+)$/gm, '<li>$1</li>');
    // Envolver listas consecutivas en <ul>
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    // Saltos de línea
    html = html.replace(/\n/g, "<br>");

    return html;
  }

  function addMessage(role, text, error = false, imageUrl = null) {
    const wrap = document.createElement("div");
    wrap.className = "msg " + (role === "user" ? "user" : "bot") + (error ? " error" : "");

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = role === "user" ? "🙂" : "∞";

    const bubble = document.createElement("div");
    bubble.className = "bubble";

    if (imageUrl) {
      const img = document.createElement("img");
      img.src = imageUrl;
      img.style.maxWidth = "100%";
      img.style.borderRadius = "12px";
      img.style.marginTop = "10px";
      bubble.appendChild(img);
      if (text) {
        const p = document.createElement("p");
        p.innerHTML = renderMarkdown(text);
        bubble.appendChild(p);
      }
    } else {
      bubble.innerHTML = renderMarkdown(text);
    }

    wrap.appendChild(avatar);
    wrap.appendChild(bubble);
    log.appendChild(wrap);
    scrollToEnd();
    return wrap;
  }

  function addTyping() {
    const wrap = document.createElement("div");
    wrap.className = "msg bot";
    wrap.id = "typing-msg";
    wrap.innerHTML =
      '<div class="avatar">∞</div>' +
      '<div class="bubble"><span class="typing"><i></i><i></i><i></i></span></div>';
    log.appendChild(wrap);
    scrollToEnd();
  }

  function removeTyping() {
    const el = document.getElementById("typing-msg");
    if (el) el.remove();
  }

  /* ---------- Sesión / Google ---------- */
  function loadSession() {
    try {
      const raw = localStorage.getItem("verdix_ai_user");
      if (raw) {
        currentUser = JSON.parse(raw);
        updateAuthUI();
      }
    } catch (e) {}
  }

  function saveSession(user) {
    currentUser = user;
    try {
      localStorage.setItem("verdix_ai_user", JSON.stringify(user));
    } catch (e) {}
    updateAuthUI();
  }

  function clearSession() {
    currentUser = null;
    try { localStorage.removeItem("verdix_ai_user"); } catch (e) {}
    updateAuthUI();
  }

  function updateAuthUI() {
    const btn = document.getElementById("btn-google-login");
    const userInfo = document.getElementById("user-info");
    if (!btn || !userInfo) return;
    if (currentUser) {
      btn.style.display = "none";
      userInfo.style.display = "flex";
      userInfo.innerHTML =
        '<span class="avatar">' + (currentUser.picture ? '<img src="' + currentUser.picture + '" style="width:28px;height:28px;border-radius:50%">' : '👤') + '</span>' +
        '<span>' + escapeHtml(currentUser.name || currentUser.email) + '</span>' +
        '<button class="btn-ghost" onclick="verdixAI.logout()">Salir</button>';
    } else {
      btn.style.display = "flex";
      userInfo.style.display = "none";
    }
  }

  window.verdixAI = {
    login: function () {
      // Simulación de login Google (en producción usar OAuth real)
      const name = prompt("Ingresá tu nombre de usuario:");
      if (!name) return;
      const email = prompt("Ingresá tu correo:");
      if (!email) return;
      saveSession({
        name: name,
        email: email,
        picture: null,
        provider: "google",
        loginAt: Date.now()
      });
      toast("Sesión iniciada como " + name);
    },
    logout: function () {
      clearSession();
      toast("Sesión cerrada");
    }
  };

  /* ---------- Toast ---------- */
  function toast(msg) {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 2500);
  }

  /* ---------- IA ---------- */
  async function askAI(text) {
    const body = {
      messages: messages.slice(-12),
      image: text.includes("generar imagen") || text.includes("crear imagen") ? true : false
    };

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detail = data && data.error;
      const message =
        typeof detail === "string" ? detail : (detail && detail.message) || "HTTP " + res.status;
      throw new Error(message);
    }
    return data;
  }

  async function send(text) {
    const value = text.trim();
    if (!value || busy) return;

    busy = true;
    sendBtn.disabled = true;
    textarea.value = "";
    textarea.style.height = "auto";

    addMessage("user", value);
    messages.push({ role: "user", content: value });
    addTyping();

    let reply = null;
    let imageUrl = null;
    let errorMessage = "";
    try {
      const data = await askAI(value);
      reply = data.reply;
      imageUrl = data.imageUrl || null;
    } catch (err) {
      errorMessage = err && err.message ? err.message : "Error desconocido";
    }
    removeTyping();

    if (reply) {
      messages.push({ role: "assistant", content: reply });
      addMessage("assistant", reply, false, imageUrl);
    } else {
      const el = addMessage(
        "assistant",
        "No pude conectarme con Verdix AI. " + errorMessage +
          "\nRevisá la configuración de la clave en el panel de Vercel.",
        true
      );
      el.classList.add("error");
    }

    busy = false;
    sendBtn.disabled = false;
    textarea.focus();
  }

  /* ---------- Eventos ---------- */
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    send(textarea.value);
  });

  textarea.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(textarea.value);
    }
  });

  textarea.addEventListener("input", () => {
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 140) + "px";
  });

  /* ---------- Inicio ---------- */
  loadSession();
  textarea.focus();
})();
