const DELETED_DIAG_IDS_KEY = "heartsync_deleted_diagnosis_ids";

function simpleHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return Math.abs(hash >>> 0).toString(16);
}

/**
 * Generates a deterministic user identity so logging in on PC and Mobile
 * with the same provider or email always produces the exact same user.id & email.
 */
export function getDeterministicUserIdentity(
  provider: string,
  extraEmail?: string,
  extraName?: string,
  isAdmin?: boolean
): { id: string; email: string; name: string; role: string } {
  const providerNames: Record<string, string> = {
    kakao: "카카오",
    naver: "네이버",
    google: "Google",
    email: "이메일",
    demo: "체험",
  };

  const normalizedProvider = (provider || "kakao").trim().toLowerCase();
  const rawEmail = (extraEmail || "").trim().toLowerCase();

  const resolvedEmail =
    rawEmail ||
    (isAdmin
      ? "admin@heartsync.kr"
      : `${normalizedProvider}_member@heartsync.kr`);

  const resolvedName =
    (extraName || "").trim() ||
    (isAdmin
      ? "HeartSync 총괄 관리자"
      : `${providerNames[normalizedProvider] || ""} 회원`.trim());

  const resolvedId = isAdmin
    ? "admin_heartsync_root"
    : rawEmail
      ? `usr_${normalizedProvider}_${simpleHash(resolvedEmail)}`
      : `usr_${normalizedProvider}_sync`;

  return {
    id: resolvedId,
    email: resolvedEmail,
    name: resolvedName,
    role:
      isAdmin ||
      resolvedEmail === "admin@heartsync.kr" ||
      resolvedEmail === "admin@heartsync.co.kr"
        ? "admin"
        : "user",
  };
}

export function getCurrentUserKey(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const rawUser = localStorage.getItem("user");
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      if (parsed?.email) {
        return String(parsed.email).trim().toLowerCase();
      }
      if (parsed?.id) {
        return String(parsed.id).trim().toLowerCase();
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export function getDeletedDiagnosisIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(DELETED_DIAG_IDS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set();
  }
}

function saveDeletedDiagnosisIds(ids: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DELETED_DIAG_IDS_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // ignore
  }
}

export function gatherLocalUserData(): {
  diagnoses: any[];
  orders: any[];
  activePlan: any | null;
  deletedDiagnosisIds: string[];
} {
  if (typeof window === "undefined") {
    return {
      diagnoses: [],
      orders: [],
      activePlan: null,
      deletedDiagnosisIds: [],
    };
  }

  const deletedSet = getDeletedDiagnosisIds();
  const diagMap = new Map<string, any>();

  try {
    const listStr = localStorage.getItem("heartsync_local_diagnoses") || "[]";
    const list = JSON.parse(listStr);
    if (Array.isArray(list)) {
      for (const d of list) {
        if (d && d.id && !deletedSet.has(String(d.id))) {
          diagMap.set(String(d.id), d);
        }
      }
    }
  } catch {
    // ignore
  }

  try {
    const lastStr = localStorage.getItem("heartsync_last_diagnosis");
    if (lastStr) {
      const lastDiag = JSON.parse(lastStr);
      if (lastDiag && lastDiag.id && !deletedSet.has(String(lastDiag.id))) {
        const prev = diagMap.get(String(lastDiag.id));
        diagMap.set(String(lastDiag.id), {
          ...prev,
          ...lastDiag,
          ai_report: lastDiag.ai_report || prev?.ai_report || "",
        });
      }
    }
  } catch {
    // ignore
  }

  // Also check any heartsync_diagnosis_<id> keys in localStorage for updated ai_report
  for (const [idStr, item] of diagMap.entries()) {
    try {
      const individualRaw = localStorage.getItem(`heartsync_diagnosis_${idStr}`);
      if (individualRaw) {
        const parsed = JSON.parse(individualRaw);
        if (parsed && parsed.ai_report && !item.ai_report) {
          diagMap.set(idStr, { ...item, ai_report: parsed.ai_report });
        }
      }
    } catch {
      // ignore
    }
  }

  let orders: any[] = [];
  try {
    const ordStr = localStorage.getItem("heartsync_orders") || "[]";
    const parsed = JSON.parse(ordStr);
    if (Array.isArray(parsed)) {
      orders = parsed;
    }
  } catch {
    // ignore
  }

  let activePlan: any | null = null;
  try {
    const planStr = localStorage.getItem("heartsync_active_plan");
    if (planStr) {
      activePlan = JSON.parse(planStr);
    }
  } catch {
    // ignore
  }

  return {
    diagnoses: Array.from(diagMap.values()),
    orders,
    activePlan,
    deletedDiagnosisIds: Array.from(deletedSet),
  };
}

/**
 * Bidirectional sync of diagnoses (with AI reports), orders, and active plan
 * between this device's localStorage and `/api/user-sync`.
 */
export async function syncUserDataWithCloud(
  explicitUserKey?: string
): Promise<{
  diagnoses: any[];
  orders: any[];
  activePlan: any | null;
}> {
  const local = gatherLocalUserData();
  const userKey = explicitUserKey || getCurrentUserKey();
  if (!userKey) {
    return {
      diagnoses: local.diagnoses,
      orders: local.orders,
      activePlan: local.activePlan,
    };
  }

  try {
    const res = await fetch("/api/user-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userKey,
        diagnoses: local.diagnoses,
        orders: local.orders,
        activePlan: local.activePlan,
        deletedDiagnosisIds: local.deletedDiagnosisIds,
      }),
    });

    if (!res.ok) {
      return {
        diagnoses: local.diagnoses,
        orders: local.orders,
        activePlan: local.activePlan,
      };
    }

    const data = await res.json();
    const serverDeleted: string[] = Array.isArray(data.deletedDiagnosisIds)
      ? data.deletedDiagnosisIds.map(String)
      : local.deletedDiagnosisIds;
    const deletedSet = new Set(serverDeleted);
    saveDeletedDiagnosisIds(deletedSet);

    const syncedDiagnoses: any[] = Array.isArray(data.diagnoses)
      ? data.diagnoses.filter((d: any) => d && d.id && !deletedSet.has(String(d.id)))
      : local.diagnoses;

    const syncedOrders: any[] = Array.isArray(data.orders)
      ? data.orders
      : local.orders;

    const syncedPlan = data.activePlan || local.activePlan || null;

    // Persist synced data back into localStorage so PC and Mobile match 100%
    try {
      localStorage.setItem(
        "heartsync_local_diagnoses",
        JSON.stringify(syncedDiagnoses)
      );
      if (syncedDiagnoses.length > 0) {
        localStorage.setItem(
          "heartsync_last_diagnosis",
          JSON.stringify(syncedDiagnoses[0])
        );
        for (const d of syncedDiagnoses) {
          if (d && d.id) {
            localStorage.setItem(
              `heartsync_diagnosis_${d.id}`,
              JSON.stringify(d)
            );
          }
        }
      } else {
        localStorage.removeItem("heartsync_last_diagnosis");
      }

      for (const delId of deletedSet) {
        localStorage.removeItem(`heartsync_diagnosis_${delId}`);
      }

      if (syncedOrders.length > 0) {
        localStorage.setItem("heartsync_orders", JSON.stringify(syncedOrders));
      }

      if (syncedPlan) {
        localStorage.setItem(
          "heartsync_active_plan",
          JSON.stringify(syncedPlan)
        );
        if (syncedPlan.is_active && syncedPlan.plan_type !== "free") {
          localStorage.setItem(
            "heartsync_active_test_plan",
            syncedPlan.plan_type
          );
          localStorage.setItem("heartsync_test_paid", "true");
        }
      }
    } catch {
      // ignore storage quota errors
    }

    return {
      diagnoses: syncedDiagnoses,
      orders: syncedOrders,
      activePlan: syncedPlan,
    };
  } catch {
    return {
      diagnoses: local.diagnoses,
      orders: local.orders,
      activePlan: local.activePlan,
    };
  }
}

export async function fetchRemoteDiagnosisById(
  diagnosisId: string | number
): Promise<any | null> {
  try {
    const res = await fetch(
      `/api/user-sync?diagnosisId=${encodeURIComponent(String(diagnosisId))}`,
      { method: "GET" }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.diagnosis && data.diagnosis.id) {
      try {
        localStorage.setItem(
          `heartsync_diagnosis_${data.diagnosis.id}`,
          JSON.stringify(data.diagnosis)
        );
      } catch {
        // ignore
      }
      return data.diagnosis;
    }
    return null;
  } catch {
    return null;
  }
}

export async function deleteSyncedDiagnosis(
  diagnosisId: string | number
): Promise<void> {
  const idStr = String(diagnosisId);
  const deletedSet = getDeletedDiagnosisIds();
  deletedSet.add(idStr);
  saveDeletedDiagnosisIds(deletedSet);

  try {
    localStorage.removeItem(`heartsync_diagnosis_${idStr}`);
    const lastStr = localStorage.getItem("heartsync_last_diagnosis");
    if (lastStr) {
      const parsed = JSON.parse(lastStr);
      if (String(parsed?.id) === idStr) {
        localStorage.removeItem("heartsync_last_diagnosis");
      }
    }
    const listStr = localStorage.getItem("heartsync_local_diagnoses") || "[]";
    const list = JSON.parse(listStr);
    if (Array.isArray(list)) {
      const filtered = list.filter((d: any) => String(d?.id) !== idStr);
      localStorage.setItem(
        "heartsync_local_diagnoses",
        JSON.stringify(filtered)
      );
      if (filtered.length > 0 && !localStorage.getItem("heartsync_last_diagnosis")) {
        localStorage.setItem(
          "heartsync_last_diagnosis",
          JSON.stringify(filtered[0])
        );
      }
    }
  } catch {
    // ignore
  }

  const userKey = getCurrentUserKey();
  if (userKey) {
    try {
      await fetch("/api/user-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userKey,
          deleteDiagnosisId: idStr,
          deletedDiagnosisIds: Array.from(deletedSet),
        }),
      });
    } catch {
      // ignore
    }
  }
}
