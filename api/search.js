export default async function handler(request, response) {
  if (request.method !== "GET") {
    return response.status(405).json({ error: "Method Not Allowed" });
  }

  const { q } = request.query;

  if (!q || typeof q !== "string") {
    return response.status(400).json({ error: "Falta el parámetro q" });
  }

  const query = q.trim();
  const type = request.query.type || "web";
  const braveApiKey = process.env.BRAVE_API_KEY;

  try {
    let results = [];

    if (braveApiKey) {
      results = await searchBrave(query, braveApiKey);
    }

    if (!results.length) {
      results = getFallbackResults(query, type);
    }

    return response.status(200).json({
      query,
      type,
      results,
      count: results.length,
      fallback: !braveApiKey
    });
  } catch (error) {
    const fallback = getFallbackResults(query, type);
    return response.status(200).json({
      query,
      type,
      results: fallback,
      count: fallback.length,
      fallback: true,
      error: error.message
    });
  }
}

async function searchBrave(query, apiKey) {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=10&search_lang=es`;
  const res = await fetch(url, {
    headers: {
      "Accept": "application/json",
      "X-Subscription-Token": apiKey,
      "User-Agent": "Verdix Search/1.0"
    }
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Brave API error: ${res.status} ${error}`);
  }

  const data = await res.json();
  return (data.web?.results || []).map(item => ({
    title: item.title,
    url: item.url,
    snippet: item.description || "",
    source: new URL(item.url).hostname.replace(/^www\./, "")
  }));
}

function getFallbackResults(query, type) {
  const encoded = encodeURIComponent(query);
  const targets = {
    web: [
      { title: "Buscar en Google", snippet: "Buscar resultados en Google", url: `https://www.google.com/search?q=${encoded}`, source: "google.com" },
      { title: "Buscar en DuckDuckGo", snippet: "Motor de búsqueda privado", url: `https://duckduckgo.com/?q=${encoded}`, source: "duckduckgo.com" },
      { title: "Buscar en Wikipedia", snippet: "Enciclopedia libre", url: `https://es.wikipedia.org/w/index.php?search=${encoded}`, source: "wikipedia.org" }
    ],
    images: [
      { title: "Google Imágenes", snippet: "Buscar imágenes en Google", url: `https://www.google.com/search?tbm=isch&q=${encoded}`, source: "google.com" },
      { title: "DuckDuckGo Imágenes", snippet: "Buscar imágenes privadas", url: `https://duckduckgo.com/?q=${encoded}&iax=images&ia=images`, source: "duckduckgo.com" }
    ],
    videos: [
      { title: "YouTube", snippet: "Buscar videos en YouTube", url: `https://www.youtube.com/results?search_query=${encoded}`, source: "youtube.com" },
      { title: "DuckDuckGo Videos", snippet: "Buscar videos privados", url: `https://duckduckgo.com/?q=${encoded}&iax=videos&ia=videos`, source: "duckduckgo.com" }
    ],
    news: [
      { title: "Google Noticias", snippet: "Noticias recientes", url: `https://news.google.com/search?q=${encoded}&hl=es`, source: "google.com" },
      { title: "DuckDuckGo Noticias", snippet: "Noticias privadas", url: `https://duckduckgo.com/?q=${encoded}&iar=news&ia=news`, source: "duckduckgo.com" }
    ]
  };

  return targets[type] || targets.web;
}
