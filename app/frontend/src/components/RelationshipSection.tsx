import { Heart, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AI_IMAGE = "https://mgx-backend-cdn.metadl.com/generate/images/922264/2026-03-12/908c1207-f5f2-4852-bdba-8034ba2d5484.png";

export default function RelationshipSection() {
  const navigate = useNavigate();

  return (
    <section className="px-5 py-12 max-w-lg mx-auto" aria-labelledby="relationship-heading">
      {/* Title */}
      <div className="text-center mb-8 animate-slide-up">
        <h2 id="relationship-heading" className="text-2xl font-extrabold text-gray-900 leading-snug">
          당신의 관계,
          <br />
          안녕<span className="text-pink-500">하</span> 👋 십니까?
        </h2>
      </div>

      {/* Description */}
      <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl p-6 mb-6 border border-pink-100">
        <p className="text-gray-600 text-[15px] leading-relaxed">
          자동차도 <span className="font-semibold text-gray-800">1년에 한 번</span> 정비를 받고,
          <br />
          우리 몸도 <span className="font-semibold text-gray-800">2년에 한 번</span> 검진을 받습니다.
          <br />
          <span className="text-gray-800 font-medium">
            당신의 소중한 연인, 배우자 관계는 어떠신가요?
          </span>
        </p>
      </div>

      {/* AI Image Card */}
      <figure className="relative rounded-2xl overflow-hidden mb-6 shadow-lg">
        <img
          src={AI_IMAGE}
          alt="AI 기술로 커플 관계를 분석하는 모습을 나타내는 일러스트"
          className="w-full h-48 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" aria-hidden="true" />
        <figcaption className="absolute bottom-0 left-0 right-0 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-5 h-5 text-pink-400 fill-pink-400" aria-hidden="true" />
            <span className="text-white font-bold text-sm">
              HeartSync는 믿습니다.
            </span>
          </div>
          <p className="text-white/90 text-xs leading-relaxed">
            관계의 문제는 &apos;사랑이 부족해서&apos;가 아니라{" "}
            <span className="text-yellow-300 font-semibold">
              &apos;기술이 부족해서&apos;
            </span>{" "}
            생깁니다.
          </p>
        </figcaption>
      </figure>

      {/* Message Card */}
      <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 mb-6">
        <p className="text-gray-600 text-sm leading-relaxed mb-4">
          심리학과 AI 기술로 당신의 관계를 정밀 진단하고, 다시 설렐 수 있는
          구체적인 처방전을 드립니다.
        </p>
        <div className="flex items-center gap-2 bg-pink-50 px-4 py-3 rounded-xl" role="note">
          <span className="text-pink-600 text-sm font-bold" aria-hidden="true">💕</span>
          <p className="text-pink-700 text-xs font-semibold">
            헤어지기 전, 마지막으로 확인해보세요.
          </p>
        </div>
        <p className="text-gray-500 text-xs mt-3 text-center">
          내 관계, AI가 편견 없이 함께 점검합니다.
        </p>
      </div>

      {/* CTA Button */}
      <button
        onClick={() => navigate("/service-detail")}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold py-4 rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2"
      >
        서비스 상세 소개 보기
        <ArrowRight className="w-4 h-4" aria-hidden="true" />
      </button>
    </section>
  );
}