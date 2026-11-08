/* ============================================================
   VERDIX SECURITY AUDIT
   Auditoría completa de seguridad del sitio web
   Detecta vulnerabilidades y las reporta
   ============================================================ */

const VerdixSecurityAudit = (function () {
  const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    issues: [],
  };

  /* ---------- Utilidades ---------- */
  function log(level, message, details = "") {
    const entry = { level, message, details, time: new Date().toISOString() };
    results.issues.push(entry);
    if (level === "pass") results.passed++;
    if (level === "fail") results.failed++;
    if (level === "warn") results.warnings++;
    console[level === "fail" ? "error" : level === "warn" ? "warn" : "log"](
      `[${level.toUpperCase()}] ${message}`,
      details ? details : ""
    );
  }

  /* ---------- Verificaciones ---------- */

  // 1. Verificar HTTPS
  function checkHTTPS() {
    if (location.protocol === "https:") {
      log("pass", "Conexión HTTPS segura detectada");
    } else if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
      log("warn", "Conexión HTTP en localhost (aceptable para desarrollo)");
    } else {
      log("fail", "Sitio servido sobre HTTP sin encriptación");
    }
  }

  // 2. Verificar Content Security Policy (CSP)
  function checkCSP() {
    const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    const headers = document.querySelectorAll('meta[http-equiv]');
    let hasCSP = false;

    for (const h of headers) {
      if (h.httpEquiv && h.httpEquiv.toLowerCase() === "content-security-policy") {
        hasCSP = true;
        break;
      }
    }

    if (hasCSP) {
      log("pass", "CSP (Content Security Policy) configurado");
    } else {
      log("fail", "Falta política CSP - vulnerable a XSS e inyección de recursos");
    }
  }

  // 3. Verificar X-Frame-Options (clickjacking)
  function checkXFrameOptions() {
    const headers = document.querySelectorAll('meta[http-equiv="X-Frame-Options"]');
    if (headers.length > 0) {
      log("pass", "X-Frame-Options configurado - protección contra clickjacking");
    } else {
      log("warn", "Falta X-Frame-Options - posible clickjacking");
    }
  }

  // 4. Verificar X-Content-Type-Options
  function checkContentTypeOptions() {
    const headers = document.querySelectorAll('meta[http-equiv="X-Content-Type-Options"]');
    if (headers.length > 0) {
      log("pass", "X-Content-Type-Options configurado");
    } else {
      log("warn", "Falta X-Content-Type-Options - posible MIME sniffing");
    }
  }

  // 5. Verificar Referrer-Policy
  function checkReferrerPolicy() {
    const meta = document.querySelector('meta[name="referrer"]');
    if (meta) {
      log("pass", "Referrer-Policy configurado");
    } else {
      log("warn", "Falta Referrer-Policy - posible fuga de información");
    }
  }

  // 6. Verificar cookies seguras
  function checkCookies() {
    const cookies = document.cookie.split(";");
    let secureCount = 0;
    let httpOnlyCount = 0;

    for (const c of cookies) {
      const trim = c.trim();
      if (trim.includes("Secure")) secureCount++;
      if (trim.includes("HttpOnly")) httpOnlyCount++;
    }

    if (secureCount > 0 && httpOnlyCount > 0) {
      log("pass", "Cookies con Secure y HttpOnly configuradas");
    } else if (cookies.length === 0) {
      log("pass", "No hay cookies configuradas");
    } else {
      log("warn", "Algunas cookies no tienen Secure/HttpOnly");
    }
  }

  // 7. Verificar formularios sin protección CSRF
  function checkCSRF() {
    const forms = document.querySelectorAll("form");
    let protectedForms = 0;

    for (const form of forms) {
      const token = form.querySelector('input[name="csrf_token"], input[name="csrf"], input[name="_token"]');
      if (token) protectedForms++;
    }

    if (forms.length === 0) {
      log("pass", "No hay formularios detectados");
    } else if (protectedForms === forms.length) {
      log("pass", "Todos los formularios tienen protección CSRF");
    } else {
      log("warn", `${forms.length - protectedForms} formulario(s) sin protección CSRF`);
    }
  }

  // 8. Verificar errores de consola expuestos
  function checkConsoleErrors() {
    // No podemos leer errores pasados, pero verificamos si hay console.log expuestos
    const scripts = document.querySelectorAll("script");
    let inlineScripts = 0;

    for (const s of scripts) {
      if (!s.src && s.innerHTML.includes("console.log")) {
        inlineScripts++;
      }
    }

    if (inlineScripts > 5) {
      log("warn", "Múltiples console.log en línea - posible información sensible expuesta");
    } else {
      log("pass", "Consola limpia");
    }
  }

  // 9. Verificar inputs sin sanitización (búsqueda de campos sensibles)
  function checkInputSanitization() {
    const inputs = document.querySelectorAll("input[type=password], input[type=email], input[type=text]");
    let protectedInputs = 0;

    for (const input of inputs) {
      if (input.hasAttribute("maxlength") || input.hasAttribute("pattern")) {
        protectedInputs++;
      }
    }

    if (inputs.length === 0) {
      log("pass", "No hay campos de entrada sensibles");
    } else if (protectedInputs === inputs.length) {
      log("pass", "Todos los inputs tienen validación");
    } else {
      log("warn", `${inputs.length - protectedInputs} input(s) sin validación`);
    }
  }

  // 10. Verificar enlaces externos
  function checkExternalLinks() {
    const links = document.querySelectorAll("a[href^='http']");
    let unsafe = 0;

    for (const link of links) {
      if (!link.rel || !link.rel.includes("noopener")) {
        unsafe++;
      }
    }

    if (unsafe === 0) {
      log("pass", "Todos los enlaces externos tienen rel='noopener'");
    } else {
      log("warn", `${unsafe} enlace(s) externos sin rel='noopener'`);
    }
  }

  // 11. Verificar service worker (PWA seguro)
  function checkServiceWorker() {
    if ("serviceWorker" in navigator) {
      log("pass", "Service Worker disponible (PWA)");
    } else {
      log("warn", "Service Worker no soportado");
    }
  }

  // 12. Verificar errores de mixed content
  function checkMixedContent() {
    const images = document.querySelectorAll("img[src^='http://']");
    const scripts = document.querySelectorAll("script[src^='http://']");
    const links = document.querySelectorAll("link[href^='http://']");

    const mixed = images.length + scripts.length + links.length;

    if (mixed === 0) {
      log("pass", "No hay contenido mixto (HTTP sobre HTTPS)");
    } else {
      log("fail", `${mixed} recurso(s) cargados por HTTP en sitio HTTPS`);
    }
  }

  /* ---------- Ejecutar auditoría ---------- */
  function runAudit() {
    console.log("%c[VERDIX SECURITY AUDIT] Iniciando auditoría...", "color: #00ff41; font-weight: bold;");

    checkHTTPS();
    checkCSP();
    checkXFrameOptions();
    checkContentTypeOptions();
    checkReferrerPolicy();
    checkCookies();
    checkCSRF();
    checkConsoleErrors();
    checkInputSanitization();
    checkExternalLinks();
    checkServiceWorker();
    checkMixedContent();

    // Mostrar resumen
    console.log(
      `%c[VERDIX SECURITY] Resultados: ${results.passed} aprobadas, ${results.warnings} advertencias, ${results.failed} fallos`,
      "color: #00ff41; font-weight: bold;"
    );

    return results;
  }

  /* ---------- Auto-ejecutar ---------- */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runAudit);
  } else {
    runAudit();
  }

  return {
    runAudit,
    getResults: () => results,
    checkHTTPS,
    checkCSP,
    checkInjection: (input) => {
      const patterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /eval\s*\(/gi,
        /union\s+select/gi,
        /drop\s+table/gi,
      ];
      for (const p of patterns) {
        if (p.test(input)) return true;
      }
      return false;
    },
  };
})();

// Exportar global
window.VerdixSecurityAudit = VerdixSecurityAudit;
