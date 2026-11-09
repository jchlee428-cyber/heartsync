export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const rawKey = (
    process.env.OPENAI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.APP_AI_KEY ||
    process.env.DEEPSEEK_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.VITE_OPENAI_API_KEY ||
    ""
  ).trim();

  if (!rawKey || rawKey.startsWith("mock-")) {
    return res.status(503).json({ error: "AI_KEY_NOT_CONFIGURED" });
  }

  const isGemini =
    Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) ||
    rawKey.startsWith("AIza");
  const isDeepSeek = Boolean(process.env.DEEPSEEK_API_KEY);

  const endpoint = isGemini
    ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
    : isDeepSeek
    ? "https://api.deepseek.com/v1/chat/completions"
    : "https://api.openai.com/v1/chat/completions";

  const model = isGemini
    ? "gemini-2.5-flash"
    : isDeepSeek
    ? "deepseek-chat"
    : "gpt-4o-mini";

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const messages = Array.isArray(body.messages) ? body.messages : [];

    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${rawKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      return res.status(upstream.status).json({ error: errText });
    }

    const data = await upstream.json();
    const content = data?.choices?.[0]?.message?.content || "";
    return res.status(200).json({ content, model });
  } catch (err) {
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
