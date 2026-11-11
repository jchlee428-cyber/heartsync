export const PLAN_TIERS: Record<string, number> = {
  single_analysis: 1,
  couple_dual: 2,
  monthly_subscription: 2,
  all_care_pass: 3,
  couple_premium: 3,
};

export const PLAN_BASE_PRICES: Record<number, number> = {
  1: 19900,
  2: 29000,
  3: 49000,
};

export const PLAN_BASE_USD: Record<number, number> = {
  1: 14.99,
  2: 21.99,
  3: 36.99,
};

export const PLAN_CANONICAL_IDS: Record<number, string> = {
  1: "single_analysis",
  2: "monthly_subscription",
  3: "couple_premium",
};

export const PLAN_CANONICAL_NAMES: Record<string, string> = {
  single_analysis: "개인 정밀 분석 (1회권)",
  couple_dual: "커플 듀얼 매칭 패키지 (2인)",
  monthly_subscription: "커플 듀얼 매칭 패키지 (2인)",
  all_care_pass: "30일 관계 개선 올케어 패스",
  couple_premium: "30일 관계 개선 올케어 패스",
};

export function getPlanTier(planType?: string | null): number {
  if (!planType) return 0;
  return PLAN_TIERS[planType] || 0;
}

export function resolveLocalActivePlanType(serverPlanType?: string | null): string {
  try {
    const isLoggedOut = localStorage.getItem("isLougOutManual") === "true";
    const token = localStorage.getItem("token");
    if (!token || isLoggedOut) {
      return "free";
    }
  } catch {
    return "free";
  }

  let bestTier = getPlanTier(serverPlanType);

  try {
    const localPlanStr = localStorage.getItem("heartsync_active_plan");
    if (localPlanStr) {
      const parsed = JSON.parse(localPlanStr);
      if (parsed?.is_active && parsed?.plan_type) {
        bestTier = Math.max(bestTier, getPlanTier(parsed.plan_type));
      }
    }
  } catch {
    // ignore
  }

  try {
    const ordersStr = localStorage.getItem("heartsync_orders");
    if (ordersStr) {
      const orders = JSON.parse(ordersStr);
      if (Array.isArray(orders)) {
        for (const o of orders) {
          if (o?.status !== "paid") continue;
          const isGift =
            String(o?.payment_method || "").includes("선물") ||
            String(o?.order_id || "").startsWith("GIFT") ||
            String(o?.plan_name || "").includes("[선물]");
          if (isGift) continue;
          bestTier = Math.max(bestTier, getPlanTier(o?.plan_type));
        }
      }
    }
  } catch {
    // ignore
  }

  return PLAN_CANONICAL_IDS[bestTier] || "free";
}

export interface PlanUpgradeQuote {
  targetPlanId: string;
  targetTier: number;
  activeTier: number;
  activePlanId: string;
  activePlanName: string;
  isCurrentPlan: boolean;
  isDowngrade: boolean;
  isUpgrade: boolean;
  basePrice: number;
  creditAmount: number;
  finalPrice: number;
  basePriceFormatted: string;
  creditFormatted: string;
  finalPriceFormatted: string;
  baseUsd: string;
  finalUsd: string;
  orderName: string;
}

export function getPlanUpgradeQuote(
  targetPlanId: string,
  activePlanId?: string | null
): PlanUpgradeQuote {
  const targetTier = getPlanTier(targetPlanId);
  const activeTier = getPlanTier(activePlanId);
  const canonicalActiveId = PLAN_CANONICAL_IDS[activeTier] || "free";
  const activePlanName = PLAN_CANONICAL_NAMES[canonicalActiveId] || "";
  const targetCanonicalName = PLAN_CANONICAL_NAMES[targetPlanId] || targetPlanId;

  const isCurrentPlan = activeTier > 0 && targetTier === activeTier;
  const isDowngrade = activeTier > 0 && targetTier < activeTier;
  const isUpgrade = activeTier > 0 && targetTier > activeTier;

  const basePrice = PLAN_BASE_PRICES[targetTier] || 19900;
  const creditAmount = isUpgrade ? PLAN_BASE_PRICES[activeTier] || 0 : 0;
  const finalPrice = isUpgrade ? Math.max(0, basePrice - creditAmount) : basePrice;

  const baseUsdNum = PLAN_BASE_USD[targetTier] || 14.99;
  const creditUsdNum = isUpgrade ? PLAN_BASE_USD[activeTier] || 0 : 0;
  const finalUsdNum = isUpgrade ? Math.max(0, baseUsdNum - creditUsdNum) : baseUsdNum;

  const orderName = isUpgrade
    ? `[업그레이드] ${targetCanonicalName} (차액 결제)`
    : targetCanonicalName;

  return {
    targetPlanId,
    targetTier,
    activeTier,
    activePlanId: canonicalActiveId,
    activePlanName,
    isCurrentPlan,
    isDowngrade,
    isUpgrade,
    basePrice,
    creditAmount,
    finalPrice,
    basePriceFormatted: basePrice.toLocaleString(),
    creditFormatted: creditAmount.toLocaleString(),
    finalPriceFormatted: finalPrice.toLocaleString(),
    baseUsd: baseUsdNum.toFixed(2),
    finalUsd: finalUsdNum.toFixed(2),
    orderName,
  };
}

export function normalizeUpgradeOrders<T extends Record<string, any>>(orders: T[]): T[] {
  if (!Array.isArray(orders) || orders.length === 0) return [];

  // Sort chronologically (oldest first) to trace cumulative tier progression
  const chronological = [...orders].sort((a, b) => {
    const tA = new Date(a.created_at || 0).getTime();
    const tB = new Date(b.created_at || 0).getTime();
    return tA - tB;
  });

  let highestPaidTier = 0;

  const processed = chronological.map((order) => {
    const copy: any = { ...order };
    const isPaid = copy.status === "paid";
    const isGift =
      String(copy.payment_method || "").includes("선물") ||
      String(copy.order_id || "").startsWith("GIFT") ||
      String(copy.plan_name || "").includes("[선물]");

    const orderTier = getPlanTier(copy.plan_type);
    const basePrice = PLAN_BASE_PRICES[orderTier] || copy.amount || 0;
    const canonicalName = PLAN_CANONICAL_NAMES[copy.plan_type] || copy.plan_name || copy.plan_type;

    if (isPaid && !isGift && orderTier > 0) {
      if (highestPaidTier > 0 && orderTier > highestPaidTier) {
        const credit = PLAN_BASE_PRICES[highestPaidTier] || 0;
        const expectedDiff = Math.max(0, basePrice - credit);

        // Normalize full-price upgrade or already-differential upgrade
        if (copy.amount === basePrice || copy.amount === expectedDiff) {
          copy.amount = expectedDiff;
          copy.original_amount = basePrice;
          copy.upgrade_credit = credit;
          copy.is_upgrade = true;
          if (!String(copy.plan_name || "").includes("[업그레이드]")) {
            copy.plan_name = `[업그레이드] ${canonicalName} (차액 결제)`;
          }
        }
      } else if (
        copy.amount > 0 &&
        copy.amount < basePrice &&
        (copy.amount === 29100 || copy.amount === 9100 || copy.amount === 20000)
      ) {
        copy.original_amount = basePrice;
        copy.upgrade_credit = basePrice - copy.amount;
        copy.is_upgrade = true;
        if (!String(copy.plan_name || "").includes("[업그레이드]")) {
          copy.plan_name = `[업그레이드] ${canonicalName} (차액 결제)`;
        }
      }

      highestPaidTier = Math.max(highestPaidTier, orderTier);
    }

    return copy as T;
  });

  // Persist normalized orders back to localStorage so all pages stay consistent
  try {
    const newestFirst = [...processed].sort((a, b) => {
      const tA = new Date(a.created_at || 0).getTime();
      const tB = new Date(b.created_at || 0).getTime();
      return tB - tA;
    });
    localStorage.setItem("heartsync_orders", JSON.stringify(newestFirst));
    return newestFirst;
  } catch {
    return [...processed].reverse();
  }
}

