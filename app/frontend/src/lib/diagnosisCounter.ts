/**
 * Real-time & Persistent Diagnosis Completion Counter
 * Starts at BASE_DIAGNOSIS_COUNT (10,000) and genuinely increments
 * whenever a diagnosis (50-question full diagnosis or 3-min check-in) is completed.
 */

export const BASE_DIAGNOSIS_COUNT = 10000;

const COUNT_STORAGE_KEY = "heartsync_completed_diagnosis_count";
const IDS_STORAGE_KEY = "heartsync_completed_diagnosis_ids";
const SERVER_COUNT_KEY = "heartsync_server_completed_count";

function collectLocalUniqueDiagnosisIds(): Set<string> {
  const ids = new Set<string>();
  if (typeof window === "undefined") return ids;

  try {
    // 1. Explicitly recorded completion IDs
    const storedIdsRaw = localStorage.getItem(IDS_STORAGE_KEY);
    if (storedIdsRaw) {
      const parsed = JSON.parse(storedIdsRaw);
      if (Array.isArray(parsed)) {
        parsed.forEach((id) => {
          if (id !== null && id !== undefined) ids.add(String(id));
        });
      }
    }

    // 2. Completed 50-question diagnoses list
    const localListRaw = localStorage.getItem("heartsync_local_diagnoses");
    if (localListRaw) {
      const list = JSON.parse(localListRaw);
      if (Array.isArray(list)) {
        list.forEach((item) => {
          if (item?.id) ids.add(String(item.id));
        });
      }
    }

    // 3. Completed 3-minute mini check-ins
    const miniListRaw = localStorage.getItem("heartsync_mini_checkins");
    if (miniListRaw) {
      const list = JSON.parse(miniListRaw);
      if (Array.isArray(list)) {
        list.forEach((item) => {
          if (item?.id) ids.add(String(item.id));
        });
      }
    }

    // 4. Last completed diagnosis record
    const lastRaw = localStorage.getItem("heartsync_last_diagnosis");
    if (lastRaw) {
      const last = JSON.parse(lastRaw);
      if (last?.id) ids.add(String(last.id));
    }

    // 5. Individual heartsync_diagnosis_<id> keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("heartsync_diagnosis_")) {
        const suffix = key.replace("heartsync_diagnosis_", "");
        if (suffix) ids.add(suffix);
      }
    }
  } catch {
    // Ignore storage parse errors
  }

  return ids;
}

/**
 * Returns the number of completed diagnoses above the 10,000 base.
 */
export function getCompletedDiagnosisCount(): number {
  if (typeof window === "undefined") return 0;

  try {
    const rawCount = parseInt(localStorage.getItem(COUNT_STORAGE_KEY) || "0", 10);
    const storedCount = Number.isFinite(rawCount) && rawCount >= 0 ? rawCount : 0;

    const rawServerCount = parseInt(localStorage.getItem(SERVER_COUNT_KEY) || "0", 10);
    const serverCount = Number.isFinite(rawServerCount) && rawServerCount >= 0 ? rawServerCount : 0;

    const uniqueIds = collectLocalUniqueDiagnosisIds();
    const effectiveCount = Math.max(storedCount, uniqueIds.size, serverCount);

    if (effectiveCount !== storedCount) {
      localStorage.setItem(COUNT_STORAGE_KEY, String(effectiveCount));
    }
    if (uniqueIds.size > 0) {
      localStorage.setItem(IDS_STORAGE_KEY, JSON.stringify(Array.from(uniqueIds)));
    }

    return effectiveCount;
  } catch {
    return 0;
  }
}

/**
 * Returns the total diagnosis count starting from 10,000.
 */
export function getTotalDiagnosisCount(): number {
  return BASE_DIAGNOSIS_COUNT + getCompletedDiagnosisCount();
}

/**
 * Records a newly completed diagnosis and increments the counter by +1.
 */
export function recordDiagnosisCompletion(diagnosisId?: string | number): number {
  if (typeof window === "undefined") return BASE_DIAGNOSIS_COUNT;

  try {
    const uniqueIds = collectLocalUniqueDiagnosisIds();
    const idStr = diagnosisId ? String(diagnosisId) : `diag_${Date.now()}`;
    const isNewId = !uniqueIds.has(idStr);
    uniqueIds.add(idStr);
    localStorage.setItem(IDS_STORAGE_KEY, JSON.stringify(Array.from(uniqueIds)));

    const rawCount = parseInt(localStorage.getItem(COUNT_STORAGE_KEY) || "0", 10);
    const prevCount = Number.isFinite(rawCount) && rawCount >= 0 ? rawCount : 0;
    const nextCount = isNewId
      ? Math.max(prevCount + 1, uniqueIds.size)
      : Math.max(prevCount, uniqueIds.size);

    localStorage.setItem(COUNT_STORAGE_KEY, String(nextCount));

    const totalCount = BASE_DIAGNOSIS_COUNT + nextCount;

    window.dispatchEvent(
      new CustomEvent("heartsync:diagnosis-count-updated", {
        detail: { completedCount: nextCount, totalCount },
      })
    );

    // Fire-and-forget server counter increment
    fetch("/api/diagnosis-count", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ diagnosisId: idStr, clientCompletedCount: nextCount }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.completedCount === "number" && data.completedCount > nextCount) {
          localStorage.setItem(SERVER_COUNT_KEY, String(data.completedCount));
          localStorage.setItem(COUNT_STORAGE_KEY, String(data.completedCount));
          window.dispatchEvent(
            new CustomEvent("heartsync:diagnosis-count-updated", {
              detail: {
                completedCount: data.completedCount,
                totalCount: BASE_DIAGNOSIS_COUNT + data.completedCount,
              },
            })
          );
        }
      })
      .catch(() => {
        // Offline or serverless unavailable — local count is already persisted
      });

    return totalCount;
  } catch {
    return getTotalDiagnosisCount();
  }
}

/**
 * Fetches the latest diagnosis completion count from the server and merges with local count.
 */
export async function syncServerDiagnosisCount(): Promise<number> {
  const localTotal = getTotalDiagnosisCount();
  if (typeof window === "undefined") return localTotal;

  try {
    const localCompleted = getCompletedDiagnosisCount();
    const res = await fetch(`/api/diagnosis-count?clientCount=${localCompleted}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return localTotal;

    const data = await res.json();
    const serverCompleted =
      typeof data?.completedCount === "number" && data.completedCount >= 0
        ? data.completedCount
        : 0;

    if (serverCompleted > 0) {
      localStorage.setItem(SERVER_COUNT_KEY, String(serverCompleted));
    }

    const mergedCompleted = Math.max(localCompleted, serverCompleted);
    if (mergedCompleted !== localCompleted) {
      localStorage.setItem(COUNT_STORAGE_KEY, String(mergedCompleted));
    }

    const mergedTotal = BASE_DIAGNOSIS_COUNT + mergedCompleted;
    return mergedTotal;
  } catch {
    return localTotal;
  }
}
