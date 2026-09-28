import { CheckCircle, ShieldCheck, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const HERO_IMAGE = "https://mgx-backend-cdn.metadl.com/generate/images/922264/2026-03-12/455930b8-16a1-4334-8961-f2e16ae2fa9f.png";

export default function HeroSection() {
  const navigate = useNavigate();
  const [count, setCount] = useState(0);
  const targetCount = 12492;

  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const increment = targetCount / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= targetCount) {
        setCount(targetCount);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative pt-14 overflow-hidden" aria-label="히어로 배너">
      {/* Hero Background */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-pink-600/90 via-rose-500/85 to-pink-700/90 z-10" aria-hidden="true" />
        <img
          src={HERO_IMAGE}
          alt="커플이 함께 소통하는 따뜻한 일러스트"
          className="w-full h-[520px] object-cover"
        />

        {/* Content overlay */}
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6 text-center">
          <div className="animate-slide-up">
            <span className="inline-block px-4 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-white/90 text-xs font-medium mb-5 border border-white/20">
              커플을 위한 AI 코칭
            </span>

            <h1 className="text-[28px] leading-tight font-extrabold text-white mb-4 tracking-tight">
              AI가 커플 관계를
              <br />
              진단하고 개선하는
              <br />
              <span className="text-yellow-200">안전한 코칭 플랫폼</span>
            </h1>

            <button
              onClick={() => navigate("/diagnosis?fresh=true")}
              className="mt-2 inline-flex items-center gap-2 bg-white text-pink-600 font-bold text-base px-8 py-3.5 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 animate-pulse-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-pink-500"
            >
              무료 진단 시작하기
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              onClick={() => navigate("/pricing")}
              className="mt-3 inline-flex items-center gap-1.5 text-white/80 text-sm font-medium hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-pink-500 rounded-lg px-3 py-1"
            >
              요금제 보기 →
            </button>
          </div>

          {/* Feature badges */}
          <ul className="mt-8 space-y-2.5 animate-fade-in delay-300 list-none" aria-label="주요 특징">
            <li className="flex items-center gap-2 text-white/90 text-sm">
              <CheckCircle className="w-4 h-4 text-green-300 flex-shrink-0" aria-hidden="true" />
              <span>50문항 진단 리포트 무료 제공</span>
            </li>
            <li className="flex items-center gap-2 text-white/90 text-sm">
              <CheckCircle className="w-4 h-4 text-green-300 flex-shrink-0" aria-hidden="true" />
              <span>심층 상세검사 및 해결책 코칭</span>
            </li>
          </ul>

          {/* User count */}
          <div
            className="mt-6 flex items-center gap-2 bg-white/15 backdrop-blur-sm px-5 py-2.5 rounded-full border border-white/20 animate-fade-in delay-500"
            aria-live="polite"
            aria-atomic="true"
          >
            <ShieldCheck className="w-4 h-4 text-green-300" aria-hidden="true" />
            <span className="text-white/90 text-xs font-medium">
              현재까지{" "}
              <span className="text-white font-bold text-sm" aria-label={`${targetCount.toLocaleString()}명`}>
                {count.toLocaleString()}
              </span>
              명이 진단을 완료했습니다
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}