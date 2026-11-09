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

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PORT = int(os.environ.get("VERDIX_PORT", "8099"))


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
OPENROUTER_MODEL = os.environ.get("OPENROUTER_MODEL", "deepseek/deepseek-v4.1-flash-1017").strip()
USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
)


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


# ----------------------------- Web sources -----------------------------


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


# ----------------------------- Images -----------------------------


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


# ----------------------------- Videos -----------------------------


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


# ----------------------------- News -----------------------------


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


# ----------------------------- Handler -----------------------------


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
        self.end_headers()

    def do_POST(self):
        if self.path != "/api/chat":
            self._json(404, {"error": "Ruta no encontrada"})
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
        payload = {
            "model": model,
            "messages": data.get("messages", []),
        }
        if data.get("temperature") is not None:
            payload["temperature"] = data["temperature"]

        request = urllib.request.Request(
            "https://openrouter.ai/api/v1/chat/completions",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {OPENROUTER_KEY}",
                "HTTP-Referer": "http://localhost:%d" % PORT,
                "X-Title": "Verdix AI",
            },
        )

        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                self._json(200, json.loads(response.read().decode("utf-8")))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", "replace")
            try:
                detail = json.loads(detail)
            except json.JSONDecodeError:
                pass
            self._json(exc.code, {"error": detail})
        except Exception as exc:  # noqa: BLE001
            self._json(500, {"error": str(exc)})

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)

        if parsed.path == "/api/health":
            self._json(
                200,
                {
                    "status": "ok",
                    "ai_configured": bool(OPENROUTER_KEY),
                    "model": OPENROUTER_MODEL,
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
            "https://www.youtube.com https://news.google.com; "
            "font-src 'self' https://fonts.gstatic.com;",
        )
        # CORS restrictivo solo para rutas de la API
        if self.path.startswith("/api/"):
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
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
        if not OPENROUTER_KEY:
            print("⚠️  OPENROUTER_API_KEY no configurada (Verdix AI desactivada).")
        httpd.serve_forever()
