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

      const mdl = entry.model || "gemini-4-hydrogen";
      state.modelCalls = state.modelCalls || {};
      state.modelCalls[mdl] = (state.modelCalls[mdl] || 0) + 1;
    }

    fs.writeFileSync(TMP_TELEMETRY_FILE, JSON.stringify(state), "utf8");
  } catch {
    // Ignore /tmp telemetry write errors
  }
}

function isGeminiKeyFormat(key) {
  return Boolean(key) && (key.startsWith("AIza") || key.startsWith("AQ."));
}

/**
 * Builds ordered AI provider failover chain:
 * 1st Priority: Google Gemini (`gemini-4-hydrogen` or GEMINI_MODEL)
 * 2nd Priority: OpenAI Automatic Backup (`gpt-4o-mini` or OPENAI_MODEL)
 * 3rd Priority: DeepSeek (`deepseek-chat`)
 */
function buildProviderChain() {
  const providers = [];
  const seenKeys = new Set();

  const appAiKey = String(process.env.APP_AI_KEY || "").trim();

  const geminiCandidates = [
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY,
    process.env.VITE_GEMINI_API_KEY,
    isGeminiKeyFormat(appAiKey) ? appAiKey : "",
  ]
    .map((v) => String(v || "").trim())
    .filter((k) => k && !k.startsWith("mock-"));

  for (const gemKey of geminiCandidates) {
    if (seenKeys.has(gemKey)) continue;
    seenKeys.add(gemKey);
    providers.push({
      provider: "gemini",
      apiKey: gemKey,
      endpoint: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      model: String(process.env.GEMINI_MODEL || process.env.APP_AI_MODEL || "gemini-4-hydrogen").trim(),
    });
  }

  const openaiCandidates = [
    process.env.OPENAI_API_KEY,
    process.env.VITE_OPENAI_API_KEY,
    !isGeminiKeyFormat(appAiKey) ? appAiKey : "",
  ]
    .map((v) => String(v || "").trim())
    .filter((k) => k && !k.startsWith("mock-"));

  for (const oaKey of openaiCandidates) {
    if (seenKeys.has(oaKey)) continue;
    seenKeys.add(oaKey);
    providers.push({
      provider: "openai",
      apiKey: oaKey,
      endpoint: "https://api.openai.com/v1/chat/completions",
      model: String(process.env.OPENAI_MODEL || "gpt-4o-mini").trim(),
    });
  }

  const deepseekKey = String(process.env.DEEPSEEK_API_KEY || "").trim();
  if (deepseekKey && !deepseekKey.startsWith("mock-") && !seenKeys.has(deepseekKey)) {
    seenKeys.add(deepseekKey);
    providers.push({
      provider: "deepseek",
      apiKey: deepseekKey,
      endpoint: "https://api.deepseek.com/v1/chat/completions",
      model: "deepseek-chat",
    });
  }

  return providers;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const providers = buildProviderChain();
  if (providers.length === 0) {
    recordServerlessAiTelemetry({
      isError: true,
      statusCode: 503,
      errorSummary: "AI_KEY_NOT_CONFIGURED",
    });
    return res.status(503).json({ error: "AI_KEY_NOT_CONFIGURED" });
  }

  let body = {};
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
  } catch {
    body = {};
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  const promptVersion = String(body.promptVersion || "v2.0");
  const intentType = String(body.intentType || "communication");

  let lastStatus = 502;
  let lastErrorText = "All configured AI providers failed";

  for (const candidate of providers) {
    const startTime = Date.now();
    try {
      const upstream = await fetch(candidate.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${candidate.apiKey}`,
        },
        body: JSON.stringify({
          model: candidate.model,
          messages,
          temperature: 0.7,
        }),
      });

      const latencyMs = Date.now() - startTime;

      if (!upstream.ok) {
        const errText = await upstream.text();
        lastStatus = upstream.status;
        lastErrorText = errText;
        recordServerlessAiTelemetry({
          isError: true,
          statusCode: upstream.status,
          errorSummary: `Upstream ${candidate.model} HTTP ${upstream.status} (failover)`,
        });
        continue;
      }

      const data = await upstream.json();
      const content = data?.choices?.[0]?.message?.content || "";
      if (!content.trim()) {
        lastErrorText = `Empty response from ${candidate.model}`;
        continue;
      }

      const promptTokens =
        Number(data?.usage?.prompt_tokens) ||
        Math.max(150, Math.round(JSON.stringify(messages).length / 3.5));
      const completionTokens =
        Number(data?.usage?.completion_tokens) ||
        Math.max(60, Math.round(content.length / 2.5));
      const totalTokens = promptTokens + completionTokens;

      recordServerlessAiTelemetry({
        isError: false,
        model: candidate.model,
        promptVersion,
        intentType,
        promptTokens,
        completionTokens,
        latencyMs,
      });

      return res.status(200).json({
        content,
        model: candidate.model,
        provider: candidate.provider,
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
      lastStatus = 500;
      lastErrorText = String(err?.message || err);
      recordServerlessAiTelemetry({
        isError: true,
        statusCode: 500,
        errorSummary: `${candidate.model} error: ${lastErrorText}`,
      });
    }
  }

  return res.status(lastStatus).json({ error: lastErrorText });
}
