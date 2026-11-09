import fs from "fs";

const TMP_TELEMETRY_FILE = "/tmp/heartsync_admin_telemetry.json";

function recordServerlessAiTelemetry(entry) {
  try {
    let state = {
      aiCalls: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalLatencyMs: 0,
      errors: [],
      intentCounts: {},
      promptVersionCalls: { "v1.0": 0, "v2.0": 0 },
      modelCalls: {},
    };
    if (fs.existsSync(TMP_TELEMETRY_FILE)) {
      const raw = fs.readFileSync(TMP_TELEMETRY_FILE, "utf8");
      state = { ...state, ...JSON.parse(raw) };
    }

    if (entry.isError) {
      state.errors = [
        {
          id: `err_${Date.now()}`,
          timestamp: new Date().toISOString(),
          module: "AI_API",
          code: String(entry.statusCode || 500),
          summary: String(entry.errorSummary || "AI upstream error").slice(0, 120),
        },
        ...(state.errors || []),
      ].slice(0, 50);
    } else {
      state.aiCalls = (state.aiCalls || 0) + 1;
      state.promptTokens = (state.promptTokens || 0) + (entry.promptTokens || 0);
      state.completionTokens = (state.completionTokens || 0) + (entry.completionTokens || 0);
      state.totalLatencyMs = (state.totalLatencyMs || 0) + (entry.latencyMs || 0);

      const ver = entry.promptVersion || "v2.0";
      state.promptVersionCalls = state.promptVersionCalls || {};
      state.promptVersionCalls[ver] = (state.promptVersionCalls[ver] || 0) + 1;

      const intent = entry.intentType || "communication";
      state.intentCounts = state.intentCounts || {};
      state.intentCounts[intent] = (state.intentCounts[intent] || 0) + 1;

      const mdl = entry.model || "gpt-4o-mini";
      state.modelCalls = state.modelCalls || {};
      state.modelCalls[mdl] = (state.modelCalls[mdl] || 0) + 1;
    }

    fs.writeFileSync(TMP_TELEMETRY_FILE, JSON.stringify(state), "utf8");
  } catch {
    // Ignore /tmp telemetry write errors
  }
}

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
    recordServerlessAiTelemetry({
      isError: true,
      statusCode: 503,
      errorSummary: "AI_KEY_NOT_CONFIGURED",
    });
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

  const startTime = Date.now();

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const promptVersion = String(body.promptVersion || "v2.0");
    const intentType = String(body.intentType || "communication");

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

    const latencyMs = Date.now() - startTime;

    if (!upstream.ok) {
      const errText = await upstream.text();
      recordServerlessAiTelemetry({
        isError: true,
        statusCode: upstream.status,
        errorSummary: `Upstream ${model} HTTP ${upstream.status}`,
      });
      return res.status(upstream.status).json({ error: errText });
    }

    const data = await upstream.json();
    const content = data?.choices?.[0]?.message?.content || "";

    // Estimate tokens if provider doesn't return usage object
    const promptTokens =
      Number(data?.usage?.prompt_tokens) ||
      Math.max(150, Math.round(JSON.stringify(messages).length / 3.5));
    const completionTokens =
      Number(data?.usage?.completion_tokens) ||
      Math.max(60, Math.round(content.length / 2.5));
    const totalTokens = promptTokens + completionTokens;

    // Privacy-by-Design: Only log non-identifying token & intent telemetry, NEVER message content
    recordServerlessAiTelemetry({
      isError: false,
      model,
      promptVersion,
      intentType,
      promptTokens,
      completionTokens,
      latencyMs,
    });

    return res.status(200).json({
      content,
      model,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens,
        latencyMs,
        promptVersion,
        intentType,
      },
    });
  } catch (err) {
    recordServerlessAiTelemetry({
      isError: true,
      statusCode: 500,
      errorSummary: String(err?.message || "Internal handler error"),
    });
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
