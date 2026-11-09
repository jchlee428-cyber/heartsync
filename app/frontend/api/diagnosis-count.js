import fs from "fs";

const BASE_COUNT = 10000;
const TMP_FILE = "/tmp/heartsync_diagnosis_count.json";

let memoryCompletedCount = 0;
const memoryIds = new Set();

function loadPersistedState() {
  try {
    if (fs.existsSync(TMP_FILE)) {
      const raw = fs.readFileSync(TMP_FILE, "utf8");
      const data = JSON.parse(raw);
      if (typeof data.completedCount === "number" && data.completedCount > memoryCompletedCount) {
        memoryCompletedCount = data.completedCount;
      }
      if (Array.isArray(data.ids)) {
        data.ids.forEach((id) => memoryIds.add(String(id)));
      }
    }
  } catch {
    // Ignore /tmp read errors
  }
}

function savePersistedState() {
  try {
    fs.writeFileSync(
      TMP_FILE,
      JSON.stringify({
        completedCount: memoryCompletedCount,
        ids: Array.from(memoryIds).slice(-500),
        updatedAt: new Date().toISOString(),
      }),
      "utf8"
    );
  } catch {
    // Ignore /tmp write errors
  }
}

export default async function handler(req, res) {
  loadPersistedState();

  res.setHeader("Cache-Control", "no-store, max-age=0");

  if (req.method === "GET") {
    const clientCountRaw = parseInt(String(req.query?.clientCount || "0"), 10);
    if (Number.isFinite(clientCountRaw) && clientCountRaw > memoryCompletedCount && clientCountRaw < 100000) {
      memoryCompletedCount = clientCountRaw;
      savePersistedState();
    }

    const completedCount = Math.max(memoryCompletedCount, memoryIds.size);
    return res.status(200).json({
      baseCount: BASE_COUNT,
      completedCount,
      totalCount: BASE_COUNT + completedCount,
    });
  }

  if (req.method === "POST") {
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      const diagnosisId = body.diagnosisId ? String(body.diagnosisId) : `diag_${Date.now()}`;
      const clientCompleted = parseInt(String(body.clientCompletedCount || "0"), 10);

      const isNew = !memoryIds.has(diagnosisId);
      memoryIds.add(diagnosisId);

      if (isNew) {
        memoryCompletedCount = Math.max(memoryCompletedCount + 1, memoryIds.size);
      }
      if (Number.isFinite(clientCompleted) && clientCompleted > memoryCompletedCount && clientCompleted < 100000) {
        memoryCompletedCount = clientCompleted;
      }

      savePersistedState();

      return res.status(200).json({
        baseCount: BASE_COUNT,
        completedCount: memoryCompletedCount,
        totalCount: BASE_COUNT + memoryCompletedCount,
      });
    } catch (err) {
      return res.status(200).json({
        baseCount: BASE_COUNT,
        completedCount: memoryCompletedCount,
        totalCount: BASE_COUNT + memoryCompletedCount,
      });
    }
  }

  return res.status(405).json({ error: "Method Not Allowed" });
}
