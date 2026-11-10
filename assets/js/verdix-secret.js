/* ============================================================
   VERDIX SEARCH - Secreto Omnitrix1221
   ============================================================
   Si el usuario escribe "omnitrix1221" en el buscador,
   se activa el modo secreto con enlaces a los APKs y ISO.
   ============================================================ */

(function() {
  const SECRET_CODE = "omnitrix1221";
  const SECRET_KEY = "verdix_secret_activated";

  // Elementos del DOM
  const searchInput = document.getElementById('search-input');
  const searchForm = document.getElementById('search-form');
  const secretContainer = document.getElementById('verdigx-secret-container');

  // Verificar si ya se activó el secreto previamente
  if (localStorage.getItem(SECRET_KEY) === 'true') {
    showSecretSection();
  }

  // Escuchar el envío del formulario
  if (searchForm) {
    searchForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const inputValue = searchInput.value.trim().toLowerCase();
      
      if (inputValue === SECRET_CODE) {
        activateSecret();
      } else {
        // Buscar normalmente
        performNormalSearch(searchInput.value);
      }
    });
  }

  // Activar el modo secreto
  function activateSecret() {
    secretActivated = true;
    localStorage.setItem(SECRET_KEY, 'true');
    showSecretSection();
    
    // Mostrar notificación
    showNotification('¡Has encontrado el Modo Dios de VERDIX! Bienvenido al club secreto.');
  }

  // Mostrar sección secreta
  function showSecretSection() {
    // Ocultar contenido normal del buscador
    const searchBox = document.querySelector('.search-box');
    if (searchBox) {
      searchBox.style.display = 'none';
    }

    // Crear contenedor de sección secreta
    const secretSection = document.createElement('div');
    secretSection.id = 'verdix-secret-section';
    secretModal.style.cssText = `
      background: rgba(0, 255, 65, 0.1);
      border: 2px solid #00ff41;
      border-radius: 16px;
      padding: 24px;
      margin: 20px 0;
      text-align: center;
      color: #eaffec;
      font-family: 'Space Grotesk', ui-sans-serif, system-ui, sans-serif;
    `;

    secretSection.innerHTML = `
      <div style="font-size: 3rem; margin-bottom: 20px;">🔓</div>
      <h1 style="font-size: 2rem; margin-bottom: 10px; color: #00ff41;">🔓 VERDIX MODUS DESARROLLADOR ACTIVADO</h1>
      <p style="font-size: 1.1rem; color: #eaffec; margin-bottom: 25px;">
        Has encontrado el acceso secreto al ecosistema Verdix.
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
        <div style="background: rgba(0, 255, 65, 0.1); border: 1px solid rgba(0, 255, 65, 0.3); border-radius: 12px; padding: 20px; text-align: center;">
          <div style="font-size: 2rem; margin-bottom: 15px;">🎮</div>
          <h3 style="color: #00ff41; font-size: 1.2rem;">Ben 10 Omnitrix Battle</h3>
          <p style="font-size: 0.85rem; color: #8aa79b;">Versión God Mode con poderes desbloqueados.</p>
          <button class="verdix-secret-btn" onclick="verdixSecret.download('Ben10_Omnitrix_Battle_God_Release.apk')" style="margin-top: 15px;">
            Descargar APK
          </button>
        </div>
        <div style="background: rgba(0, 168, 255, 0.1); border: 1px solid rgba(0, 168, 255, 0.3); border-radius: 12px; padding: 20px; text-align: center;">
          <div style="font-size: 2rem; margin-bottom: 15px;">🌐</div>
          <h3 style="color: #00a8ff; font-size: 1.1rem;">Verdix Browser Modo Dios</h3>
          <p style="font-size: 0.85rem; color: #8aa79b;">Navegador con características exclusivas de desarrollador.</p>
          <button class="verdix-secret-btn" onclick="verdixSecret.download('Verdix.apk')" style="margin-top: 15px;">
            Descargar EXE
          </button>
        </div>
        <div style="background: rgba(138, 43, 226, 0.1); border: 1px solid rgba(138, 43, 226, 0.3); border-radius: 12px; padding: 20px; text-align: center;">
          <div style="font-size: 2rem; margin-bottom: 15px;">💿</div>
          <h3 style="color: #7b2cff; font-size: 1.1rem;">Verdix OS ISO Modo Dios</h3>
          <p style="font-size: 0.85rem; color: #8aa79b;">Sistema operativo con modo desarrollador integrado.</p>
          <button class="verdix-secret-btn" onclick="verdixSecret.download('verdix-os-debian.live-image-amd64.hybrid.iso')" style="margin-top: 15px;">
            Descargar ISO
          </button>
        </div>
      </div>
      <div style="margin-top: 30px;">
        <button class="verdix-secret-btn" onclick="verdixSecret.closeSecret()" style="background: rgba(255, 92, 122, 0.1); border: 1px solid rgba(255, 92, 122, 0.3); color: #ff5c7a;">
          Cerrar modo secreto
        </button>
      </div>
    `;

    document.body.appendChild(secretSection);
  }

  // Descargar archivo desde GitHub Releases
  function download(filename) {
    const baseUrl = 'https://github.com/acbal20/verdix-web/releases/download/v1.0.0/';
    window.open(baseUrl + filename, '_blank');
  }

  // Mostrar notificación
  function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 25px;
      background: linear-gradient(120deg, #00ff41, #00cc33);
      color: #03130c;
      border-radius: 10px;
      font-weight: bold;
      z-index: 10000;
      animation: slideIn 0.5s ease, slideOut 0.5s ease 2.5s;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }

  // Función de búsqueda normal (para cuando no se activa el secreto)
  function performNormalSearch(query) {
    // Aquí se podría implementar la búsqueda normal
    console.log('Buscando:', query);
    const statusEl = document.getElementById('search-status');
    if (statusEl) {
      statusEl.style.display = 'block';
      statusEl.textContent = `Buscando: ${query}`;
    }
  }
})();