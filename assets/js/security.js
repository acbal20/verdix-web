/* ============================================================
   VERDIX SECURITY - Protección completa del sitio
   ============================================================ */

const VerdixSecurity = (function () {
  const config = {
    maxInputLength: 5000,
    allowedImageTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    maxImageSize: 5 * 1024 * 1024, // 5MB
    blockedPatterns: [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe\b[^>]*>/gi,
      /<object\b[^>]*>/gi,
      /<embed\b[^>]*>/gi,
      /<link\b[^>]*>/gi,
      /<meta\b[^>]*>/gi,
      /eval\s*\(/gi,
      /document\.cookie/gi,
      /localStorage\s*\(/gi,
      /sessionStorage\s*\(/gi,
      /fetch\s*\(/gi,
      /XMLHttpRequest/gi,
    ],
    rateLimit: {
      maxRequests: 100,
      windowMs: 60000, // 1 minuto
      requests: [],
    },
  };

  // Detectar dispositivo
  function detectDevice() {
    const ua = navigator.userAgent;
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        ua
      );
    const isTablet = /iPad|Tablet|TabletPC/i.test(ua);
    const isDesktop = !isMobile && !isTablet;
    const isMobileChrome = /Chrome.*Mobile/i.test(ua);
    const isSafari = /Version\/.*Safari/i.test(ua) && !/Chrome/i.test(ua);
    const isFirefox = /Firefox/i.test(ua);
    const isChrome = /Chrome/i.test(ua) && !/Edge/i.test(ua);
    const isEdge = /Edge/i.test(ua);

    return {
      isMobile,
      isTablet,
      isDesktop,
      isMobileChrome,
      isSafari,
      isFirefox,
      isChrome,
      isEdge,
      userAgent: ua,
      platform: navigator.platform,
      language: navigator.language,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      colorDepth: screen.colorDepth,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      touchPoints: navigator.maxTouchPoints || 0,
    };
  }

  // Sanitizar entrada de usuario
  function sanitizeInput(input) {
    if (typeof input !== "string") return "";
    if (input.length > config.maxInputLength) {
      input = input.substring(0, config.maxInputLength);
    }

    let sanitized = input;
    config.blockedPatterns.forEach((pattern) => {
      sanitized = sanitized.replace(pattern, "[BLOQUEADO]");
    });

    // Escapar HTML
    sanitized = sanitized
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

    return sanitized;
  }

  // Validar URL
  function isValidUrl(url) {
    try {
      const parsed = new URL(url);
      return (
        parsed.protocol === "https:" ||
        parsed.protocol === "http:" ||
        parsed.protocol === "mailto:"
      );
    } catch (e) {
      return false;
    }
  }

  // Rate limiting
  function checkRateLimit() {
    const now = Date.now();
    config.rateLimit.requests = config.rateLimit.requests.filter(
      (time) => now - time < config.rateLimit.windowMs
    );

    if (config.rateLimit.requests.length >= config.rateLimit.maxRequests) {
      return false;
    }

    config.rateLimit.requests.push(now);
    return true;
  }

  // Detectar intentos de inyección
  function detectInjection(input) {
    const injectionPatterns = [
      /union\s+select/gi,
      /drop\s+table/gi,
      /insert\s+into/gi,
      /delete\s+from/gi,
      /update\s+set/gi,
      /<script/gi,
      /<\/script>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /onload\s*=/gi,
      /onerror\s*=/gi,
      /onclick\s*=/gi,
      /<iframe/gi,
      /<object/gi,
      /<embed/gi,
      /<applet/gi,
      /<form/gi,
      /<input/gi,
    ];

    for (const pattern of injectionPatterns) {
      if (pattern.test(input)) {
        return {
          detected: true,
          pattern: pattern.source,
          severity: "high",
        };
      }
    }

    return { detected: false };
  }

  // Validar archivo de imagen
  function validateImageFile(file) {
    const errors = [];

    if (!config.allowedImageTypes.includes(file.type)) {
      errors.push("Tipo de archivo no permitido");
    }

    if (file.size > config.maxImageSize) {
      errors.push("Archivo demasiado grande (máximo 5MB)");
    }

    if (!file.name.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
      errors.push("Extensión de archivo no válida");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // Reportar evento de seguridad
  function reportSecurityEvent(type, details) {
    const event = {
      type,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      details,
    };

    console.warn("[SECURITY EVENT]", event);

    // Enviar al servidor si está disponible
    try {
      fetch("/api/security/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      }).catch(() => {}); // Silencioso si falla
    } catch (e) {}
  }

  // Inicializar protección
  function init() {
    const device = detectDevice();

    // Aplicar clases al body para estilos adaptativos
    document.body.classList.add(
      device.isMobile ? "device-mobile" : "",
      device.isTablet ? "device-tablet" : "",
      device.isDesktop ? "device-desktop" : "",
      device.isChrome ? "browser-chrome" : "",
      device.isFirefox ? "browser-firefox" : "",
      device.isSafari ? "browser-safari" : "",
      device.isEdge ? "browser-edge" : ""
    );

    // Proteger formularios contra XSS
    document.addEventListener("submit", (e) => {
      if (!checkRateLimit()) {
        e.preventDefault();
        reportSecurityEvent("rate_limit_exceeded", {
          message: "Demasiadas solicitudes",
        });
        alert("Demasiadas solicitudes. Intenta de nuevo más tarde.");
        return false;
      }

      // Sanitizar inputs del formulario
      const inputs = e.target.querySelectorAll("input, textarea");
      inputs.forEach((input) => {
        if (input.value) {
          const injection = detectInjection(input.value);
          if (injection.detected) {
            e.preventDefault();
            reportSecurityEvent("injection_attempt", {
              field: input.name || input.id,
              pattern: injection.pattern,
            });
            alert("Entrada no válida detectada");
            return false;
          }
          input.value = sanitizeInput(input.value);
        }
      });
    });

    // Proteger contra inyección en console
    const originalLog = console.log;
    console.log = function (...args) {
      const msg = args.join(" ");
      const injection = detectInjection(msg);
      if (injection.detected) {
        reportSecurityEvent("console_injection", {
          message: msg.substring(0, 100),
        });
      }
      originalLog.apply(console, args);
    };

    // Proteger contra errores no manejados
    window.addEventListener("error", (e) => {
      reportSecurityEvent("javascript_error", {
        message: e.message,
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
      });
    });

    // Proteger contra promesas no manejadas
    window.addEventListener("unhandledrejection", (e) => {
      reportSecurityEvent("unhandled_promise", {
        reason: String(e.reason),
      });
    });

    return { device, security: true };
  }

  return {
    init,
    detectDevice,
    sanitizeInput,
    isValidUrl,
    checkRateLimit,
    detectInjection,
    validateImageFile,
    reportSecurityEvent,
  };
})();

// Inicializar seguridad al cargar
document.addEventListener("DOMContentLoaded", () => {
  const sec = VerdixSecurity.init();
  console.log(
    `%c[VERDIX SECURITY] Activado - Dispositivo: ${
      sec.device.isMobile ? "Móvil" : sec.device.isTablet ? "Tablet" : "Escritorio"
    } - Navegador: ${sec.device.isChrome ? "Chrome" : sec.device.isFirefox ? "Firefox" : sec.device.isSafari ? "Safari" : "Otro"}`,
    "color: #00ff41; font-weight: bold;"
  );
});

// Exportar para uso global
window.VerdixSecurity = VerdixSecurity;
