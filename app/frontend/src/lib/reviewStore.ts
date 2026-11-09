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
    isDefault: true,
  },
  {
    id: "default_2",
    text: "남편과 대화가 안 통한다고만 생각했는데, AI 분석을 통해 서로의 소통 패턴을 이해하게 되었어요. 지금은 훨씬 나아졌습니다.",
    author: "이*정 (38세, 주부)",
    rating: 5,
    isDefault: true,
  },
  {
    id: "default_3",
    text: "이별 직전이었는데 HeartSync 덕분에 문제의 핵심을 파악할 수 있었어요. 지금은 더 단단한 관계가 되었습니다.",
    author: "박*호 (29세, 개발자)",
    rating: 5,
    isDefault: true,
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
