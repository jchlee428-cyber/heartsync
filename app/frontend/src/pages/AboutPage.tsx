import { ArrowLeft, Building2, MapPin, Phone, Mail, FileText, Shield, Heart, Users, Award, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import Footer from "@/components/Footer";

const companyInfo = {
  name: "주식회사 레드뱅크",
  ceo: "이종철",
  registrationNumber: "132-86-23186",
  telecomRegistration: "제2016-서울송파-0856호",
  address: "서울특별시 송파구 문정로 246, 2호 (마천동, 사회적경제센터 1-1)",
  phone: "1599-9573",
  email: "vikin@hanmail.net",
};

const businessAreas = [
  { category: "업태", items: ["사업서비스업"] },
  { category: "종목", items: ["소프트웨어자문 개발및공급업"] },
];

const values = [
  {
    icon: Heart,
    title: "관계의 가치",
    description: "모든 관계는 소중합니다. 우리는 AI 기술을 통해 더 건강하고 행복한 관계를 만들어갑니다.",
  },
  {
    icon: Shield,
    title: "신뢰와 안전",
    description: "개인정보 보호와 데이터 보안을 최우선으로 생각하며, 안전한 서비스를 제공합니다.",
  },
  {
    icon: Users,
    title: "전문성",
    description: "심리학 이론과 최신 AI 기술을 결합하여 과학적이고 전문적인 코칭을 제공합니다.",
  },
  {
    icon: Award,
    title: "지속적 혁신",
    description: "끊임없는 연구와 개발을 통해 더 나은 관계 코칭 서비스를 만들어갑니다.",
  },
];

export default function AboutPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-pink-50/30 to-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-pink-100" role="banner">
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 h-14 sm:h-16">
          <button
            onClick={() => navigate("/")}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-pink-50 active:bg-pink-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2"
            aria-label="홈으로 돌아가기"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" aria-hidden="true" />
          </button>
          <h1 className="text-[17px] sm:text-[18px] font-bold text-gray-900 tracking-[-0.02em]">회사소개</h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="pt-20 pb-24 px-4 sm:px-5 max-w-lg mx-auto" id="main-content">
        {/* Hero Section */}
        <section className="mt-4 mb-10 text-center" aria-labelledby="about-hero-heading">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl overflow-hidden shadow-lg">
            <img
              src="/assets/company-logo.gif"
              alt="주식회사 레드뱅크 로고"
              className="w-full h-full object-contain"
            />
          </div>
          <h2 id="about-hero-heading" className="hs-section-title font-extrabold text-gray-900 mb-2.5">
            {companyInfo.name}
          </h2>
          <p className="hs-body text-gray-600">
            AI 기반 커플 관계 코칭 플랫폼 <strong className="font-semibold text-pink-600">HeartSync</strong>를 운영하는<br />
            {companyInfo.name}를 소개합니다.
          </p>
        </section>

        {/* Core Values */}
        <section className="mb-10" aria-labelledby="values-heading">
          <div className="text-center mb-1.5">
            <span className="hs-eyebrow text-pink-500 uppercase">Our Values</span>
          </div>
          <h2 id="values-heading" className="text-center hs-subtitle font-bold text-gray-900 mb-6">
            핵심 가치
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {values.map((v) => {
              const Icon = v.icon;
              return (
                <div
                  key={v.title}
                  className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5 text-pink-600" aria-hidden="true" />
                  </div>
                  <h3 className="hs-card-title font-bold text-gray-900 mb-1.5">{v.title}</h3>
                  <p className="hs-subtext text-gray-600">{v.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Company Info */}
        <section className="mb-10" aria-labelledby="company-info-heading">
          <div className="text-center mb-1.5">
            <span className="hs-eyebrow text-pink-500 uppercase">Company Info</span>
          </div>
          <h2 id="company-info-heading" className="text-center hs-subtitle font-bold text-gray-900 mb-6">
            회사 정보
          </h2>

          <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-md border border-gray-100 space-y-4">
            <InfoRow icon={Building2} label="회사명" value={companyInfo.name} />
            <InfoRow icon={Users} label="대표자" value={companyInfo.ceo} />
            <InfoRow icon={FileText} label="사업자등록번호" value={companyInfo.registrationNumber} />
            <InfoRow icon={FileText} label="통신판매업신고번호" value={companyInfo.telecomRegistration} />
            <InfoRow icon={MapPin} label="소재지" value={companyInfo.address} />
            <InfoRow icon={Phone} label="전화번호" value={companyInfo.phone} />
            <InfoRow icon={Mail} label="이메일" value={companyInfo.email} />
          </div>
        </section>

        {/* Business Areas */}
        <section className="mb-10" aria-labelledby="business-areas-heading">
          <div className="text-center mb-1.5">
            <span className="hs-eyebrow text-pink-500 uppercase">Business Areas</span>
          </div>
          <h2 id="business-areas-heading" className="text-center hs-subtitle font-bold text-gray-900 mb-6">
            사업 영역
          </h2>

          <div className="space-y-4">
            {businessAreas.map((area) => (
              <div key={area.category} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="text-[16px] sm:text-[17px] font-bold text-pink-600 mb-3">{area.category}</h3>
                <div className="flex flex-wrap gap-2">
                  {area.items.map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center px-3.5 py-1.5 bg-pink-50 text-pink-700 text-[14px] font-medium rounded-full"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Map / Location */}
        <section className="mb-10" aria-labelledby="location-heading">
          <div className="text-center mb-1.5">
            <span className="hs-eyebrow text-pink-500 uppercase">Location</span>
          </div>
          <h2 id="location-heading" className="text-center hs-subtitle font-bold text-gray-900 mb-6">
            오시는 길
          </h2>

          <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-md border border-gray-100">
            <div className="flex items-start gap-3.5 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-pink-600" aria-hidden="true" />
              </div>
              <div>
                <p className="text-[16px] sm:text-[17px] font-bold text-gray-900 mb-1">본사</p>
                <p className="hs-subtext text-gray-600">{companyInfo.address}</p>
              </div>
            </div>

            <a
              href={`https://map.naver.com/v5/search/${encodeURIComponent(companyInfo.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white hs-btn font-semibold rounded-xl hover:shadow-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
            >
              <MapPin className="w-4 h-4" aria-hidden="true" />
              네이버 지도에서 보기
              <ExternalLink className="w-4 h-4" aria-hidden="true" />
            </a>
          </div>
        </section>

        {/* Contact CTA */}
        <section className="mb-4 text-center" aria-label="문의하기">
          <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl p-6 border border-pink-100">
            <h3 className="hs-card-title font-bold text-gray-900 mb-2">문의하기</h3>
            <p className="hs-subtext text-gray-600 mb-5">
              HeartSync 서비스에 대해 궁금한 점이 있으시면<br />
              언제든지 연락해 주세요.
            </p>
            <div className="flex gap-3 justify-center">
              <a
                href={`tel:${companyInfo.phone}`}
                className="inline-flex items-center gap-1.5 px-6 py-3 bg-white text-pink-600 hs-btn font-semibold rounded-full shadow-sm border border-pink-200 hover:bg-pink-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2"
              >
                <Phone className="w-4 h-4" aria-hidden="true" />
                전화
              </a>
              <a
                href={`mailto:${companyInfo.email}`}
                className="inline-flex items-center gap-1.5 px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white hs-btn font-semibold rounded-full shadow-lg hover:shadow-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2"
              >
                <Mail className="w-4 h-4" aria-hidden="true" />
                이메일
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* PG 심사 승인 요건 준수 Footer */}
      <Footer className="pb-28" />

      <BottomNav />
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-pink-50 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-pink-500" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="hs-caption text-gray-500 font-medium mb-0.5">{label}</p>
        <p className="text-[15.5px] sm:text-[16.5px] text-gray-900 font-medium break-words leading-[1.5]">{value}</p>
      </div>
    </div>
  );
}