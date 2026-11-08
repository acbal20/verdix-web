/* ============================================================
   VERDIX AUTH - Autenticación, sesiones y historial
   ============================================================ */

const VerdixAuth = (function () {
  const STORAGE_KEY = "verdix_auth_user";
  const CHATS_KEY = "verdix_chats";
  const MAX_CHATS = 50;
  const MAX_MESSAGES_PER_CHAT = 100;

  let currentUser = null;
  let chats = [];

  /* ---------- Inicialización ---------- */
  function init() {
    loadUser();
    loadChats();
    return { user: currentUser, chats: chats };
  }

  function loadUser() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) currentUser = JSON.parse(raw);
    } catch (e) {
      currentUser = null;
    }
    return currentUser;
  }

  function loadChats() {
    try {
      const raw = localStorage.getItem(CHATS_KEY);
      if (raw) chats = JSON.parse(raw);
      if (!Array.isArray(chats)) chats = [];
    } catch (e) {
      chats = [];
    }
    return chats;
  }

  function saveChats() {
    try {
      localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
    } catch (e) {
      console.error("No se pudo guardar chats:", e);
    }
  }

  /* ---------- Google Login (simulado - en producción usar OAuth real) ---------- */
  async function loginWithGoogle() {
    return new Promise((resolve, reject) => {
      // En producción real, aquí iría Google OAuth 2.0
      // Por ahora simulamos un login exitoso para demostración
      const name = prompt("Ingresa tu nombre para iniciar sesión:");
      if (!name) {
        reject(new Error("Nombre requerido"));
        return;
      }

      const email = prompt("Ingresa tu correo electrónico:");
      if (!email) {
        reject(new Error("Correo requerido"));
        return;
      }

      // Validar formato básico de email
      if (!email.includes("@") || !email.includes(".")) {
        reject(new Error("Correo electrónico inválido"));
        return;
      }

      currentUser = {
        id: "user_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        provider: "google",
        loginAt: Date.now(),
        photo: null,
        isAuthenticated: true,
      };

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
      } catch (e) {
        console.error("No se pudo guardar sesión:", e);
      }

      resolve(currentUser);
    });
  }

  function logout() {
    currentUser = null;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
    return { success: true };
  }

  function isAuthenticated() {
    return currentUser && currentUser.isAuthenticated === true;
  }

  function getCurrentUser() {
    return currentUser;
  }

  /* ---------- Historial de chats ---------- */
  function getChats() {
    return [...chats].reverse(); // Más recientes primero
  }

  function getChat(chatId) {
    return chats.find((c) => c.id === chatId) || null;
  }

  function createChat(title = "Nueva conversación") {
    const chat = {
      id: "chat_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      title: title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
      userId: currentUser ? currentUser.id : null,
    };
    chats.push(chat);
    if (chats.length > MAX_CHATS) chats = chats.slice(0, MAX_CHATS);
    saveChats();
    return chat;
  }

  function addMessageToChat(chatId, message) {
    const chat = getChat(chatId);
    if (!chat) return false;

    if (!chat.messages) chat.messages = [];

    message.id = "msg_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
    message.timestamp = Date.now();
    chat.messages.push(message);

    if (chat.messages.length > MAX_MESSAGES_PER_CHAT) {
      chat.messages = chat.messages.slice(-MAX_MESSAGES_PER_CHAT);
    }

    chat.updatedAt = Date.now();
    // Actualizar título si es el primer mensaje del usuario
    if (
      message.role === "user" &&
      chat.messages.length === 1 &&
      chat.title === "Nueva conversación"
    ) {
      chat.title = message.content.length > 30 ? message.content.substring(0, 30) + "..." : message.content;
    }

    saveChats();
    return true;
  }

  function deleteChat(chatId) {
    const index = chats.findIndex((c) => c.id === chatId);
    if (index === -1) return false;
    chats.splice(index, 1);
    saveChats();
    return true;
  }

  function clearAllChats() {
    chats = [];
    saveChats();
    return true;
  }

  /* ---------- Exportar/Importar chats ---------- */
  function exportChats() {
    return JSON.stringify({ user: currentUser, chats: chats, exportedAt: Date.now() }, null, 2);
  }

  function importChats(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      if (data.chats && Array.isArray(data.chats)) {
        chats = data.chats;
        saveChats();
        return { success: true, imported: chats.length };
      }
      return { success: false, error: "Formato inválido" };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  /* ---------- Subida de archivos ---------- */
  function validateFile(file) {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/svg+xml",
      "text/plain",
      "text/csv",
      "application/json",
      "application/pdf",
      "text/markdown",
      "text/html",
      "application/zip",
      "video/mp4",
      "audio/mpeg",
      "audio/wav",
    ];

    if (!file) return { valid: false, error: "No se proporcionó archivo" };
    if (file.size > maxSize) return { valid: false, error: "Archivo demasiado grande (máx 50MB)" };
    if (!allowedTypes.includes(file.type)) return { valid: false, error: "Tipo de archivo no permitido" };

    return { valid: true };
  }

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  return {
    init,
    loadUser,
    loadChats,
    saveChats,
    loginWithGoogle,
    logout,
    isAuthenticated,
    getCurrentUser,
    getChats,
    getChat,
    createChat,
    addMessageToChat,
    deleteChat,
    clearAllChats,
    exportChats,
    importChats,
    validateFile,
    readFileAsDataURL,
    readFileAsText,
  };
})();

// Inicializar autenticación
document.addEventListener("DOMContentLoaded", () => {
  VerdixAuth.init();
});

// Exportar global
window.VerdixAuth = VerdixAuth;
