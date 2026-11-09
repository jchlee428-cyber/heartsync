import { useEffect, useState } from "react";
import {
  ArrowRight,
  Star,
  Sparkles,
  Search,
  FileText,
  MessageSquare,
  Quote,
  PenLine,
  X,
  Check,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@metagptx/web-sdk";
import { toast } from "sonner";
import {
  UserReview,
  DEFAULT_REVIEWS,
  FEEDBACK_TAG_OPTIONS,
  FEEDBACK_TAG_LABELS,
  RECOMMENDED_REVIEW_TEMPLATES,
  formatMaskedAuthor,
  getCombinedReviews,
  getMyReviewIds,
  submitUserReview,
  deleteUserReview,
  syncReviewsFromServer,
} from "@/lib/reviewStore";

const client = createClient();

const COUPLE_CARE_IMAGE = "https://mgx-backend-cdn.metadl.com/generate/images/922264/2026-03-12/89d25058-e6b2-4faa-8167-301e3f416fe9.png";
const MARRIAGE_CARE_IMAGE = "https://mgx-backend-cdn.metadl.com/generate/images/922264/2026-03-12/d0d81c95-f324-41c3-9361-82e202c8adb6.png";

const solutions = [
  {
    title: "Couple Care",
    subtitle: "갈등을 겪는 연인",
    image: COUPLE_CARE_IMAGE,
    gradient: "from-pink-400 to-rose-400",
    altText: "연인 관계 케어 서비스를 나타내는 커플 일러스트",
  },
  {
    title: "Marriage Care",
    subtitle: "이혼을 고민하는 부부",
    image: MARRIAGE_CARE_IMAGE,
    gradient: "from-purple-400 to-pink-400",
    altText: "부부 관계 케어 서비스를 나타내는 부부 일러스트",
  },
];

const QUICK_PROFILE_PRESETS = [
  "20대, 연인",
  "30대, 연인",
  "30대, 부부",
  "40대, 부부",
  "30대, 회사원",
  "30대, 주부",
];

const RATING_LABELS = ["", "별로예요", "아쉬워요", "보통이에요", "좋아요 😊", "최고예요! 💕"];

const processSteps = [
  {
    icon: Search,
    step: "STEP 1",
    title: "관계 진단",
    desc: "50문항 AI 기반 정밀 진단으로 관계 상태를 객관적으로 분석합니다.",
  },
  {
    icon: FileText,
    step: "STEP 2",
    title: "분석 리포트",
    desc: "갈등 원인, 소통 패턴, 애착 유형 등 심층 분석 결과를 제공합니다.",
  },
  {
    icon: Sparkles,
    step: "STEP 3",
    title: "AI 솔루션",
    desc: "맞춤형 관계 개선 전략과 실천 가능한 코칭을 제안합니다.",
  },
  {
    icon: MessageSquare,
    step: "STEP 4",
    title: "챗봇 코칭",
    desc: "24시간 AI 챗봇이 실시간 상담과 지속적인 관계 코칭을 제공합니다.",
  },
];

function formatRelativeDate(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 5) return "방금 전";
  const diffDay = Math.floor(diffMs / 86400000);
  if (diffDay < 1) return "오늘";
  if (diffDay < 7) return `${diffDay}일 전`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}주 전`;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function SolutionSection() {
  const navigate = useNavigate();
  const [allReviews, setAllReviews] = useState<UserReview[]>(DEFAULT_REVIEWS);
  const [avgRating, setAvgRating] = useState<number>(5.0);
  const [totalCount, setTotalCount] = useState<number>(DEFAULT_REVIEWS.length);
  const [myReviewIds, setMyReviewIds] = useState<Set<string>>(() => getMyReviewIds());

  // Review Write Form state
  const [isWriting, setIsWriting] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>(["helpful"]);
  const [authorName, setAuthorName] = useState("");
  const [profileInfo, setProfileInfo] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Pre-fill author name if user is logged in
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed?.name && parsed.name !== "회원") {
          setAuthorName(parsed.name);
        }
      }
    } catch {
      // Ignore
    }

    refreshReviews();

    const handleUpdated = () => refreshReviews();
    window.addEventListener("heartsync:reviews-updated", handleUpdated);
    window.addEventListener("storage", handleUpdated);
    return () => {
      window.removeEventListener("heartsync:reviews-updated", handleUpdated);
      window.removeEventListener("storage", handleUpdated);
    };
  }, []);

  const refreshReviews = async () => {
    // 1. Immediate render from local store + default reviews
    const initial = getCombinedReviews();
    setAllReviews(initial.allReviews);
    setAvgRating(initial.avgRating);
    setTotalCount(initial.totalCount);
    setMyReviewIds(getMyReviewIds());

    // 2. Sync from serverless /api/reviews
    const serverItems = await syncReviewsFromServer();

    // 3. Also try legacy backend chat_ratings if reachable
    let dbReviews: UserReview[] = [];
    try {
      const res = await client.entities.chat_ratings.queryAll({
        query: {},
        sort: "-created_at",
        limit: 50,
      });
      const items = res.data?.items || [];
      dbReviews = items
        .filter((r: any) => r.comment && r.comment.trim().length > 0 && r.rating >= 3)
        .slice(0, 20)
        .map((r: any) => ({
          id: `db_${r.id}`,
          text: r.comment.trim(),
          author: "HeartSync 사용자",
          rating: r.rating || 5,
          tags: r.feedback_tags ? r.feedback_tags.split(",").filter(Boolean) : [],
          isDefault: false,
          created_at: r.created_at || "",
        }));
    } catch {
      // Backend offline — use serverless & local reviews
    }

    const combined = getCombinedReviews([...serverItems, ...dbReviews]);
    setAllReviews(combined.allReviews);
    setAvgRating(combined.avgRating);
    setTotalCount(combined.totalCount);
    setMyReviewIds(getMyReviewIds());
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    );
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedText = reviewText.trim();

    if (rating < 1) {
      toast.warning("별점을 선택해주세요.");
      return;
    }
    if (trimmedText.length < 5) {
      toast.warning("후기 내용을 5자 이상 작성해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitUserReview({
        text: trimmedText,
        authorName: authorName.trim() || "익명",
        profileInfo: profileInfo.trim(),
        rating,
        tags: selectedTags,
      });

      // Best-effort sync to backend chat_ratings if logged in
      try {
        const now = new Date().toISOString().slice(0, 19).replace("T", " ");
        await client.entities.chat_ratings.create({
          data: {
            session_id: 0,
            rating,
            feedback_tags: selectedTags.join(","),
            comment: trimmedText,
            created_at: now,
          },
        });
      } catch {
        // Non-critical
      }

      toast.success("소중한 실제 사용 후기가 등록되었습니다! 💕");
      setReviewText("");
      setIsWriting(false);
      await refreshReviews();
    } catch {
      toast.error("후기 등록 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReview = async (id?: string) => {
    if (!id) return;
    await deleteUserReview(id);
    toast.info("작성한 후기가 삭제되었습니다.");
    await refreshReviews();
  };

  const previewAuthor = formatMaskedAuthor(
    authorName.trim() || "익명",
    profileInfo.trim()
  );

  return (
    <>
      {/* Solutions */}
      <section className="px-5 py-10 max-w-lg mx-auto" aria-labelledby="solutions-heading">
        <div className="text-center mb-2">
          <span className="text-xs font-semibold text-pink-500 tracking-widest uppercase">
            Service Guide
          </span>
        </div>
        <h2 id="solutions-heading" className="text-center text-2xl font-extrabold text-gray-900 mb-8">
          맞춤형 솔루션
        </h2>

        <div className="space-y-4" role="list" aria-label="서비스 목록">
          {solutions.map((sol) => (
            <article
              key={sol.title}
              className="relative rounded-2xl overflow-hidden shadow-lg group cursor-pointer hover:shadow-xl transition-all duration-300 focus-within:ring-2 focus-within:ring-pink-500 focus-within:ring-offset-2"
              role="listitem"
            >
              <img
                src={sol.image}
                alt={sol.altText}
                className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" aria-hidden="true" />
              <div className="absolute bottom-0 left-0 right-0 p-5 flex items-end justify-between">
                <div>
                  <h3 className="text-white font-bold text-lg">{sol.title}</h3>
                  <p className="text-white/80 text-sm">{sol.subtitle}</p>
                </div>
                <div
                  className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors"
                  aria-hidden="true"
                >
                  <ArrowRight className="w-5 h-5 text-white" />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Reviews */}
      <section className="px-5 py-10 max-w-lg mx-auto" aria-labelledby="reviews-heading">
        <h2 id="reviews-heading" className="text-center text-2xl font-extrabold text-gray-900 mb-2">
          실제 사용자 후기
        </h2>
        <p className="text-center text-sm text-gray-500 mb-4">
          HeartSync를 경험한 분들의 이야기
        </p>

        {/* Average Rating Summary & Write Button */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-5 bg-pink-50/60 border border-pink-100 rounded-2xl px-4 py-3">
          <div
            className="flex items-center gap-2"
            aria-label={`평균 평점 ${avgRating.toFixed(1)}점, ${totalCount}명 참여`}
          >
            <div className="flex items-center gap-0.5" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`w-4 h-4 ${
                    s <= Math.round(avgRating)
                      ? "fill-amber-400 text-amber-400"
                      : "text-gray-200"
                  }`}
                />
              ))}
            </div>
            <span className="text-sm font-extrabold text-gray-900">{avgRating.toFixed(1)}</span>
            <span className="text-xs text-gray-500">({totalCount}개 후기)</span>
          </div>

          <button
            type="button"
            onClick={() => setIsWriting((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold shadow-sm transition-all ${
              isWriting
                ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                : "bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:shadow-md hover:scale-[1.02]"
            }`}
          >
            {isWriting ? (
              <>
                <X className="w-3.5 h-3.5" />
                작성 닫기
              </>
            ) : (
              <>
                <PenLine className="w-3.5 h-3.5" />
                실제 사용 후기 작성하기
              </>
            )}
          </button>
        </div>

        {/* Interactive Review Write Form */}
        {isWriting && (
          <form
            onSubmit={handleSubmitReview}
            className="bg-white rounded-2xl p-5 mb-6 shadow-lg border-2 border-pink-200 animate-fade-in space-y-4"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-1.5">
                  <PenLine className="w-4 h-4 text-pink-500" />
                  실제 사용 후기 남기기
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  작성하신 후기는 다른 커플들에게 큰 힘이 됩니다 💕
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsWriting(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full"
                aria-label="후기 작성 닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 1. Star Rating */}
            <div className="text-center py-1">
              <p className="text-xs font-semibold text-gray-600 mb-2">만족도를 선택해주세요</p>
              <div className="flex items-center justify-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                    className="p-1 transition-transform hover:scale-110 focus:outline-none"
                    aria-label={`${star}점`}
                  >
                    <Star
                      className={`w-7 h-7 transition-colors ${
                        star <= (hoverRating || rating)
                          ? "fill-amber-400 text-amber-400"
                          : "text-gray-200"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-xs font-bold text-pink-600 mt-1">
                {RATING_LABELS[hoverRating || rating]}
              </p>
            </div>

            {/* 2. Feedback Tags */}
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-2">
                어떤 점이 좋았나요? <span className="text-gray-400 font-normal">(다중 선택)</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {FEEDBACK_TAG_OPTIONS.map((tag) => {
                  const active = selectedTags.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-medium border transition-all ${
                        active
                          ? "bg-pink-50 border-pink-300 text-pink-700 font-bold shadow-sm"
                          : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      <span>{tag.emoji}</span>
                      <span>{tag.label}</span>
                      {active && <Check className="w-3 h-3 text-pink-600" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Author Name & Profile Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                  이름 또는 닉네임 <span className="text-gray-400 font-normal">(자동 마스킹)</span>
                </label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="예: 김지은"
                  maxLength={20}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs focus:outline-none focus:border-pink-400 focus:bg-white transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                  연령대 / 소개 <span className="text-gray-400 font-normal">(선택)</span>
                </label>
                <input
                  type="text"
                  value={profileInfo}
                  onChange={(e) => setProfileInfo(e.target.value)}
                  placeholder="예: 32세, 회사원"
                  maxLength={25}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs focus:outline-none focus:border-pink-400 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Quick Profile Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-gray-400 mr-1">빠른 선택:</span>
              {QUICK_PROFILE_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setProfileInfo(preset)}
                  className={`px-2 py-0.5 rounded-full text-[10px] border transition-colors ${
                    profileInfo === preset
                      ? "bg-pink-100 border-pink-300 text-pink-700 font-bold"
                      : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* 4. Recommended Templates + Review Textarea */}
            <div>
              <div className="mb-2">
                <p className="text-[11px] font-semibold text-pink-600 mb-1.5 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  추천 후기 템플릿 (클릭하면 내용이 자동 입력됩니다)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {RECOMMENDED_REVIEW_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => {
                        setReviewText(tpl.text);
                        setSelectedTags(tpl.tags);
                        if (!profileInfo.trim()) setProfileInfo(tpl.profileInfo);
                        if (!authorName.trim()) setAuthorName(tpl.authorName);
                        setRating(5);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-pink-50/80 hover:bg-pink-100 border border-pink-200 text-pink-700 text-[11px] font-semibold transition-all active:scale-95"
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-gray-600">
                  후기 내용 <span className="text-pink-500">*</span>
                </label>
                <span className="text-[10px] text-gray-400">{reviewText.length}/500자</span>
              </div>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="위 추천 후기 템플릿을 클릭하거나, 50문항 관계 진단·AI 코칭을 통해 느낀 점을 자유롭게 작성해주세요."
                rows={3}
                maxLength={500}
                className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs leading-relaxed focus:outline-none focus:border-pink-400 focus:bg-white focus:ring-2 focus:ring-pink-100 transition-all"
              />
            </div>

            {/* Preview & Submit */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-gray-400">
                표시 작성자: <strong className="text-gray-600">{previewAuthor}</strong>
              </span>
              <button
                type="submit"
                disabled={isSubmitting || reviewText.trim().length < 5}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold text-xs shadow-md hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-40 disabled:scale-100"
              >
                <PenLine className="w-3.5 h-3.5" />
                {isSubmitting ? "등록 중..." : "후기 등록하기"}
              </button>
            </div>
          </form>
        )}

        <div className="space-y-4" role="list" aria-label="사용자 후기 목록">
          {allReviews.map((review, idx) => {
            const isMine = Boolean(review.id && myReviewIds.has(String(review.id)));
            return (
              <article
                key={review.id || idx}
                className={`bg-white rounded-2xl p-5 shadow-md border hover:shadow-lg transition-shadow duration-300 ${
                  review.isDefault ? "border-gray-50" : "border-pink-100"
                }`}
                role="listitem"
              >
                {/* Rating Stars & Optional Delete */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-0.5" aria-label={`평점 ${review.rating}점`}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < review.rating
                            ? "text-amber-400 fill-amber-400"
                            : "text-gray-200"
                        }`}
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                  {isMine && review.id && (
                    <button
                      type="button"
                      onClick={() => handleDeleteReview(review.id)}
                      className="inline-flex items-center gap-1 text-[10px] text-gray-400 hover:text-red-500 transition-colors"
                      title="내 후기 삭제"
                    >
                      <Trash2 className="w-3 h-3" />
                      삭제
                    </button>
                  )}
                </div>

                {/* Review Text */}
                <blockquote className="text-gray-600 text-sm leading-relaxed mb-3">
                  <Quote className="w-3.5 h-3.5 text-pink-300 inline-block mr-1 -mt-0.5" aria-hidden="true" />
                  {review.text}
                </blockquote>

                {/* Feedback Tags */}
                {!review.isDefault && review.tags && review.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2" aria-label="피드백 태그">
                    {review.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2 py-0.5 bg-pink-50 text-pink-600 text-[10px] font-medium rounded-full"
                      >
                        {FEEDBACK_TAG_LABELS[tag] || tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Author & Date */}
                <footer className="flex items-center justify-between">
                  <p className="text-gray-400 text-xs font-medium">
                    {review.author}
                  </p>
                  <div className="flex items-center gap-2">
                    {!review.isDefault && review.created_at && (
                      <time className="text-[10px] text-gray-300" dateTime={review.created_at}>
                        {formatRelativeDate(review.created_at)}
                      </time>
                    )}
                    {!review.isDefault && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-green-50 text-green-600 text-[9px] font-bold rounded-full">
                        ✅ 인증 후기
                      </span>
                    )}
                  </div>
                </footer>
              </article>
            );
          })}
        </div>
      </section>

      {/* Process */}
      <section className="px-5 py-10 max-w-lg mx-auto" aria-labelledby="process-heading">
        <div className="text-center mb-2">
          <span className="text-xs font-semibold text-pink-500 tracking-widest uppercase">
            How It Works
          </span>
        </div>
        <h2 id="process-heading" className="text-center text-2xl font-extrabold text-gray-900 mb-8">
          서비스 이용 과정
        </h2>

        <ol className="relative list-none" aria-label="서비스 이용 단계">
          {/* Vertical line */}
          <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gradient-to-b from-pink-300 via-pink-400 to-pink-300" aria-hidden="true" />

          <div className="space-y-6">
            {processSteps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <li key={idx} className="flex items-start gap-4 relative">
                  <div
                    className="relative z-10 w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg flex-shrink-0"
                    aria-hidden="true"
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 bg-white rounded-2xl p-4 shadow-sm border border-gray-50 hover:shadow-md transition-shadow">
                    <span className="text-[10px] font-bold text-pink-500 tracking-wider">
                      {step.step}
                    </span>
                    <h3 className="text-base font-bold text-gray-900 mt-0.5">
                      {step.title}
                    </h3>
                    <p className="text-gray-500 text-xs leading-relaxed mt-1">
                      {step.desc}
                    </p>
                  </div>
                </li>
              );
            })}
          </div>
        </ol>

        {/* Final CTA */}
        <div className="mt-10 text-center">
          <button
            onClick={() => navigate("/diagnosis")}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold text-base px-10 py-4 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2"
          >
            지금 무료 진단 시작하기
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
          <p className="text-gray-400 text-xs mt-3">
            로그인 후 바로 시작할 수 있습니다
          </p>
        </div>
      </section>

      {/* Spacer for bottom nav */}
      <div className="h-20" aria-hidden="true" />
    </>
  );
}
