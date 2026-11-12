import http.server
import socketserver
import json
import os
import re
import html
import urllib.error
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
import base64
import time
import threading
from collections import defaultdict
from pathlib import Path

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PORT = int(os.environ.get("VERDIX_PORT", "8099"))

# ---------------------------------------------------------------------------
# Carga de variables de entorno desde .env
# ---------------------------------------------------------------------------


def _load_env():
    path = os.path.join(BASE_DIR, ".env")
    if not os.path.exists(path):
        return
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


_load_env()

OPENROUTER_KEY = os.environ.get("OPENROUTER_API_KEY", "").strip()
OPENROUTER_MODEL = os.environ.get("OPENROUTER_MODEL", "deepseek/deepseek-chat").strip()
GROQ_KEY = os.environ.get("GROQ_API_KEY", "").strip()
MISTRAL_KEY = os.environ.get("MISTRAL_API_KEY", "").strip()
HF_KEY = os.environ.get("HF_API_KEY", "").strip()
USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
)

# ---------------------------------------------------------------------------
# Límites máximos (configurables vía variables de entorno)
# ---------------------------------------------------------------------------
LIMITE_MENSAJES = int(os.environ.get("LIMITE_MENSAJES", "5000"))          # por usuario
LIMITE_VISION = int(os.environ.get("LIMITE_VISION", "500"))               # por usuario
LIMITE_IMAGENES_DIA = int(os.environ.get("LIMITE_IMAGENES_DIA", "100"))   # por usuario/día
RATE_LIMIT_SEGUNDOS = float(os.environ.get("RATE_LIMIT_SEGUNDOS", "2.0")) # 1 mensaje cada N segundos

ARCHIVO_USO = os.path.join(BASE_DIR, "usage_stats.json")
_uso_lock = threading.Lock()


def _cargar_uso():
    """Carga las estadísticas de uso desde disco."""
    try:
        with open(ARCHIVO_USO, "r", encoding="utf-8") as fh:
            return json.load(fh)
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        return {}


def _guardar_uso(datos):
    """Guarda las estadísticas de uso en disco."""
    tmp = ARCHIVO_USO + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(datos, fh, ensure_ascii=False, indent=2)
    os.replace(tmp, ARCHIVO_USO)


def _ahora_iso():
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _hoy_iso():
    return time.strftime("%Y-%m-%d", time.gmtime())


def _identificar_usuario(handler):
    """Identifica al usuario por header X-User-ID o por IP."""
    uid = handler.headers.get("X-User-ID")
    if uid:
        return "user:" + uid.strip()
    return "ip:" + handler.client_address[0]


def _verificar_limite(uso, usuario, tipo):
    """Verifica si el usuario ha excedido el límite para el tipo dado."""
    hoy = _hoy_iso()
    datos_usuario = uso.get(usuario, {})
    if tipo == "chat":
        contador = datos_usuario.get("chat_count", 0)
        return contador < LIMITE_MENSAJES, contador, LIMITE_MENSAJES
    if tipo == "vision":
        contador = datos_usuario.get("vision_count", 0)
        return contador < LIMITE_VISION, contador, LIMITE_VISION
    if tipo == "image":
        contador_dia = datos_usuario.get("image_count", {}).get(hoy, 0)
        return contador_dia < LIMITE_IMAGENES_DIA, contador_dia, LIMITE_IMAGENES_DIA
    return True, 0, 0


def _incrementar_contador(uso, usuario, tipo):
    """Incrementa el contador de uso del usuario."""
    hoy = _hoy_iso()
    if usuario not in uso:
        uso[usuario] = {}
    datos_usuario = uso[usuario]
    if tipo == "chat":
        datos_usuario["chat_count"] = datos_usuario.get("chat_count", 0) + 1
        datos_usuario["chat_last"] = _ahora_iso()
    elif tipo == "vision":
        datos_usuario["vision_count"] = datos_usuario.get("vision_count", 0) + 1
        datos_usuario["vision_last"] = _ahora_iso()
    elif tipo == "image":
        imagenes = datos_usuario.setdefault("image_count", {})
        imagenes[hoy] = imagenes.get(hoy, 0) + 1
        datos_usuario["image_last"] = _ahora_iso()
    _guardar_uso(uso)


# Rate limiting en memoria (usuario -> último timestamp de petición)
_rate_lock = threading.Lock()
_ultima_peticion = {}


def _verificar_rate_limit(usuario):
    """Devuelve True si el usuario puede hacer una petición ahora."""
    with _rate_lock:
        ahora = time.time()
        ultimo = _ultima_peticion.get(usuario, 0)
        if ahora - ultimo < RATE_LIMIT_SEGUNDOS:
            return False, RATE_LIMIT_SEGUNDOS - (ahora - ultimo)
        _ultima_peticion[usuario] = ahora
        return True, 0.0


# ---------------------------------------------------------------------------
# Utilidades de red
# ---------------------------------------------------------------------------


def fetch(url, timeout=12, headers=None, accept_language="es-ES,es;q=0.9,en;q=0.8"):
    req_headers = {"User-Agent": USER_AGENT, "Accept-Language": accept_language}
    if headers:
        req_headers.update(headers)
    req = urllib.request.Request(url, headers=req_headers)
    with urllib.request.urlopen(req, timeout=timeout) as response:
        charset = response.headers.get_content_charset() or "utf-8"
        return response.read().decode(charset, "replace")


def clean_text(raw):
    if not raw:
        return ""
    text = re.sub(r"<[^>]+>", " ", raw)
    return re.sub(r"\s+", " ", html.unescape(text)).strip()


def openrouter_chat(messages, model=None, temperature=0.7, max_tokens=4096):
    """Llama a OpenRouter chat/completions y devuelve el texto de respuesta."""
    if not OPENROUTER_KEY:
        raise RuntimeError("OPENROUTER_API_KEY no configurada")
    modelo = model or OPENROUTER_MODEL
    payload = {
        "model": modelo,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {OPENROUTER_KEY}",
            "HTTP-Referer": f"http://localhost:{PORT}",
            "X-Title": "Verdix AI",
        },
    )
    with urllib.request.urlopen(req, timeout=90) as response:
        data = json.loads(response.read().decode("utf-8"))
    return data["choices"][0]["message"]["content"]


def openrouter_image_generate(prompt, model="black-forest-labs/flux-schnell"):
    """Genera una imagen vía OpenRouter y devuelve la URL de la imagen."""
    if not OPENROUTER_KEY:
        raise RuntimeError("OPENROUTER_API_KEY no configurada")
    payload = {
        "model": model,
        "prompt": prompt,
        "response_format": "url",
        "size": "1024x1024",
    }
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/images/generations",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {OPENROUTER_KEY}",
            "HTTP-Referer": f"http://localhost:{PORT}",
            "X-Title": "Verdix AI",
        },
    )
    with urllib.request.urlopen(req, timeout=120) as response:
        data = json.loads(response.read().decode("utf-8"))
    # OpenRouter devuelve data[0].url o similar
    try:
        return data["data"][0]["url"]
    except (KeyError, IndexError):
        # Algunos proveedores devuelven directamente la URL
        return data.get("url") or str(data)


# ---------------------------------------------------------------------------
# IA de respaldo: Groq (Llama 3.1 405B)
# ---------------------------------------------------------------------------


def groq_chat(messages, model="llama-3.1-405b-reasoning", temperature=0.7, max_tokens=4096):
    """Llama a Groq chat/completions y devuelve el texto de respuesta."""
    if not GROQ_KEY:
        raise RuntimeError("GROQ_API_KEY no configurada")
    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    req = urllib.request.Request(
        "https://api.groq.com/openai/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {GROQ_KEY}",
            "HTTP-Referer": f"http://localhost:{PORT}",
            "X-Title": "Verdix AI",
        },
    )
    with urllib.request.urlopen(req, timeout=90) as response:
        data = json.loads(response.read().decode("utf-8"))
    return data["choices"][0]["message"]["content"]


# ---------------------------------------------------------------------------
# IA de respaldo: Mistral (Codestral)
# ---------------------------------------------------------------------------


def mistral_chat(messages, model="codestral-latest", temperature=0.7, max_tokens=4096):
    """Llama a Mistral chat/completions y devuelve el texto de respuesta."""
    if not MISTRAL_KEY:
        raise RuntimeError("MISTRAL_API_KEY no configurada")
    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    req = urllib.request.Request(
        "https://api.mistral.ai/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {MISTRAL_KEY}",
            "HTTP-Referer": f"http://localhost:{PORT}",
            "X-Title": "Verdix AI",
        },
    )
    with urllib.request.urlopen(req, timeout=90) as response:
        data = json.loads(response.read().decode("utf-8"))
    return data["choices"][0]["message"]["content"]


# ---------------------------------------------------------------------------
# IA de respaldo: HuggingFace Inference API (Qwen2.5-72B-Instruct)
# ---------------------------------------------------------------------------


def huggingface_chat(messages, model="Qwen/Qwen2.5-72B-Instruct", temperature=0.7, max_tokens=2048):
    """Llama a HuggingFace Inference API y devuelve el texto de respuesta."""
    if not HF_KEY:
        raise RuntimeError("HF_API_KEY no configurada")
    # Convertir mensajes a un solo prompt para HF
    prompt = "\n".join(f"{m.get('role', 'user')}: {m.get('content', '')}" for m in messages)
    payload = {
        "inputs": prompt,
        "parameters": {
            "max_new_tokens": max_tokens,
            "temperature": temperature,
            "return_full_text": False,
        },
    }
    req = urllib.request.Request(
        f"https://api-inference.huggingface.co/models/{model}",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {HF_KEY}",
        },
    )
    with urllib.request.urlopen(req, timeout=90) as response:
        body = response.read().decode("utf-8")
    try:
        obj = json.loads(body)
        if isinstance(obj, list) and len(obj) > 0:
            return obj[0].get("generated_text", str(obj)).strip()
        return str(obj).strip()
    except (json.JSONDecodeError, KeyError, IndexError):
        return body.strip()


# ---------------------------------------------------------------------------
# Generación de imágenes gratis: Pollinations.ai (sin clave API)
# ---------------------------------------------------------------------------


def pollinations_image_generate(prompt, model="flux"):
    """Genera una imagen vía Pollinations.ai (gratis, sin clave)."""
    encoded_prompt = urllib.parse.quote(prompt)
    url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?model={model}&width=1024&height=1024"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=120) as response:
        # Pollinations devuelve la imagen directamente o una URL de redirección
        return response.geturl() or url


# ---------------------------------------------------------------------------
# Web sources (búsqueda)
# ---------------------------------------------------------------------------


def search_wikipedia(query, limit=6):
    url = (
        "https://es.wikipedia.org/w/api.php?action=query&list=search"
        f"&srsearch={urllib.parse.quote(query)}&format=json&srlimit={limit}"
    )
    data = json.loads(fetch(url))
    results = []
    for item in data.get("query", {}).get("search", []):
        title = item.get("title", "")
        results.append(
            {
                "title": title,
                "url": "https://es.wikipedia.org/wiki/" + urllib.parse.quote(title.replace(" ", "_")),
                "description": clean_text(item.get("snippet", "")),
                "source": "Wikipedia",
            }
        )
    return results


def search_duckduckgo(query, limit=10):
    url = "https://html.duckduckgo.com/html/?q=" + urllib.parse.quote(query)
    page = fetch(url)

    anchors = re.findall(
        r'<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)</a>', page, re.S
    )
    snippets = re.findall(r'class="result__snippet"[^>]*>(.*?)</a>', page, re.S)

    results = []
    for index, (href, title) in enumerate(anchors):
        if len(results) >= limit:
            break
        match = re.search(r"uddg=([^&]+)", href)
        target = urllib.parse.unquote(match.group(1)) if match else href
        if not target.startswith(("http://", "https://")):
            continue
        description = clean_text(snippets[index]) if index < len(snippets) else ""
        results.append(
            {
                "title": clean_text(title),
                "url": target,
                "description": description,
                "source": urllib.parse.urlparse(target).hostname or "DuckDuckGo",
            }
        )
    return results


def merge_results(*groups, limit=14):
    merged = []
    seen = set()
    for group in groups:
        for item in group:
            host = urllib.parse.urlparse(item.get("url", "")).netloc.lower()
            key = (item.get("title", "").lower(), host)
            if host in seen or key in seen:
                continue
            seen.add(host)
            seen.add(key)
            merged.append(item)
            if len(merged) >= limit:
                return merged
    return merged


# ---------------------------------------------------------------------------
# Images (búsqueda)
# ---------------------------------------------------------------------------


def search_images(query, limit=20):
    limit = max(1, min(limit, 20))
    url = f"https://api.openverse.org/v1/images/?q={urllib.parse.quote(query)}&page_size={limit}"
    data = json.loads(fetch(url))
    results = []
    for item in data.get("results", []):
        thumb = item.get("thumbnail") or item.get("url")
        license_name = item.get("license", "").upper()
        author = item.get("creator") or "Desconocido"
        description = f"por {author}" + (f" · {license_name}" if license_name else "")
        results.append(
            {
                "title": item.get("title") or "Imagen",
                "url": item.get("foreign_landing_url") or item.get("url"),
                "image": thumb,
                "description": description,
                "source": item.get("source") or "Openverse",
            }
        )
    return results


# ---------------------------------------------------------------------------
# Videos
# ---------------------------------------------------------------------------


def search_videos(query, limit=18):
    url = "https://www.youtube.com/results?search_query=" + urllib.parse.quote(query)
    page = fetch(url)
    match = re.search(r"ytInitialData\s*=\s*(\{.*?\});</script>", page, re.S)
    if not match:
        match = re.search(r"var ytInitialData = (\{.*?\});", page, re.S)
    if not match:
        return []
    data = json.loads(match.group(1))

    videos = []

    def walk(node):
        if isinstance(node, dict):
            if "videoRenderer" in node:
                video = node["videoRenderer"]
                try:
                    title = "".join(r.get("text", "") for r in video["title"]["runs"])
                    author = (
                        video.get("ownerText", {}).get("runs", [{}])[0].get("text", "")
                    )
                    thumbs = video.get("thumbnail", {}).get("thumbnails", [])
                    thumb = thumbs[-1].get("url", "") if thumbs else ""
                    length = video.get("lengthText", {}).get("simpleText", "")
                    views = video.get("viewCountText", {}).get("simpleText", "")
                    videos.append(
                        {
                            "title": title,
                            "url": "https://www.youtube.com/watch?v=" + video["videoId"],
                            "image": thumb,
                            "description": " · ".join(x for x in (author, length, views) if x),
                            "source": "YouTube",
                        }
                    )
                except (KeyError, TypeError):
                    pass
            for value in node.values():
                walk(value)
        elif isinstance(node, list):
            for value in node:
                walk(value)

    walk(data)
    return videos[:limit]


# ---------------------------------------------------------------------------
# News
# ---------------------------------------------------------------------------


def search_news(query, limit=20):
    url = (
        "https://news.google.com/rss/search?q="
        + urllib.parse.quote(query)
        + "&hl=es&gl=ES&ceid=ES:es"
    )
    xml_text = fetch(url)
    root = ET.fromstring(xml_text)
    results = []
    for item in root.iter("item"):
        title = clean_text(item.findtext("title") or "")
        link = (item.findtext("link") or "").strip()
        description = clean_text(item.findtext("description") or "")
        pub = clean_text(item.findtext("pubDate") or "")
        source = item.findtext("source") or "Google News"
        if not title or not link:
            continue
        results.append(
            {
                "title": title,
                "url": link,
                "description": " · ".join(x for x in (source, pub) if x),
                "source": clean_text(source),
            }
        )
        if len(results) >= limit:
            break
    return results


# ---------------------------------------------------------------------------
# Handler
# ---------------------------------------------------------------------------


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def _json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        # CORS para preflight
        if self.path.startswith("/api/"):
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-User-ID")
        self.end_headers()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        ruta = parsed.path

        # ---------------------------------------------------------------
        # /api/chat — Texto con DeepSeek (límite 5000 mensajes)
        # ---------------------------------------------------------------
        if ruta == "/api/chat":
            usuario = _identificar_usuario(self)

            # Rate limiting
            puede, espera = _verificar_rate_limit(usuario)
            if not puede:
                self._json(
                    429,
                    {
                        "error": "Rate limit excedido",
                        "reintentar_en_segundos": round(espera, 1),
                        "mensaje": f"Espera {espera:.1f}s antes de enviar otro mensaje.",
                    },
                )
                return

            # Límite de mensajes
            with _uso_lock:
                uso = _cargar_uso()
                ok, contador, limite = _verificar_limite(uso, usuario, "chat")
                if not ok:
                    self._json(
                        429,
                        {
                            "error": "Límite de mensajes alcanzado",
                            "contador": contador,
                            "limite": limite,
                            "tipo": "chat",
                        },
                    )
                    return

            length = int(self.headers.get("Content-Length", 0))
            try:
                data = json.loads(self.rfile.read(length) or b"{}")
            except json.JSONDecodeError:
                self._json(400, {"error": "JSON inválido"})
                return

            if not OPENROUTER_KEY:
                self._json(
                    503,
                    {
                        "error": "Falta OPENROUTER_API_KEY. Configurala en el archivo .env "
                        "del proyecto para activar Verdix AI."
                    },
                )
                return

            model = (data.get("model") or OPENROUTER_MODEL).strip()
            messages = data.get("messages", [])
            temperature = data.get("temperature", 0.7)
            max_tokens = data.get("max_tokens", 4096)

            payload = {
                "model": model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
            }

            request = urllib.request.Request(
                "https://openrouter.ai/api/v1/chat/completions",
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {OPENROUTER_KEY}",
                    "HTTP-Referer": f"http://localhost:{PORT}",
                    "X-Title": "Verdix AI",
                },
            )

            # Intento 1: OpenRouter (DeepSeek)
            respuesta = None
            error_openrouter = None
            try:
                with urllib.request.urlopen(request, timeout=90) as response:
                    respuesta = json.loads(response.read().decode("utf-8"))
            except urllib.error.HTTPError as exc:
                error_openrouter = f"HTTP {exc.code}: {exc.read().decode('utf-8', 'replace')[:200]}"
            except Exception as exc:  # noqa: BLE001
                error_openrouter = str(exc)

            if respuesta:
                # Éxito con OpenRouter
                with _uso_lock:
                    uso = _cargar_uso()
                    _incrementar_contador(uso, usuario, "chat")
                self._json(200, respuesta)
                return

            # Intento 2: Groq (respaldo si OpenRouter falla)
            if GROQ_KEY:
                try:
                    texto_groq = groq_chat(messages, temperature=temperature, max_tokens=max_tokens)
                    respuesta_groq = {
                        "id": "groq-fallback",
                        "object": "chat.completion",
                        "model": "llama-3.1-405b-reasoning",
                        "choices": [{"index": 0, "message": {"role": "assistant", "content": texto_groq}}],
                    }
                    with _uso_lock:
                        uso = _cargar_uso()
                        _incrementar_contador(uso, usuario, "chat")
                    self._json(200, respuesta_groq)
                    return
                except Exception as exc:  # noqa: BLE001
                    self._json(
                        500,
                        {
                            "error": f"OpenRouter falló: {error_openrouter}. Groq también falló: {str(exc)[:200]}",
                        },
                    )
                    return
            else:
                self._json(
                    500,
                    {
                        "error": f"OpenRouter falló: {error_openrouter}. Groq no está configurado (GROQ_API_KEY faltante).",
                    },
                )
            return

        # ---------------------------------------------------------------
        # /api/vision — Análisis de imagen con Gemini 2.5 Pro (límite 500)
        # ---------------------------------------------------------------
        if ruta == "/api/vision":
            usuario = _identificar_usuario(self)

            puede, espera = _verificar_rate_limit(usuario)
            if not puede:
                self._json(
                    429,
                    {
                        "error": "Rate limit excedido",
                        "reintentar_en_segundos": round(espera, 1),
                    },
                )
                return

            with _uso_lock:
                uso = _cargar_uso()
                ok, contador, limite = _verificar_limite(uso, usuario, "vision")
                if not ok:
                    self._json(
                        429,
                        {
                            "error": "Límite de análisis de imagen alcanzado",
                            "contador": contador,
                            "limite": limite,
                            "tipo": "vision",
                        },
                    )
                    return

            length = int(self.headers.get("Content-Length", 0))
            try:
                data = json.loads(self.rfile.read(length) or b"{}")
            except json.JSONDecodeError:
                self._json(400, {"error": "JSON inválido"})
                return

            if not OPENROUTER_KEY:
                self._json(503, {"error": "Falta OPENROUTER_API_KEY"})
                return

            imagen_b64 = data.get("imagen", "")  # base64 o data URL
            prompt = data.get("prompt", "¿Qué se ve en esta imagen?")
            model = data.get("model", "google/gemini-2.5-pro").strip()

            # Si viene como data URL, extraer solo la parte base64
            if imagen_b64.startswith("data:"):
                imagen_b64 = imagen_b64.split(",", 1)[1] if "," in imagen_b64 else ""

            messages = [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{imagen_b64}"},
                        },
                    ],
                }
            ]

            payload = {
                "model": model,
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 2048,
            }

            request = urllib.request.Request(
                "https://openrouter.ai/api/v1/chat/completions",
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {OPENROUTER_KEY}",
                    "HTTP-Referer": f"http://localhost:{PORT}",
                    "X-Title": "Verdix AI",
                },
            )

            try:
                with urllib.request.urlopen(request, timeout=90) as response:
                    respuesta = json.loads(response.read().decode("utf-8"))
                with _uso_lock:
                    uso = _cargar_uso()
                    _incrementar_contador(uso, usuario, "vision")
                self._json(200, respuesta)
            except urllib.error.HTTPError as exc:
                detail = exc.read().decode("utf-8", "replace")
                try:
                    detail = json.loads(detail)
                except json.JSONDecodeError:
                    pass
                self._json(exc.code, {"error": detail})
            except Exception as exc:  # noqa: BLE001
                self._json(500, {"error": str(exc)})
            return

        # ---------------------------------------------------------------
        # /api/image — Generación de imagen con Flux Schnell (límite 100/día)
        # ---------------------------------------------------------------
        if ruta == "/api/image":
            usuario = _identificar_usuario(self)

            puede, espera = _verificar_rate_limit(usuario)
            if not puede:
                self._json(
                    429,
                    {
                        "error": "Rate limit excedido",
                        "reintentar_en_segundos": round(espera, 1),
                    },
                )
                return

            with _uso_lock:
                uso = _cargar_uso()
                ok, contador, limite = _verificar_limite(uso, usuario, "image")
                if not ok:
                    self._json(
                        429,
                        {
                            "error": "Límite diario de generación de imagen alcanzado",
                            "contador": contador,
                            "limite": limite,
                            "tipo": "image",
                            "fecha": _hoy_iso(),
                        },
                    )
                    return

            length = int(self.headers.get("Content-Length", 0))
            try:
                data = json.loads(self.rfile.read(length) or b"{}")
            except json.JSONDecodeError:
                self._json(400, {"error": "JSON inválido"})
                return

            prompt = data.get("prompt", "")
            if not prompt:
                self._json(400, {"error": "Falta el parámetro prompt"})
                return

            model = data.get("model", "flux").strip()

            try:
                # Intento 1: Pollinations.ai (gratis, sin clave API)
                url_imagen = pollinations_image_generate(prompt, model=model)
                with _uso_lock:
                    uso = _cargar_uso()
                    _incrementar_contador(uso, usuario, "image")
                self._json(
                    200,
                    {
                        "ok": True,
                        "prompt": prompt,
                        "model": model,
                        "url": url_imagen,
                        "fuente": "pollinations.ai",
                    },
                )
                return
            except Exception as exc_poll:  # noqa: BLE001
                # Intento 2: OpenRouter (respaldo)
                if OPENROUTER_KEY:
                    try:
                        url_imagen = openrouter_image_generate(prompt, model=model)
                        with _uso_lock:
                            uso = _cargar_uso()
                            _incrementar_contador(uso, usuario, "image")
                        self._json(
                            200,
                            {
                                "ok": True,
                                "prompt": prompt,
                                "model": model,
                                "url": url_imagen,
                                "fuente": "openrouter",
                            },
                        )
                        return
                    except urllib.error.HTTPError as exc:
                        detail = exc.read().decode("utf-8", "replace")
                        self._json(exc.code, {"error": detail})
                        return
                    except Exception as exc:  # noqa: BLE001
                        self._json(
                            500,
                            {
                                "error": f"Pollinations falló: {str(exc_poll)[:200]}. OpenRouter también falló: {str(exc)[:200]}",
                            },
                        )
                        return
                else:
                    self._json(
                        500,
                        {
                            "error": f"Pollinations falló: {str(exc_poll)[:200]}. OpenRouter no está configurado.",
                        },
                    )
                return

        # ---------------------------------------------------------------
        # Cualquier otra POST -> 404
        # ---------------------------------------------------------------
        self._json(404, {"error": "Ruta no encontrada"})
        return

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)

        if parsed.path == "/api/health":
            self._json(
                200,
                {
                    "status": "ok",
                    "ai_configured": bool(OPENROUTER_KEY),
                    "model": OPENROUTER_MODEL,
                    "limites": {
                        "chat": LIMITE_MENSAJES,
                        "vision": LIMITE_VISION,
                        "imagenes_por_dia": LIMITE_IMAGENES_DIA,
                        "rate_limit_segundos": RATE_LIMIT_SEGUNDOS,
                    },
                },
            )
            return

        if parsed.path == "/api/stats":
            usuario = _identificar_usuario(self)
            with _uso_lock:
                uso = _cargar_uso()
                datos_usuario = uso.get(usuario, {})
            hoy = _hoy_iso()
            self._json(
                200,
                {
                    "usuario": usuario,
                    "chat_count": datos_usuario.get("chat_count", 0),
                    "chat_limite": LIMITE_MENSAJES,
                    "vision_count": datos_usuario.get("vision_count", 0),
                    "vision_limite": LIMITE_VISION,
                    "image_count_hoy": datos_usuario.get("image_count", {}).get(hoy, 0),
                    "image_limite_dia": LIMITE_IMAGENES_DIA,
                },
            )
            return

        if parsed.path == "/api/search":
            params = urllib.parse.parse_qs(parsed.query)
            query = params.get("q", [""])[0].strip()
            kind = params.get("type", ["web"])[0].strip().lower()

            if not query:
                self._json(400, {"error": "Falta el parámetro q"})
                return

            try:
                if kind == "images":
                    results = search_images(query)
                elif kind == "videos":
                    results = search_videos(query)
                elif kind == "news":
                    results = search_news(query)
                else:
                    kind = "web"
                    wikipedia = []
                    duckduckgo = []
                    try:
                        wikipedia = search_wikipedia(query)
                    except Exception as exc:  # noqa: BLE001
                        print("Wikipedia error:", exc)
                    try:
                        duckduckgo = search_duckduckgo(query)
                    except Exception as exc:  # noqa: BLE001
                        print("DuckDuckGo error:", exc)
                    results = merge_results(duckduckgo, wikipedia)
            except Exception as exc:  # noqa: BLE001
                self._json(502, {"error": f"No se pudo completar la búsqueda: {exc}"})
                return

            self._json(200, {"query": query, "type": kind, "results": results})
            return

        return super().do_GET()

    def end_headers(self):
        # Headers de seguridad para todas las respuestas
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "same-origin")
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "img-src 'self' data: https:; "
            "connect-src 'self' https://openrouter.ai https://es.wikipedia.org "
            "https://html.duckduckgo.com https://api.openverse.org "
            "https://www.youtube.com https://news.google.com "
            "https://api.groq.com https://generativelanguage.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com;",
        )
        # CORS restrictivo solo para rutas de la API
        if self.path.startswith("/api/"):
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-User-ID")
        super().end_headers()

    def list_directory(self, path):
        # Desactivar listado de directorios: devolver 403 Forbidden
        self.send_response(403)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.end_headers()
        self.wfile.write(b"Listado de directorios desactivado por seguridad.\n")
        return None


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True


if __name__ == "__main__":
    with Server(("", PORT), Handler) as httpd:
        print(f"✅ Verdix corriendo en http://localhost:{PORT}")
        print(f"   Buscador: /api/search | IA: {OPENROUTER_MODEL}")
        print(f"   Límites: chat={LIMITE_MENSAJES}, vision={LIMITE_VISION}, imagenes/dia={LIMITE_IMAGENES_DIA}")
        print(f"   Rate limit: 1 mensaje cada {RATE_LIMIT_SEGUNDOS}s")
        if not OPENROUTER_KEY:
            print("⚠️  OPENROUTER_API_KEY no configurada (Verdix AI desactivada).")
        httpd.serve_forever()
