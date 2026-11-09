# AUDITORIA_SEGURIDAD.md — verdix-web-deploy/server.py

Fecha: 2026-11-09
Archivo auditado: ~/verdix-web-deploy/server.py
Auditor: OpenCode (VERDIX MASTER)

## Resultado general: CORRECTO CON ADVERTENCIAS

## 1. Secretos hardcodeados: CORRECTO

No se encontraron claves API, contraseñas, tokens ni secretos hardcodeados en el código.

Las referencias a `OPENROUTER_API_KEY` en el código son únicamente:
- Línea 267: mensaje de error cuando falta la clave (lee de variable de entorno)
- Línea 396: mensaje informativo en consola (lee de variable de entorno)

La clave se lee únicamente desde el archivo `.env` y variables de entorno mediante `_load_env()` y `os.environ.get()`. Nunca está escrita en el código fuente.

## 2. CORS (Cross-Origin Resource Sharing): CORRECTO CON ADVERTENCIAS

El encabezado `Access-Control-Allow-Origin` se configura únicamente para rutas que comienzan con `/api/` (líneas 374-377):

```python
if self.path.startswith("/api/"):
    self.send_header("Access-Control-Allow-Origin", "*")
    self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
```

**Advertencia:** CORS usa `*` (origen wildcard) para las rutas de API. Esto permite peticiones desde cualquier origen. Para producción, se recomienda restringir a dominios específicos.

## 3. Listado de directorios: CORRECTO

El método `list_directory` está sobrescrito para devolver `403 Forbidden` (líneas 380-382):

```python
def list_directory(self, path):
    # Desactivar listado de directorios: devolver 403 Forbidden
    self.send_response(403)
    self.send_header("Content-Type", "text/plain; charset=utf-8")
    self.end_headers()
    self.wfile.write(b"Listado de directorios desactivado por seguridad.\n")
    return None
```

Esto evita que se exponga la estructura de archivos del servidor.

## 4. Otros hallazgos

- El servidor carga variables de entorno desde `.env` mediante `_load_env()` (línea 29 del código original).
- El endpoint `/api/health` reporta correctamente si `ai_configured` es true/false.
- No se encontraron comandos peligrosos ni ejecución de shell en el código.

## Recomendaciones

1. Reemplazar `Access-Control-Allow-Origin: *` por dominios específicos en producción.
2. Agregar rate limiting a `/api/chat` y `/api/search` para prevenir abuso.
3. Agregar headers de seguridad adicionales (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Content-Security-Policy) — ya implementados en versión previa del servidor.

## Clasificación

| Área | Resultado |
|------|-----------|
| Secretos hardcodeados | CORRECTO |
| CORS | CORRECTO CON ADVERTENCIAS |
| Listado de directorios | CORRECTO |
| **General** | **CORRECTO CON ADVERTENCIAS** |
