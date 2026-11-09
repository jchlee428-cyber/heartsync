import fs from "fs";

const TMP_SYNC_FILE = "/tmp/heartsync_user_sync.json";

let memoryStore = {
  users: {},
  diagnosesById: {},
};

function loadStore() {
  try {
    if (fs.existsSync(TMP_SYNC_FILE)) {
      const raw = fs.readFileSync(TMP_SYNC_FILE, "utf8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        memoryStore.users = { ...(parsed.users || {}), ...memoryStore.users };
        memoryStore.diagnosesById = {
          ...(parsed.diagnosesById || {}),
          ...memoryStore.diagnosesById,
        };
      }
    }
  } catch {
    // Ignore /tmp read error
  }
}

function saveStore() {
  try {
    fs.writeFileSync(TMP_SYNC_FILE, JSON.stringify(memoryStore), "utf8");
  } catch {
    // Ignore /tmp write error
  }
}

function normalizeUserKey(rawKey) {
  const cleaned = String(rawKey || "")
    .trim()
    .toLowerCase();
  return cleaned || "anonymous_default";
}

function ensureUserBucket(userKey) {
  if (!memoryStore.users[userKey]) {
    memoryStore.users[userKey] = {
      diagnoses: [],
      orders: [],
      activePlan: null,
      deletedDiagnosisIds: [],
      updatedAt: new Date().toISOString(),
    };
  }
  return memoryStore.users[userKey];
}

function mergeDiagnoses(existingList, incomingList, deletedIdsSet) {
  const map = new Map();
  const combined = [...(existingList || []), ...(incomingList || [])];

  for (const item of combined) {
    if (!item || !item.id) continue;
    const idStr = String(item.id);
    if (deletedIdsSet.has(idStr)) continue;

    const prev = map.get(idStr);
    if (!prev) {
      map.set(idStr, item);
    } else {
      const mergedItem = {
        ...prev,
        ...item,
        ai_report: item.ai_report || prev.ai_report || "",
        answers: item.answers || prev.answers,
        scores: item.scores || prev.scores,
      };
      map.set(idStr, mergedItem);
    }
  }

  return Array.from(map.values())
    .sort((a, b) => {
      const tA = new Date(a.created_at || 0).getTime();
      const tB = new Date(b.created_at || 0).getTime();
      return tB - tA;
    })
    .slice(0, 100);
}

function mergeOrders(existingList, incomingList) {
  const map = new Map();
  const combined = [...(existingList || []), ...(incomingList || [])];

  for (const ord of combined) {
    if (!ord) continue;
    const key = String(ord.order_id || ord.id || "");
    if (!key) continue;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, ord);
    } else {
      map.set(key, { ...prev, ...ord });
    }
  }

  return Array.from(map.values())
    .sort((a, b) => {
      const tA = new Date(a.created_at || 0).getTime();
      const tB = new Date(b.created_at || 0).getTime();
      return tB - tA;
    })
    .slice(0, 100);
}

function pickNewerPlan(planA, planB) {
  if (!planA) return planB || null;
  if (!planB) return planA || null;
  const timeA = new Date(planA.paid_at || planA.expires_at || 0).getTime();
  const timeB = new Date(planB.paid_at || planB.expires_at || 0).getTime();
  return timeB >= timeA ? planB : planA;
}

export default async function handler(req, res) {
  loadStore();
  res.setHeader("Cache-Control", "no-store, max-age=0");

  if (req.method === "GET") {
    const diagnosisId = req.query?.diagnosisId
      ? String(req.query.diagnosisId)
      : "";
    if (diagnosisId) {
      const found = memoryStore.diagnosesById[diagnosisId] || null;
      return res.status(200).json({ diagnosis: found });
    }

    const userKey = normalizeUserKey(req.query?.userKey);
    const bucket = ensureUserBucket(userKey);
    return res.status(200).json({
      userKey,
      diagnoses: bucket.diagnoses || [],
      orders: bucket.orders || [],
      activePlan: bucket.activePlan || null,
      deletedDiagnosisIds: bucket.deletedDiagnosisIds || [],
      updatedAt: bucket.updatedAt,
    });
  }

  if (req.method === "POST") {
    try {
      const body =
        typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      const userKey = normalizeUserKey(body.userKey);
      const bucket = ensureUserBucket(userKey);

      const deletedSet = new Set(
        (bucket.deletedDiagnosisIds || []).map(String)
      );
      if (Array.isArray(body.deletedDiagnosisIds)) {
        body.deletedDiagnosisIds.forEach((id) => deletedSet.add(String(id)));
      }
      if (body.deleteDiagnosisId) {
        deletedSet.add(String(body.deleteDiagnosisId));
        delete memoryStore.diagnosesById[String(body.deleteDiagnosisId)];
      }

      bucket.deletedDiagnosisIds = Array.from(deletedSet).slice(-200);

      const incomingDiagnoses = Array.isArray(body.diagnoses)
        ? body.diagnoses
        : [];
      bucket.diagnoses = mergeDiagnoses(
        bucket.diagnoses,
        incomingDiagnoses,
        deletedSet
      );

      for (const d of bucket.diagnoses) {
        if (d && d.id) {
          memoryStore.diagnosesById[String(d.id)] = d;
        }
      }

      const incomingOrders = Array.isArray(body.orders) ? body.orders : [];
      bucket.orders = mergeOrders(bucket.orders, incomingOrders);

      if (body.activePlan) {
        bucket.activePlan = pickNewerPlan(bucket.activePlan, body.activePlan);
      }

      bucket.updatedAt = new Date().toISOString();
      saveStore();

      return res.status(200).json({
        success: true,
        userKey,
        diagnoses: bucket.diagnoses,
        orders: bucket.orders,
        activePlan: bucket.activePlan,
        deletedDiagnosisIds: bucket.deletedDiagnosisIds,
        updatedAt: bucket.updatedAt,
      });
    } catch (err) {
      return res.status(500).json({ error: String(err?.message || err) });
    }
  }

  return res.status(405).json({ error: "Method Not Allowed" });
}
