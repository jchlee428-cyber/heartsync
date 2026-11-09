export interface UserReview {
  id?: string;
  text: string;
  author: string;
  rating: number;
  tags?: string[];
  isDefault?: boolean;
  created_at?: string;
}

export const DEFAULT_REVIEWS: UserReview[] = [
  {
    id: "default_1",
    text: "감정에 치우치지 않고 객관적으로 관계를 돌아볼 수 있어 정말 큰 도움이 되었습니다. 덕분에 더 나은 결정을 내릴 수 있었어요.",
    author: "김*은 (32세, 회사원)",
    rating: 5,
    tags: ["helpful", "professional"],
    isDefault: true,
  },
  {
    id: "default_2",
    text: "남편과 대화가 안 통한다고만 생각했는데, AI 분석을 통해 서로의 소통 패턴을 이해하게 되었어요. 지금은 훨씬 나아졌습니다.",
    author: "이*정 (38세, 주부)",
    rating: 5,
    tags: ["practical", "effective"],
    isDefault: true,
  },
  {
    id: "default_3",
    text: "이별 직전이었는데 HeartSync 덕분에 문제의 핵심을 파악할 수 있었어요. 지금은 더 단단한 관계가 되었습니다.",
    author: "박*호 (29세, 개발자)",
    rating: 5,
    tags: ["empathetic", "effective"],
    isDefault: true,
  },
  {
    id: "default_4",
    text: "50문항 진단 결과가 소름 돋을 정도로 우리 커플의 갈등 패턴을 정확히 짚어줬어요. AI 코치가 알려준 나-전달법 대본대로 말해봤더니 처음으로 안 싸우고 깊게 대화했습니다.",
    author: "최*현 (31세, 디자이너)",
    rating: 5,
    tags: ["practical", "helpful", "warm"],
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    isDefault: false,
  },
  {
    id: "default_5",
    text: "결혼 5년 차에 접어들면서 대화가 줄고 서운함만 쌓였는데, 애착 유형과 감정 은행 계좌 분석을 보고 남편을 이해할 수 있는 실마리를 찾았어요. 부부 상담 가기 부담스러웠는데 정말 만족합니다.",
    author: "정*윤 (36세, 교사)",
    rating: 5,
    tags: ["professional", "empathetic", "effective"],
    created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    isDefault: false,
  },
];

export interface RecommendedReviewTemplate {
  id: string;
  label: string;
  authorName: string;
  profileInfo: string;
  tags: string[];
  text: string;
}

export const RECOMMENDED_REVIEW_TEMPLATES: RecommendedReviewTemplate[] = [
  {
    id: "comm",
    label: "💬 대화법·갈등 해결",
    authorName: "최지현",
    profileInfo: "31세, 직장인",
    tags: ["practical", "helpful", "effective"],
    text: "사소한 말투 때문에 매번 싸움이 커졌는데, 50문항 진단 리포트에서 우리 커플의 방어·비난 패턴을 정확히 짚어줘서 놀랐어요. AI 코치가 추천해준 대화 스크립트대로 먼저 말 건넸더니 상대방도 처음으로 마음을 열어줬습니다.",
  },
  {
    id: "attachment",
    label: "🔗 애착 유형 이해",
    authorName: "김민수",
    profileInfo: "28세, 연인",
    tags: ["professional", "empathetic", "helpful"],
    text: "연락 문제로 늘 불안해하고 서운해했는데, 제가 불안형이고 연인이 회피형 성향이라는 걸 객관적인 수치로 확인하니 막연한 오해가 풀렸어요. 서로를 탓하는 대신 맞춤 솔루션을 하나씩 실천하고 있습니다.",
  },
  {
    id: "marriage",
    label: "💍 부부 권태기·소통",
    authorName: "박서연",
    profileInfo: "37세, 부부",
    tags: ["warm", "effective", "practical"],
    text: "결혼 후 육아와 일에 치여 부부 대화가 단절됐었는데, 부부 상담 센터에 가기 전에 HeartSync로 함께 점검해봤어요. 서로 몰랐던 속마음과 스트레스 지수를 알게 되어 오랜만에 진심 어린 대화를 나눴습니다.",
  },
  {
    id: "aicoach",
    label: "🤖 24시간 AI 코칭",
    authorName: "이준영",
    profileInfo: "33세, 전문직",
    tags: ["empathetic", "warm", "practical"],
    text: "새벽에 다투고 나서 누구에게도 털어놓기 힘들 때 AI 코치와 상담했는데, 내 진단 점수를 바탕으로 감정부터 다독여주고 내일 바로 보낼 수 있는 화해 메시지까지 같이 짜줘서 큰 위로와 도움이 됐습니다.",
  },
  {
    id: "reunion",
    label: "🌱 이별 위기 극복",
    authorName: "한소희",
    profileInfo: "26세, 연인",
    tags: ["helpful", "effective", "empathetic"],
    text: "헤어지기 직전에 지푸라기라도 잡는 심정으로 진단을 해봤어요. 사랑이 식은 게 아니라 소통 기술이 부족했다는 걸 깨닫고, 시계열 체크인으로 매주 관계를 가꾸면서 연애 초기보다 더 단단해졌습니다.",
  },
];

export const FEEDBACK_TAG_OPTIONS = [
  { id: "helpful", label: "도움이 됐어요", emoji: "💡" },
  { id: "empathetic", label: "공감해줘요", emoji: "🤗" },
  { id: "practical", label: "실용적이에요", emoji: "🎯" },
  { id: "professional", label: "전문적이에요", emoji: "📚" },
  { id: "warm", label: "따뜻해요", emoji: "☀️" },
  { id: "effective", label: "관계 개선 효과", emoji: "💑" },
];

export const FEEDBACK_TAG_LABELS: Record<string, string> = {
  helpful: "💡 도움이 됐어요",
  empathetic: "🤗 공감해줘요",
  practical: "🎯 실용적이에요",
  professional: "📚 전문적이에요",
  warm: "☀️ 따뜻해요",
  effective: "💑 관계 개선 효과",
  more_detail: "📝 더 구체적이면 좋겠어요",
};

const REVIEWS_STORAGE_KEY = "heartsync_user_reviews";
const MY_REVIEW_IDS_KEY = "heartsync_my_review_ids";

/**
 * Masks the middle character of a Korean/English name for privacy (e.g., "김지은" -> "김*은").
 */
export function formatMaskedAuthor(rawName: string, profileInfo?: string): string {
  const trimmed = (rawName || "").trim();
  let masked = "HeartSync 사용자";

  if (trimmed) {
    if (trimmed.includes("*")) {
      masked = trimmed;
    } else if (trimmed.length === 2) {
      masked = `${trimmed[0]}*`;
    } else if (trimmed.length >= 3) {
      masked = `${trimmed[0]}*${trimmed.slice(2)}`;
    } else {
      masked = trimmed;
    }
  }

  const info = (profileInfo || "").trim();
  if (info) {
    const cleanInfo = info.replace(/^\(|\)$/g, "");
    return `${masked} (${cleanInfo})`;
  }
  return masked;
}

export function getMyReviewIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(MY_REVIEW_IDS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set();
  }
}

export function loadLocalUserReviews(): UserReview[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(REVIEWS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((r) => r && typeof r.text === "string" && r.text.trim().length > 0);
  } catch {
    return [];
  }
}

function saveLocalUserReviews(reviews: UserReview[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(reviews.slice(0, 100)));
  } catch {
    // Ignore storage error
  }
}

export function getCombinedReviews(extraServerReviews: UserReview[] = []): {
  allReviews: UserReview[];
  userReviews: UserReview[];
  avgRating: number;
  totalCount: number;
} {
  const local = loadLocalUserReviews();
  const map = new Map<string, UserReview>();

  [...local, ...extraServerReviews].forEach((r, idx) => {
    if (!r || !r.text) return;
    const key = r.id ? String(r.id) : `${r.author}_${r.text.slice(0, 20)}_${idx}`;
    if (!map.has(key)) {
      map.set(key, { ...r, isDefault: false });
    }
  });

  const userReviews = Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  );

  const allReviews = [...userReviews, ...DEFAULT_REVIEWS];
  const totalCount = allReviews.length;
  const sum = allReviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
  const avgRating = totalCount > 0 ? sum / totalCount : 5.0;

  return {
    allReviews,
    userReviews,
    avgRating,
    totalCount,
  };
}

export async function submitUserReview(input: {
  text: string;
  authorName?: string;
  profileInfo?: string;
  rawAuthorFormatted?: string;
  rating: number;
  tags?: string[];
}): Promise<UserReview> {
  const id = `rev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const author = input.rawAuthorFormatted
    ? input.rawAuthorFormatted
    : formatMaskedAuthor(input.authorName || "", input.profileInfo || "");

  const newReview: UserReview = {
    id,
    text: input.text.trim(),
    author,
    rating: Math.min(5, Math.max(1, Number(input.rating) || 5)),
    tags: input.tags || [],
    isDefault: false,
    created_at: new Date().toISOString(),
  };

  const existing = loadLocalUserReviews();
  const updated = [newReview, ...existing];
  saveLocalUserReviews(updated);

  try {
    const myIds = getMyReviewIds();
    myIds.add(id);
    localStorage.setItem(MY_REVIEW_IDS_KEY, JSON.stringify(Array.from(myIds)));
  } catch {
    // Ignore
  }

  window.dispatchEvent(new CustomEvent("heartsync:reviews-updated"));

  // Sync to Vercel Serverless API
  try {
    await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newReview),
    });
  } catch {
    // Offline fallback already saved to localStorage
  }

  return newReview;
}

export async function deleteUserReview(reviewId: string): Promise<void> {
  const existing = loadLocalUserReviews();
  const updated = existing.filter((r) => String(r.id) !== String(reviewId));
  saveLocalUserReviews(updated);

  try {
    const myIds = getMyReviewIds();
    myIds.delete(String(reviewId));
    localStorage.setItem(MY_REVIEW_IDS_KEY, JSON.stringify(Array.from(myIds)));
  } catch {
    // Ignore
  }

  window.dispatchEvent(new CustomEvent("heartsync:reviews-updated"));

  try {
    await fetch(`/api/reviews?id=${encodeURIComponent(reviewId)}`, {
      method: "DELETE",
    });
  } catch {
    // Ignore
  }
}

export async function syncReviewsFromServer(): Promise<UserReview[]> {
  try {
    const res = await fetch("/api/reviews", {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return loadLocalUserReviews();
    const data = await res.json();
    const serverItems: UserReview[] = Array.isArray(data?.items) ? data.items : [];

    if (serverItems.length > 0) {
      const local = loadLocalUserReviews();
      const map = new Map<string, UserReview>();
      [...local, ...serverItems].forEach((r) => {
        if (r && r.id && r.text) {
          map.set(String(r.id), { ...r, isDefault: false });
        }
      });
      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
      saveLocalUserReviews(merged);
      return merged;
    }
    return loadLocalUserReviews();
  } catch {
    return loadLocalUserReviews();
  }
}

