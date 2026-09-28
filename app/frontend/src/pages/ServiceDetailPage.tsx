import { ArrowLeft, ArrowRight, Heart, Shield, Brain, MessageSquare, FileText, Sparkles, CheckCircle, Users, Clock, Lock, BarChart3, Lightbulb, Target, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";

const HERO_IMAGE = "https://mgx-backend-cdn.metadl.com/generate/images/922264/2026-03-12/455930b8-16a1-4334-8961-f2e16ae2fa9f.png";
const COUPLE_CARE_IMAGE = "https://mgx-backend-cdn.metadl.com/generate/images/922264/2026-03-12/89d25058-e6b2-4faa-8167-301e3f416fe9.png";
const MARRIAGE_CARE_IMAGE = "https://mgx-backend-cdn.metadl.com/generate/images/922264/2026-03-12/d0d81c95-f324-41c3-9361-82e202c8adb6.png";

const diagnosisCategories = [
  {
    icon: Heart,
    title: "애착 유형 분석",
    description: "안정형, 불안형, 회피형 등 당신의 애착 유형을 정밀 분석하여 관계 패턴을 이해합니다.",
    color: "from-pink-500 to-rose-500",
    bgColor: "bg-pink-50",
    textColor: "text-pink-600",
  },
  {
    icon: MessageSquare,
    title: "소통 패턴 진단",
    description: "대화 방식, 갈등 해결 스타일, 감정 표현 방식을 분석하여 소통 개선점을 찾습니다.",
    color: "from-blue-500 to-cyan-500",
    bgColor: "bg-blue-50",
    textColor: "text-blue-600",
  },
  {
    icon: BarChart3,
    title: "관계 만족도 측정",
    description: "친밀감, 신뢰도, 헌신도 등 다차원적 관계 만족도를 수치화하여 보여줍니다.",
    color: "from-purple-500 to-pink-500",
    bgColor: "bg-purple-50",
    textColor: "text-purple-600",
  },
  {
    icon: Lightbulb,
    title: "갈등 원인 파악",
    description: "반복되는 갈등의 근본 원인을 심리학적 관점에서 분석하고 해결 방향을 제시합니다.",
    color: "from-amber-500 to-orange-500",
    bgColor: "bg-amber-50",
    textColor: "text-amber-600",
  },
];

const processSteps = [
  {
    step: "01",
    title: "회원가입 & 로그인",
    description: "간편한 소셜 로그인으로 시작하세요. 개인정보는 안전하게 보호됩니다.",
    icon: Lock,
  },
  {
    step: "02",
    title: "50문항 AI 진단",
    description: "심리학 기반 50개 문항에 답변하면 AI가 관계 상태를 정밀 분석합니다.",
    icon: Brain,
  },
  {
    step: "03",
    title: "맞춤형 분석 리포트",
    description: "애착 유형, 소통 패턴, 갈등 원인 등 상세한 분석 결과를 확인하세요.",
    icon: FileText,
  },
  {
    step: "04",
    title: "AI 솔루션 & 코칭",
    description: "분석 결과를 바탕으로 맞춤형 관계 개선 전략과 실천 방법을 제안합니다.",
    icon: Sparkles,
  },
  {
    step: "05",
    title: "24시간 챗봇 상담",
    description: "언제든지 AI 챗봇과 대화하며 관계 고민을 상담받을 수 있습니다.",
    icon: MessageSquare,
  },
];

const features = [
  {
    icon: Brain,
    title: "AI 기반 정밀 분석",
    description: "최신 AI 기술과 심리학 이론을 결합한 과학적 관계 진단",
  },
  {
    icon: Shield,
    title: "100% 비밀 보장",
    description: "모든 데이터는 암호화되어 안전하게 보호됩니다",
  },
  {
    icon: Clock,
    title: "24시간 이용 가능",
    description: "시간과 장소에 구애받지 않고 언제든 진단 및 상담 가능",
  },
  {
    icon: Target,
    title: "맞춤형 솔루션",
    description: "개인별 관계 상태에 최적화된 구체적 개선 방안 제시",
  },
  {
    icon: Users,
    title: "커플 함께 진단",
    description: "두 사람이 함께 진단하면 더 정확한 관계 분석이 가능합니다",
  },
  {
    icon: Zap,
    title: "즉시 결과 확인",
    description: "진단 완료 즉시 상세한 분석 리포트를 확인할 수 있습니다",
  },
];

const targetUsers = [
  {
    image: COUPLE_CARE_IMAGE,
    title: "갈등을 겪는 연인",
    subtitle: "Couple Care",
    points: [
      "반복되는 다툼의 원인을 알고 싶은 커플",
      "서로의 감정을 더 잘 이해하고 싶은 연인",
      "이별 위기를 극복하고 싶은 커플",
      "더 건강한 관계를 만들고 싶은 연인",
    ],
    gradient: "from-pink-500 to-rose-500",
  },
  {
    image: MARRIAGE_CARE_IMAGE,
    title: "이혼을 고민하는 부부",
    subtitle: "Marriage Care",
    points: [
      "대화가 단절된 부부",
      "이혼 전 마지막으로 관계를 점검하고 싶은 부부",
      "자녀를 위해 관계 개선을 원하는 부부",
      "권태기를 극복하고 싶은 부부",
    ],
    gradient: "from-purple-500 to-pink-500",
  },
];

export default function ServiceDetailPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-pink-50/20 to-white">
      <Header />

      <div className="max-w-lg mx-auto px-5 pt-6 pb-28">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-gray-600 text-sm font-medium mb-6 px-3 py-2 rounded-lg bg-white shadow-sm border border-gray-200 hover:bg-gray-50 hover:text-gray-900 transition-all active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          이전 페이지로
        </button>

        {/* Hero Section */}
        <div className="relative rounded-2xl overflow-hidden mb-8 shadow-xl">
          <img
            src={HERO_IMAGE}
            alt="HeartSync 서비스 소개"
            className="w-full h-56 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white/90 text-xs font-medium mb-3 border border-white/20">
              AI 기반 관계 진단 플랫폼
            </span>
            <h1 className="text-2xl font-extrabold text-white leading-tight mb-2">
              HeartSync
              <br />
              <span className="text-yellow-200">서비스 상세 소개</span>
            </h1>
            <p className="text-white/80 text-sm">
              심리학과 AI 기술로 당신의 관계를 진단하고 개선합니다
            </p>
          </div>
        </div>

        {/* What is HeartSync */}
        <section className="mb-10">
          <div className="text-center mb-6">
            <span className="text-xs font-semibold text-pink-500 tracking-widest uppercase">
              About HeartSync
            </span>
            <h2 className="text-xl font-extrabold text-gray-900 mt-1">
              HeartSync란?
            </h2>
          </div>

          <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl p-6 border border-pink-100">
            <p className="text-gray-700 text-[15px] leading-relaxed mb-4">
              <span className="font-bold text-pink-600">HeartSync</span>는 최신 AI 기술과 심리학 이론을 결합하여 커플·부부의 관계를 과학적으로 진단하고, 맞춤형 솔루션을 제공하는{" "}
              <span className="font-semibold text-gray-900">AI 관계 코칭 플랫폼</span>입니다.
            </p>
            <p className="text-gray-600 text-sm leading-relaxed mb-4">
              자동차도 정기적으로 정비를 받고, 건강도 정기 검진을 받습니다. 하지만 가장 소중한 <span className="font-semibold text-gray-800">사람과의 관계</span>는 어떤가요?
            </p>
            <div className="flex items-center gap-2 bg-white/80 px-4 py-3 rounded-xl border border-pink-100">
              <Heart className="w-5 h-5 text-pink-500 fill-pink-500 flex-shrink-0" />
              <p className="text-pink-700 text-sm font-semibold">
                관계의 문제는 '사랑이 부족해서'가 아니라 '기술이 부족해서' 생깁니다.
              </p>
            </div>
          </div>
        </section>

        {/* Diagnosis Categories */}
        <section className="mb-10">
          <div className="text-center mb-6">
            <span className="text-xs font-semibold text-pink-500 tracking-widest uppercase">
              Diagnosis
            </span>
            <h2 className="text-xl font-extrabold text-gray-900 mt-1">
              무엇을 진단하나요?
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              50문항으로 관계의 핵심 영역을 분석합니다
            </p>
          </div>

          <div className="space-y-3">
            {diagnosisCategories.map((cat) => {
              const Icon = cat.icon;
              return (
                <div
                  key={cat.title}
                  className="bg-white rounded-2xl p-5 shadow-md border border-gray-50 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-bold text-gray-900 mb-1">{cat.title}</h3>
                      <p className="text-sm text-gray-500 leading-relaxed">{cat.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* How It Works */}
        <section className="mb-10">
          <div className="text-center mb-6">
            <span className="text-xs font-semibold text-pink-500 tracking-widest uppercase">
              How It Works
            </span>
            <h2 className="text-xl font-extrabold text-gray-900 mt-1">
              이용 과정
            </h2>
          </div>

          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[23px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-pink-300 via-pink-400 to-pink-300" />

            <div className="space-y-5">
              {processSteps.map((step) => {
                const Icon = step.icon;
                return (
                  <div key={step.step} className="flex items-start gap-4 relative">
                    <div className="relative z-10 w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg flex-shrink-0">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold text-pink-500 tracking-wider bg-pink-50 px-2 py-0.5 rounded-full">
                          STEP {step.step}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-gray-900 mb-1">{step.title}</h3>
                      <p className="text-sm text-gray-500 leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Target Users */}
        <section className="mb-10">
          <div className="text-center mb-6">
            <span className="text-xs font-semibold text-pink-500 tracking-widest uppercase">
              Who Is It For
            </span>
            <h2 className="text-xl font-extrabold text-gray-900 mt-1">
              이런 분들에게 추천합니다
            </h2>
          </div>

          <div className="space-y-5">
            {targetUsers.map((target) => (
              <div
                key={target.title}
                className="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-50"
              >
                <div className="relative">
                  <img
                    src={target.image}
                    alt={target.title}
                    className="w-full h-36 object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-white font-bold text-lg">{target.title}</h3>
                    <p className="text-white/70 text-xs">{target.subtitle}</p>
                  </div>
                </div>
                <div className="p-5">
                  <ul className="space-y-2.5">
                    {target.points.map((point, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <CheckCircle className="w-4 h-4 text-pink-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-600">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="mb-10">
          <div className="text-center mb-6">
            <span className="text-xs font-semibold text-pink-500 tracking-widest uppercase">
              Features
            </span>
            <h2 className="text-xl font-extrabold text-gray-900 mt-1">
              HeartSync의 특장점
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="bg-white rounded-2xl p-4 shadow-md border border-gray-50 hover:shadow-lg transition-shadow"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 mb-1">{feature.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Pricing Teaser */}
        <section className="mb-10">
          <div className="bg-gradient-to-br from-pink-500 to-rose-500 rounded-2xl p-6 text-center shadow-xl">
            <Sparkles className="w-8 h-8 text-yellow-200 mx-auto mb-3" />
            <h2 className="text-xl font-extrabold text-white mb-2">
              지금 바로 시작하세요
            </h2>
            <p className="text-white/80 text-sm mb-5 leading-relaxed">
              무료 진단으로 관계 상태를 확인하고,
              <br />
              프리미엄 분석으로 더 깊은 인사이트를 얻으세요.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => navigate("/diagnosis?fresh=true")}
                className="w-full inline-flex items-center justify-center gap-2 bg-white text-pink-600 font-bold text-base px-8 py-3.5 rounded-full shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300"
              >
                무료 진단 시작하기
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate("/pricing")}
                className="w-full inline-flex items-center justify-center gap-2 bg-white/20 backdrop-blur-sm text-white font-semibold text-sm px-8 py-3 rounded-full border border-white/30 hover:bg-white/30 transition-all duration-300"
              >
                요금제 보기
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-6">
          <div className="text-center mb-6">
            <span className="text-xs font-semibold text-pink-500 tracking-widest uppercase">
              FAQ
            </span>
            <h2 className="text-xl font-extrabold text-gray-900 mt-1">
              자주 묻는 질문
            </h2>
          </div>

          <div className="space-y-3">
            {[
              {
                q: "진단은 정말 무료인가요?",
                a: "네, 기본 50문항 진단과 요약 리포트는 완전 무료입니다. 더 상세한 심층 분석과 AI 코칭은 유료 플랜을 통해 이용하실 수 있습니다.",
              },
              {
                q: "개인정보는 안전한가요?",
                a: "모든 데이터는 SSL 암호화로 전송되며, 서버에서도 암호화되어 저장됩니다. 제3자에게 절대 공유되지 않습니다.",
              },
              {
                q: "혼자서도 진단할 수 있나요?",
                a: "네, 혼자서도 충분히 의미 있는 진단이 가능합니다. 커플이 함께 진단하면 더 정확한 비교 분석을 받을 수 있습니다.",
              },
              {
                q: "진단 결과는 얼마나 정확한가요?",
                a: "심리학 연구 기반의 검증된 문항과 최신 AI 분석 기술을 결합하여 높은 정확도를 제공합니다. 다만, 전문 상담사의 대면 상담을 완전히 대체하지는 않습니다.",
              },
            ].map((faq, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50"
              >
                <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-start gap-2">
                  <span className="text-pink-500 font-extrabold">Q.</span>
                  {faq.q}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed pl-6">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <BottomNav />
    </div>
  );
}