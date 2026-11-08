/* ============================================================
   VERDIX DEVICE ADAPTER
   Detecta automáticamente el tipo de dispositivo y aplica
   clases al body para estilos adaptativos.
   ============================================================ */

const VerdixDevice = (function () {
  let deviceInfo = {};

  function detect() {
    const ua = navigator.userAgent || navigator.vendor || window.opera;

    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        ua
      ) || navigator.maxTouchPoints > 0;

    const isTablet = /iPad|Tablet|TabletPC/i.test(ua);
    const isDesktop = !isMobile && !isTablet;

    const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    const isAndroid = /Android/i.test(ua);
    const isChrome = /Chrome/i.test(ua) && !/Edge/i.test(ua);
    const isFirefox = /Firefox/i.test(ua);
    const isSafari = /Version\/.*Safari/i.test(ua) && !/Chrome/i.test(ua);
    const isEdge = /Edge/i.test(ua);

    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const touchPoints = navigator.maxTouchPoints || 0;
    const isPWA = window.matchMedia("(display-mode: standalone)").matches;

    deviceInfo = {
      isMobile,
      isTablet,
      isDesktop,
      isIOS,
      isAndroid,
      isChrome,
      isFirefox,
      isSafari,
      isEdge,
      isPWA,
      userAgent: ua,
      platform: navigator.platform,
      language: navigator.language || navigator.userLanguage,
      screenWidth: screenW,
      screenHeight: screenH,
      colorDepth: screen.colorDepth || 0,
      cookieEnabled: navigator.cookieEnabled || false,
      onLine: navigator.onLine,
      touchPoints,
      orientation:
        screenW > screenH ? "landscape" : "portrait",
    };

    // Aplicar clases al body
    const body = document.body;

    // Limpiar clases previas de dispositivo
    body.classList.remove(
      "device-mobile",
      "device-tablet",
      "device-desktop",
      "device-ios",
      "device-android",
      "browser-chrome",
      "browser-firefox",
      "browser-safari",
      "browser-edge",
      "device-portrait",
      "device-landscape",
      "pwa-installed"
    );

    // Aplicar nuevas clases
    if (deviceInfo.isMobile) body.classList.add("device-mobile");
    if (deviceInfo.isTablet) body.classList.add("device-tablet");
    if (deviceInfo.isDesktop) body.classList.add("device-desktop");
    if (deviceInfo.isIOS) body.classList.add("device-ios");
    if (deviceInfo.isAndroid) body.classList.add("device-android");
    if (deviceInfo.isChrome) body.classList.add("browser-chrome");
    if (deviceInfo.isFirefox) body.classList.add("browser-firefox");
    if (deviceInfo.isSafari) body.classList.add("browser-safari");
    if (deviceInfo.isEdge) body.classList.add("browser-edge");
    if (deviceInfo.orientation === "portrait") body.classList.add("device-portrait");
    if (deviceInfo.orientation === "landscape") body.classList.add("device-landscape");
    if (deviceInfo.isPWA) body.classList.add("pwa-installed");

    // Ajustar viewport para móvil
    if (deviceInfo.isMobile || deviceInfo.isTablet) {
      const metaViewport = document.querySelector('meta[name="viewport"]');
      if (metaViewport) {
        metaViewport.setAttribute(
          "content",
          "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
        );
      }
    }

    return deviceInfo;
  }

  function getInfo() {
    return deviceInfo;
  }

  function isMobile() {
    return deviceInfo.isMobile || false;
  }

  function isDesktop() {
    return deviceInfo.isDesktop || false;
  }

  function isTablet() {
    return deviceInfo.isTablet || false;
  }

  function getScreenSize() {
    return {
      width: deviceInfo.screenWidth || window.innerWidth,
      height: deviceInfo.screenHeight || window.innerHeight,
    };
  }

  // Re-detectar al cambiar orientación
  window.addEventListener("orientationchange", () => {
    setTimeout(detect, 100);
  });

  // Auto-detectar al cargar
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", detect);
  } else {
    detect();
  }

  return {
    detect,
    getInfo,
    isMobile,
    isDesktop,
    isTablet,
    getScreenSize,
  };
})();

// Exportar global
window.VerdixDevice = VerdixDevice;
