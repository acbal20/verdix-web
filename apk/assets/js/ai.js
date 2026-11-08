(function () {
  const form = document.getElementById("chat-form");
  const textarea = document.getElementById("chat-text");
  const sendBtn = document.getElementById("send-btn");
  const log = document.getElementById("chat-log");

  const messages = [
    {
      role: "system",
      content:
        "Eres Verdix AI, un asistente amable, claro y útil. Respondes en el idioma del usuario, de forma concisa y precisa.",
    },
  ];

  let busy = false;

  function scrollToEnd() {
    log.scrollTop = log.scrollHeight;
  }

  function addMessage(role, text) {
    const wrap = document.createElement("div");
    wrap.className = "msg " + (role === "user" ? "user" : "bot");

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = role === "user" ? "🙂" : "∞";

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = text;

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

  async function askAI() {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: messages.slice(-12)
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const detail = data && data.error;
      const message =
        typeof detail === "string"
          ? detail
          : (detail && detail.message) || "HTTP " + res.status;
      throw new Error(message);
    }

    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error("Respuesta vacía");
    return content.trim();
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
    let errorMessage = "";
    try {
      reply = await askAI();
    } catch (err) {
      errorMessage = err && err.message ? err.message : "Error desconocido";
    }
    removeTyping();

    if (reply) {
      messages.push({ role: "assistant", content: reply });
      addMessage("assistant", reply);
    } else {
      const el = addMessage(
        "assistant",
        "No pude conectarme con Verdix AI. " + errorMessage +
          "\nRevisá la configuración de la clave en el archivo .env."
      );
      el.classList.add("error");
    }

    busy = false;
    sendBtn.disabled = false;
    textarea.focus();
  }

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

  textarea.focus();
})();
