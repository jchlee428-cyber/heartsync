export const TOSS_DOCS_TEST_WIDGET_KEY = "test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm";

/**
 * Resolves the effective Toss Payments client key with strict priority:
 * 1. Live Payment Widget key (`live_gck_...`) — supports unified widget (Card, TossPay, Mobile Phone, etc.)
 * 2. Live API Individual key (`live_ck_...`)
 * 3. Merchant Test Payment Widget key (`test_gck_...`, excluding public docs key)
 * 4. Merchant Test API key (`test_ck_...`)
 * 5. Public Toss docs widget test key fallback
 *
 * Ensures a backend fallback test key never overwrites a configured frontend `live_` key.
 */
export function resolveTossClientKey(serverClientKey?: string | null): string {
  const envKey = String((import.meta as any).env?.VITE_TOSS_CLIENT_KEY || "").trim();
  const srvKey = String(serverClientKey || "").trim();
  const candidates = [envKey, srvKey].filter(Boolean);

  const liveWidget = candidates.find((k) => k.startsWith("live_gck_"));
  if (liveWidget) return liveWidget;

  const liveApi = candidates.find((k) => k.startsWith("live_ck_"));
  if (liveApi) return liveApi;

  const merchantTestWidget = candidates.find(
    (k) => k.startsWith("test_gck_") && k !== TOSS_DOCS_TEST_WIDGET_KEY
  );
  if (merchantTestWidget) return merchantTestWidget;

  const merchantTestApi = candidates.find((k) => k.startsWith("test_ck_"));
  if (merchantTestApi) return merchantTestApi;

  const anyWidget = candidates.find((k) => k.startsWith("test_gck_"));
  if (anyWidget) return anyWidget;

  return TOSS_DOCS_TEST_WIDGET_KEY;
}

export function isLiveTossKey(key?: string | null): boolean {
  return Boolean(key && String(key).trim().startsWith("live_"));
}

export function isWidgetTossKey(key?: string | null): boolean {
  if (!key) return false;
  const trimmed = String(key).trim();
  return trimmed.startsWith("live_gck_") || trimmed.startsWith("test_gck_");
}
