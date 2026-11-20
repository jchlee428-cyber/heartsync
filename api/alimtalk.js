import crypto from "crypto";
import fs from "fs";

const SOLAPI_BASE_URL = "https://api.solapi.com";
const DEFAULT_PF_ID = "KA01PF26112004550182658icWjPLsax";
const DEFAULT_SENDER_PHONE = "01022526825";
const DEFAULT_TEMPLATES = {
  d1: "KA01TP261120051138941SYM5MbAUtAk",
  d7: "KA01TP2611200511399480QPCpDcT5Bi",
  d30: "KA01TP261120051140981onMjfozJFQI",
};
const TMP_SUBS_FILE = "/tmp/heartsync_alimtalk_subs.json";

function getSolapiConfig() {
  return {
    apiKey: String(process.env.SOLAPI_API_KEY || "").trim(),
    apiSecret: String(process.env.SOLAPI_API_SECRET || "").trim(),
    pfId: String(process.env.SOLAPI_PF_ID || DEFAULT_PF_ID).trim(),
    senderPhone: String(process.env.SOLAPI_SENDER_PHONE || DEFAULT_SENDER_PHONE)
      .replace(/[^0-9]/g, "")
      .trim(),
    templates: {
      d1: String(process.env.SOLAPI_TEMPLATE_D1 || DEFAULT_TEMPLATES.d1).trim(),
      d7: String(process.env.SOLAPI_TEMPLATE_D7 || DEFAULT_TEMPLATES.d7).trim(),
      d30: String(process.env.SOLAPI_TEMPLATE_D30 || DEFAULT_TEMPLATES.d30).trim(),
    },
  };
}

function buildAuthHeader(apiKey, apiSecret) {
  const date = new Date().toISOString();
  const salt = crypto.randomBytes(16).toString("hex");
  const signature = crypto
    .createHmac("sha256", apiSecret)
    .update(date + salt)
    .digest("hex");
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

function buildVariables(templateType, partnerName, latestScore) {
  const safePartner = String(partnerName || "파트너").trim() || "파트너";
  const safeScore = String(Number(latestScore) || 168);
  if (templateType === "d1") {
    return { "#{파트너명}": safePartner };
  }
  return {
    "#{파트너명}": safePartner,
    "#{점수}": safeScore,
  };
}

function computeKstScheduleIso(daysAhead, preferredTime = "20:00") {
  const [hhRaw, mmRaw] = String(preferredTime || "20:00").split(":");
  const hh = Math.min(23, Math.max(0, Number(hhRaw) || 20));
  const mm = Math.min(59, Math.max(0, Number(mmRaw) || 0));

  const nowUtcMs = Date.now();
  const kstOffsetMs = 9 * 60 * 60 * 1000;
  const kstDate = new Date(nowUtcMs + kstOffsetMs);
  kstDate.setUTCDate(kstDate.getUTCDate() + daysAhead);
  kstDate.setUTCHours(hh, mm, 0, 0);

  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = kstDate.getUTCFullYear();
  const mo = pad(kstDate.getUTCMonth() + 1);
  const dd = pad(kstDate.getUTCDate());
  const hStr = pad(kstDate.getUTCHours());
  const mStr = pad(kstDate.getUTCMinutes());
  return `${yyyy}-${mo}-${dd}T${hStr}:${mStr}:00+09:00`;
}

function saveLocalSubscription(record) {
  try {
    let list = [];
    if (fs.existsSync(TMP_SUBS_FILE)) {
      list = JSON.parse(fs.readFileSync(TMP_SUBS_FILE, "utf8")) || [];
    }
    list.unshift(record);
    fs.writeFileSync(TMP_SUBS_FILE, JSON.stringify(list.slice(0, 200)), "utf8");
  } catch {
    // Ignore /tmp write error
  }
}

async function fetchTemplateStatus(cfg, templateId) {
  const res = await fetch(`${SOLAPI_BASE_URL}/kakao/v2/templates/${templateId}`, {
    method: "GET",
    headers: {
      Authorization: buildAuthHeader(cfg.apiKey, cfg.apiSecret),
      "Content-Type": "application/json",
    },
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, statusHttp: res.status, data };
}

async function dispatchAlimtalk(cfg, { to, templateId, variables, scheduledDate }) {
  const payload = {
    messages: [
      {
        to,
        kakaoOptions: {
          pfId: cfg.pfId,
          templateId,
          disableSms: true,
          variables,
        },
      },
    ],
  };
  if (scheduledDate) {
    payload.scheduledDate = scheduledDate;
  }

  const res = await fetch(`${SOLAPI_BASE_URL}/messages/v4/send-many/detail`, {
    method: "POST",
    headers: {
      Authorization: buildAuthHeader(cfg.apiKey, cfg.apiSecret),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, statusHttp: res.status, data };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");

  const cfg = getSolapiConfig();

  if (req.method === "GET") {
    if (!cfg.apiKey || !cfg.apiSecret) {
      return res.status(200).json({
        configured: false,
        mode: "unconfigured",
        channel_id: cfg.pfId,
        templates: cfg.templates,
        message: "SOLAPI_API_KEY 및 SOLAPI_API_SECRET 환경변수 설정이 필요합니다.",
      });
    }

    try {
      const listRes = await fetch(
        `${SOLAPI_BASE_URL}/kakao/v2/templates?channelId=${encodeURIComponent(cfg.pfId)}`,
        {
          headers: {
            Authorization: buildAuthHeader(cfg.apiKey, cfg.apiSecret),
            "Content-Type": "application/json",
          },
        }
      );
      const listData = await listRes.json().catch(() => ({}));
      if (!listRes.ok) {
        return res.status(200).json({
          configured: false,
          mode: "auth_error",
          message: listData?.errorMessage || "솔라피 인증 확인에 실패했습니다.",
        });
      }

      const byId = {};
      for (const item of listData.templateList || []) {
        byId[item.templateId] = item.status;
      }

      const statuses = {
        d1: byId[cfg.templates.d1] || "UNKNOWN",
        d7: byId[cfg.templates.d7] || "UNKNOWN",
        d30: byId[cfg.templates.d30] || "UNKNOWN",
      };
      const allApproved = Object.values(statuses).every((s) => s === "APPROVED");
      const anyApproved = Object.values(statuses).some((s) => s === "APPROVED");

      return res.status(200).json({
        configured: true,
        mode: allApproved ? "live" : anyApproved ? "partial_live" : "inspecting",
        channel_id: cfg.pfId,
        statuses,
      });
    } catch (err) {
      return res.status(200).json({
        configured: false,
        mode: "error",
        message: String(err?.message || err),
      });
    }
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const action = String(body.action || "send_test").trim();
    const cleanPhone = String(body.phone || "").replace(/[^0-9]/g, "");
    const templateType = ["d1", "d7", "d30"].includes(body.template_type)
      ? body.template_type
      : "d1";
    const partnerName = String(body.partner_name || "파트너").trim() || "파트너";
    const preferredTime = String(body.preferred_time || "20:00").trim();
    const latestScore = Number(body.latest_score) || 168;

    if (!/^01[016789]\d{7,8}$/.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        dispatched: false,
        mode: "invalid_phone",
        message: "올바른 휴대전화 번호(010으로 시작하는 10~11자리)를 입력해주세요.",
      });
    }

    if (!cfg.apiKey || !cfg.apiSecret) {
      return res.status(200).json({
        success: false,
        dispatched: false,
        mode: "unconfigured",
        message:
          "서버에 SOLAPI_API_KEY / SOLAPI_API_SECRET 환경변수가 설정되지 않아 실발송할 수 없습니다.",
      });
    }

    if (action === "subscribe") {
      const schedulePlan = [
        { key: "d1", days: 1 },
        { key: "d7", days: 7 },
        { key: "d30", days: 30 },
      ];
      const scheduledResults = [];
      let liveScheduledCount = 0;

      for (const item of schedulePlan) {
        const tmplId = cfg.templates[item.key];
        const tmplCheck = await fetchTemplateStatus(cfg, tmplId);
        const tmplStatus = tmplCheck.data?.status || "UNKNOWN";
        const scheduledDate = computeKstScheduleIso(item.days, preferredTime);

        if (tmplCheck.ok && tmplStatus === "APPROVED") {
          const sendRes = await dispatchAlimtalk(cfg, {
            to: cleanPhone,
            templateId: tmplId,
            variables: buildVariables(item.key, partnerName, latestScore),
            scheduledDate,
          });
          const failedList = sendRes.data?.failedMessageList || [];
          if (sendRes.ok && failedList.length === 0) {
            liveScheduledCount += 1;
            scheduledResults.push({
              step: item.key,
              status: "SCHEDULED",
              scheduledDate,
              groupId: sendRes.data?.groupInfo?.groupId || null,
            });
          } else {
            scheduledResults.push({
              step: item.key,
              status: "ERROR",
              reason:
                failedList[0]?.statusMessage ||
                sendRes.data?.errorMessage ||
                "예약 발송 요청 실패",
            });
          }
        } else {
          scheduledResults.push({
            step: item.key,
            status: tmplStatus,
            scheduledDate,
          });
        }
      }

      saveLocalSubscription({
        phone: cleanPhone,
        partnerName,
        preferredTime,
        latestScore,
        liveScheduledCount,
        scheduledResults,
        createdAt: new Date().toISOString(),
      });

      if (liveScheduledCount > 0) {
        return res.status(200).json({
          success: true,
          dispatched: true,
          mode: "live",
          scheduled_count: liveScheduledCount,
          results: scheduledResults,
          message: `솔라피 카카오 알림톡 데일리 루틴 ${liveScheduledCount}건(D+1, D+7, D+30)이 실제 예약 등록되었습니다!`,
        });
      }

      return res.status(200).json({
        success: true,
        dispatched: false,
        mode: "inspecting",
        scheduled_count: 0,
        results: scheduledResults,
        message:
          "연락처 및 루틴 설정이 저장되었습니다. 현재 카카오 알림톡 템플릿 검수 중(INSPECTING)이며, 승인 완료 후 실발송이 활성화됩니다.",
      });
    }

    // Default: action === "send_test"
    const templateId = cfg.templates[templateType] || cfg.templates.d1;
    const tmplCheck = await fetchTemplateStatus(cfg, templateId);

    if (!tmplCheck.ok) {
      return res.status(200).json({
        success: false,
        dispatched: false,
        mode: "error",
        message:
          tmplCheck.data?.errorMessage ||
          "솔라피 템플릿 상태 조회 중 오류가 발생했습니다.",
      });
    }

    const tmplStatus = tmplCheck.data?.status || "UNKNOWN";
    if (tmplStatus !== "APPROVED") {
      const statusLabelMap = {
        INSPECTING: "카카오 검수 진행 중 (승인 대기)",
        PENDING: "검수 대기",
        REJECTED: "템플릿 반려됨 (수정 필요)",
      };
      return res.status(200).json({
        success: true,
        dispatched: false,
        mode: "inspecting",
        template_status: tmplStatus,
        template_name: tmplCheck.data?.name || templateType.toUpperCase(),
        message: `솔라피 API 연동 정상! 현재 [${
          statusLabelMap[tmplStatus] || tmplStatus
        }] 상태이므로 카카오 검수 승인 즉시 실제 알림톡이 발송됩니다.`,
      });
    }

    const sendRes = await dispatchAlimtalk(cfg, {
      to: cleanPhone,
      templateId,
      variables: buildVariables(templateType, partnerName, latestScore),
    });

    const failedList = sendRes.data?.failedMessageList || [];
    if (!sendRes.ok || failedList.length > 0) {
      const failReason =
        failedList[0]?.statusMessage ||
        sendRes.data?.errorMessage ||
        "알림톡 발송 요청이 거부되었습니다.";
      return res.status(200).json({
        success: false,
        dispatched: false,
        mode: "error",
        message: `솔라피 발송 실패: ${failReason}`,
      });
    }

    return res.status(200).json({
      success: true,
      dispatched: true,
      mode: "live",
      group_id: sendRes.data?.groupInfo?.groupId || null,
      message: `${cleanPhone} 번호로 실제 카카오 알림톡을 발송했습니다! 카카오톡을 확인해주세요.`,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      dispatched: false,
      mode: "error",
      message: `서버 오류: ${String(err?.message || err)}`,
    });
  }
}
