const TOSS_CONFIRM_URL = "https://api.tosspayments.com/v1/payments/confirm";
const TOSS_DOCS_TEST_SECRET = "test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6";

function inferPlanType(orderId = "", amount = 0) {
  if (orderId.includes("couple_premium") || orderId.includes("all_care_pass")) {
    return "couple_premium";
  }
  if (orderId.includes("monthly_subscription") || orderId.includes("couple_dual")) {
    return "monthly_subscription";
  }
  if ([49000, 29100, 20000].includes(Number(amount))) return "couple_premium";
  if ([29000, 9100].includes(Number(amount))) return "monthly_subscription";
  return "single_analysis";
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const paymentKey = String(body.payment_key || body.paymentKey || "").trim();
    const orderId = String(body.order_id || body.orderId || "").trim();
    const amount = Number(body.amount);

    if (!paymentKey || !orderId || !Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: "결제 승인 파라미터가 올바르지 않습니다." });
    }

    const secretKey = String(process.env.TOSS_SECRET_KEY || "").trim() || TOSS_DOCS_TEST_SECRET;
    const credentials = Buffer.from(`${secretKey}:`).toString("base64");

    const upstream = await fetch(TOSS_CONFIRM_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentKey,
        orderId,
        amount,
      }),
    });

    const data = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      if (data?.code === "ALREADY_PROCESSED_PAYMENT") {
        return res.status(200).json({
          status: "paid",
          plan_type: inferPlanType(orderId, amount),
          payment_method: data?.method || "토스페이먼츠",
          receipt_url: data?.receipt?.url || null,
        });
      }
      return res.status(upstream.status).json({
        status: "failed",
        code: data?.code || "CONFIRM_FAILED",
        detail: data?.message || "토스페이먼츠 결제 승인 실패",
      });
    }

    return res.status(200).json({
      status: data?.status === "DONE" ? "paid" : "failed",
      plan_type: inferPlanType(orderId, amount),
      payment_method: data?.method || "토스페이먼츠",
      receipt_url: data?.receipt?.url || null,
    });
  } catch (err) {
    return res.status(500).json({
      status: "failed",
      detail: String(err?.message || err),
    });
  }
}
