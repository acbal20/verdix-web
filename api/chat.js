/* ============================================================
   VERDIX AI — API Chat con generación de imágenes y sesión
   ============================================================ */

export default async function handler(request, response) {
    if (request.method !== "POST") {
        return response.status(405).json({ error: "Method Not Allowed" });
    }

    const API_KEY = process.env.OPENROUTER_API_KEY;
    if (!API_KEY) {
        return response.status(500).json({ error: "Falta la clave de OpenRouter en Vercel." });
    }

    try {
        const body = request.body;
        let messages;

        if (body.message) {
            messages = [{ role: "user", content: body.message }];
        } else if (body.messages && Array.isArray(body.messages)) {
            messages = body.messages;
        } else {
            return response.status(400).json({ error: "Falta el mensaje." });
        }

        const wantsImage = body.image === true || /generar (una )?imagen|crear (una )?imagen|dibuja|image of/i.test(messages[messages.length - 1].content || "");

        // Asegurar system prompt al inicio si no existe
        const hasSystem = messages.some(m => m.role === "system");
        if (!hasSystem) {
            messages.unshift({
                role: "system",
                content:
                  "Eres Verdix AI, un asistente amable, claro, inteligente y útil. Respondes en el idioma del usuario, de forma concisa y precisa. Puedes ayudar con programación, preguntas generales, creatividad, soporte del ecosistema Verdix (Browser, Search, OS), generar imágenes y ejecutar comandos del sistema operativo. Siempre mantén un tono profesional pero cercano.",
            });
        }

        const PRIMARY_MODEL = "nvidia/nemotron-3-ultra-550b-a55b:free";
        const FALLBACK_MODEL = "qwen/qwen3-coder:free";

        async function callOpenRouter(model) {
            const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${API_KEY}`,
                    "HTTP-Referer": "https://verdix-oficial.vercel.app",
                    "X-Title": "Verdix AI"
                },
                body: JSON.stringify({
                    model: model,
                    messages: messages,
                    max_tokens: 2048,
                    temperature: 0.7
                })
            });
            const data = await res.json();
            return { ok: res.ok, status: res.status, data };
        }

        let result = await callOpenRouter(PRIMARY_MODEL);

        if (!result.ok || !result.data.choices?.[0]?.message?.content) {
            result = await callOpenRouter(FALLBACK_MODEL);
        }

        if (!result.ok) {
            return response.status(result.status).json({
                error: result.data.error?.message || "Error de OpenRouter",
                fallback: true
            });
        }

        const content = result.data.choices?.[0]?.message?.content;
        if (!content) {
            return response.status(502).json({
                error: "El modelo devolvió una respuesta vacía. Probá de nuevo.",
                fallback: true
            });
        }

        let imageUrl = null;
        if (wantsImage) {
            // Generar imagen usando Pollinations (gratis, sin clave)
            const prompt = encodeURIComponent(content);
            imageUrl = `https://image.pollinations.ai/prompt/${prompt}?width=1024&height=1024&nologo=true`;
        }

        return response.status(200).json({
            reply: content.trim(),
            model: result.data.model || PRIMARY_MODEL,
            usage: result.data.usage || null,
            imageUrl: imageUrl
        });

    } catch (error) {
        return response.status(500).json({
            error: "Error interno del servidor",
            message: error.message
        });
    }
}
