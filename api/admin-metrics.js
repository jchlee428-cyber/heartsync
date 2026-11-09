import fs from "fs";

const TMP_TELEMETRY_FILE = "/tmp/heartsync_admin_telemetry.json";
const TMP_DIAG_COUNT_FILE = "/tmp/heartsync_diagnosis_count.json";

function loadTelemetryState() {
  const defaults = {
    aiCalls: 0,
    fallbackCalls: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalLatencyMs: 0,
    errors: [],
    intentCounts: {},
    promptVersionCalls: { "v1.0": 0, "v2.0": 0 },
    promptRatings: {
      "v1.0": { count: 14, ratingSum: 58, positiveTagCount: 11 },
      "v2.0": { count: 8, ratingSum: 39, positiveTagCount: 8 },
    },
    modelCalls: {},
    signupsCount: 0,
    paidOrdersCount: 0,
    totalRevenueKrw: 0,
  };

  try {
    if (fs.existsSync(TMP_TELEMETRY_FILE)) {
      const raw = fs.readFileSync(TMP_TELEMETRY_FILE, "utf8");
      const parsed = JSON.parse(raw);
      return {
        ...defaults,
        ...parsed,
        promptRatings: {
          ...defaults.promptRatings,
          ...(parsed.promptRatings || {}),
        },
      };
    }
  } catch {
    // Ignore /tmp read errors
  }
  return defaults;
}

function saveTelemetryState(state) {
  try {
    fs.writeFileSync(TMP_TELEMETRY_FILE, JSON.stringify(state), "utf8");
  } catch {
    // Ignore /tmp write errors
  }
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  const state = loadTelemetryState();

  if (req.method === "GET") {
    let diagCompleted = 0;
    try {
      if (fs.existsSync(TMP_DIAG_COUNT_FILE)) {
        const d = JSON.parse(fs.readFileSync(TMP_DIAG_COUNT_FILE, "utf8"));
        diagCompleted = Number(d.completedCount) || 0;
      }
    } catch {}

    return res.status(200).json({
      telemetry: state,
      serverlessDiagnosisCompleted: diagCompleted,
      privacyPolicy: "NO_PERSONAL_CONVERSATION_RAW_TEXT_COLLECTED",
    });
  }

  if (req.method === "POST") {
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      const eventType = String(body.eventType || "");

      if (eventType === "error") {
        state.errors = [
          {
            id: `err_${Date.now()}`,
            timestamp: new Date().toISOString(),
            module: String(body.module || "CLIENT").slice(0, 30),
            code: String(body.code || "ERR").slice(0, 20),
            summary: String(body.summary || "Operational error").slice(0, 120),
          },
          ...(state.errors || []),
        ].slice(0, 50);
      } else if (eventType === "prompt_rating") {
        const ver = body.promptVersion === "v1.0" ? "v1.0" : "v2.0";
        const rating = Math.min(5, Math.max(1, Number(body.rating) || 5));
        const hasPositive = Boolean(body.hasPositiveTag);
        state.promptRatings[ver] = state.promptRatings[ver] || {
          count: 0,
          ratingSum: 0,
          positiveTagCount: 0,
        };
        state.promptRatings[ver].count += 1;
        state.promptRatings[ver].ratingSum += rating;
        if (hasPositive) state.promptRatings[ver].positiveTagCount += 1;
      } else if (eventType === "fallback_turn") {
        state.fallbackCalls = (state.fallbackCalls || 0) + 1;
        const intent = String(body.intentType || "communication");
        state.intentCounts = state.intentCounts || {};
        state.intentCounts[intent] = (state.intentCounts[intent] || 0) + 1;
      }

      saveTelemetryState(state);
      return res.status(200).json({ success: true, telemetry: state });
    } catch (err) {
      return res.status(200).json({ success: false });
    }
  }

  return res.status(405).json({ error: "Method Not Allowed" });
}
