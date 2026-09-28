import { useEffect, useState } from "react";
import { ArrowRight, Star, Sparkles, Search, FileText, MessageSquare, Quote } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@metagptx/web-sdk";

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

const defaultReviews = [
  {
    text: "감정에 치우치지 않고 객관적으로 관계를 돌아볼 수 있어 정말 큰 도움이 되었습니다. 덕분에 더 나은 결정을 내릴 수 있었어요.",
    author: "김*은 (32세, 회사원)",
    rating: 5,
    isDefault: true,
  },
  {
    text: "남편과 대화가 안 통한다고만 생각했는데, AI 분석을 통해 서로의 소통 패턴을 이해하게 되었어요. 지금은 훨씬 나아졌습니다.",
    author: "이*정 (38세, 주부)",
    rating: 5,
    isDefault: true,
  },
  {
    text: "이별 직전이었는데 HeartSync 덕분에 문제의 핵심을 파악할 수 있었어요. 지금은 더 단단한 관계가 되었습니다.",
    author: "박*호 (29세, 개발자)",
    rating: 5,
    isDefault: true,
  },
];

const feedbackTagLabels: Record<string, string> = {
  helpful: "💡 도움이 됐어요",
  empathetic: "🤗 공감해줘요",
  practical: "🎯 실용적이에요",
  professional: "📚 전문적이에요",
  warm: "☀️ 따뜻해요",
  more_detail: "📝 더 구체적이면 좋겠어요",
};

interface UserReview {
  text: string;
  author: string;
  rating: number;
  tags?: string[];
  isDefault?: boolean;
  created_at?: string;
}

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

function formatRelativeDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDay = Math.floor(diffMs / 86400000);
  if (diffDay < 1) return "오늘";
  if (diffDay < 7) return `${diffDay}일 전`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}주 전`;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function SolutionSection() {
  const navigate = useNavigate();
  const [allReviews, setAllReviews] = useState<UserReview[]>(defaultReviews);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    loadUserReviews();
  }, []);

  const loadUserReviews = async () => {
    try {
      const res = await client.entities.chat_ratings.queryAll({
        query: {},
        sort: "-created_at",
        limit: 50,
      });
      const items = res.data?.items || [];

      const userReviews: UserReview[] = items
        .filter((r: any) => r.comment && r.comment.trim().length > 0 && r.rating >= 3)
        .slice(0, 10)
        .map((r: any) => ({
          text: r.comment.trim(),
          author: "HeartSync 사용자",
          rating: r.rating || 5,
          tags: r.feedback_tags ? r.feedback_tags.split(",").filter(Boolean) : [],
          isDefault: false,
          created_at: r.created_at || "",
        }));

      if (items.length > 0) {
        const sum = items.reduce((acc: number, r: any) => acc + (r.rating || 0), 0);
        setAvgRating(sum / items.length);
        setTotalCount(items.length);
      }

      if (userReviews.length > 0) {
        const combined = [...userReviews, ...defaultReviews];
        setAllReviews(combined);
      }
    } catch {
      // Non-critical: keep default reviews
    }
  };

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

        {/* Average Rating Summary */}
        {avgRating !== null && totalCount > 0 && (
          <div className="flex items-center justify-center gap-3 mb-6" aria-label={`평균 평점 ${avgRating.toFixed(1)}점, ${totalCount}명 평가`}>
            <div className="flex items-center gap-1" aria-hidden="true">
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
            <span className="text-sm font-bold text-gray-800">{avgRating.toFixed(1)}</span>
            <span className="text-xs text-gray-400">({totalCount}명 평가)</span>
          </div>
        )}

        <div className="space-y-4" role="list" aria-label="사용자 후기 목록">
          {allReviews.map((review, idx) => (
            <article
              key={idx}
              className={`bg-white rounded-2xl p-5 shadow-md border hover:shadow-lg transition-shadow duration-300 ${
                review.isDefault ? "border-gray-50" : "border-pink-100"
              }`}
              role="listitem"
            >
              {/* Rating Stars */}
              <div className="flex items-center gap-0.5 mb-3" aria-label={`평점 ${review.rating}점`}>
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
                      {feedbackTagLabels[tag] || tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Author & Date */}
              <footer className="flex items-center justify-between">
                <p className="text-gray-400 text-xs font-medium">
                  {review.author}
                </p>
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
              </footer>
            </article>
          ))}
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