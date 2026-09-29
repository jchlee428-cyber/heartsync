import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import Footer from "@/components/Footer";

export default function TermsPage() {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-pink-50/30 to-white">
      <Header />
      <div className="max-w-lg mx-auto px-5 pt-6 pb-28">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-gray-500 text-sm font-medium mb-6 px-3 py-2 rounded-lg bg-white shadow-sm border border-gray-100 hover:bg-gray-50 hover:text-gray-700 transition-all active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          돌아가기
        </button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-pink-50 mb-3">
            <FileText className="w-6 h-6 text-pink-500" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-1">이용약관</h1>
          <p className="text-sm text-gray-500">HeartSync 서비스 이용약관</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-50 space-y-6">
          {/* 제1조 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">제1조 (목적)</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              이 약관은 HeartSync(이하 "서비스")가 제공하는 관계 진단 및 AI 코칭 서비스의 이용조건 및 절차, 이용자와 서비스 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          {/* 제2조 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">제2조 (정의)</h2>
            <ul className="text-sm text-gray-600 leading-relaxed space-y-1.5 list-disc list-inside">
              <li>"서비스"란 HeartSync가 제공하는 관계 진단, AI 분석 리포트, AI 코칭 챗봇 등 모든 서비스를 의미합니다.</li>
              <li>"이용자"란 이 약관에 따라 서비스를 이용하는 자를 말합니다.</li>
              <li>"유료 서비스"란 서비스 내에서 결제를 통해 이용할 수 있는 프리미엄 기능을 의미합니다.</li>
            </ul>
          </section>

          {/* 제3조 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">제3조 (약관의 효력 및 변경)</h2>
            <ul className="text-sm text-gray-600 leading-relaxed space-y-1.5 list-disc list-inside">
              <li>이 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다.</li>
              <li>서비스는 합리적인 사유가 발생할 경우 약관을 변경할 수 있으며, 변경된 약관은 공지 후 7일이 경과한 날부터 효력이 발생합니다.</li>
            </ul>
          </section>

          {/* 제4조 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">제4조 (서비스의 제공)</h2>
            <ul className="text-sm text-gray-600 leading-relaxed space-y-1.5 list-disc list-inside">
              <li>관계 진단 설문 (50문항 기반 심리 분석)</li>
              <li>AI 기반 심리 분석 리포트 생성</li>
              <li>AI 코칭 챗봇 상담</li>
              <li>진단 결과 비교 및 추적</li>
              <li>기타 서비스가 정하는 부가 서비스</li>
            </ul>
          </section>

          {/* 제5조 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">제5조 (이용계약의 성립)</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              이용계약은 이용자가 약관의 내용에 동의한 후 회원가입을 완료하고, 서비스가 이를 승낙함으로써 성립됩니다.
            </p>
          </section>

          {/* 제6조 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">제6조 (유료 서비스 및 결제)</h2>
            <ul className="text-sm text-gray-600 leading-relaxed space-y-1.5 list-disc list-inside">
              <li>유료 서비스의 이용요금 및 결제방식은 서비스 내 안내 페이지에 게시된 내용에 따릅니다.</li>
              <li>결제는 토스페이먼츠를 통해 처리되며, 신용카드, 계좌이체, 간편결제 등의 방법을 지원합니다.</li>
              <li>결제 완료 후 유료 서비스가 즉시 활성화됩니다.</li>
            </ul>
          </section>

          {/* 제7조 - 취소/환불 */}
          <section className="bg-pink-50/50 rounded-xl p-4 -mx-1">
            <h2 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
              📋 제7조 (취소 및 환불 규정)
            </h2>
            <div className="text-sm text-gray-600 leading-relaxed space-y-3">
              <div>
                <p className="font-semibold text-gray-800 mb-1">1. 환불 가능 기간</p>
                <ul className="list-disc list-inside space-y-1 pl-2">
                  <li>결제일로부터 7일 이내에 환불을 요청할 수 있습니다.</li>
                  <li>단, 유료 서비스(AI 분석 리포트 등)를 이미 이용한 경우에는 환불이 제한될 수 있습니다.</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-gray-800 mb-1">2. 환불 불가 사유</p>
                <ul className="list-disc list-inside space-y-1 pl-2">
                  <li>AI 분석 리포트를 이미 생성·열람한 경우</li>
                  <li>결제일로부터 7일이 경과한 경우</li>
                  <li>이용자의 귀책사유로 서비스 이용이 불가한 경우</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-gray-800 mb-1">3. 환불 절차</p>
                <ul className="list-disc list-inside space-y-1 pl-2">
                  <li>환불 요청은 서비스 내 고객센터 또는 이메일을 통해 접수합니다.</li>
                  <li>환불 승인 후 영업일 기준 3~5일 이내에 결제 수단으로 환불됩니다.</li>
                  <li>부분 환불: 월간 구독의 경우, 미사용 기간에 대해 일할 계산하여 환불합니다.</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-gray-800 mb-1">4. 구독 취소</p>
                <ul className="list-disc list-inside space-y-1 pl-2">
                  <li>구독 취소는 다음 결제일 이전에 언제든지 가능합니다.</li>
                  <li>취소 후에도 현재 결제 기간이 만료될 때까지 서비스를 이용할 수 있습니다.</li>
                  <li>자동 갱신을 원하지 않는 경우, 마이페이지에서 구독을 취소해주세요.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 제8조 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">제8조 (이용자의 의무)</h2>
            <ul className="text-sm text-gray-600 leading-relaxed space-y-1.5 list-disc list-inside">
              <li>이용자는 서비스 이용 시 관계 법령, 약관, 이용안내 등을 준수해야 합니다.</li>
              <li>타인의 개인정보를 도용하거나 부정한 방법으로 서비스를 이용해서는 안 됩니다.</li>
              <li>서비스의 안정적 운영을 방해하는 행위를 해서는 안 됩니다.</li>
            </ul>
          </section>

          {/* 제9조 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">제9조 (서비스의 중단)</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              서비스는 시스템 점검, 장비 교체, 천재지변 등 불가피한 사유가 발생한 경우 서비스 제공을 일시적으로 중단할 수 있으며, 이 경우 사전에 공지합니다.
            </p>
          </section>

          {/* 제10조 */}
          <section className="bg-amber-50/60 rounded-xl p-4 -mx-1 border border-amber-200/70">
            <h2 className="text-base font-bold text-gray-900 mb-2">제10조 (의료법 및 심리상담 면책조항)</h2>
            <div className="text-sm text-gray-700 leading-relaxed space-y-2">
              <p className="font-extrabold text-amber-950">
                "본 진단 및 AI 코칭은 임상 심리학적 치료나 정신건강의학과 전문의의 의료 진단 행위를 대체하지 않으며, 관계 개선을 돕기 위한 코칭 가이드 목적의 콘텐츠입니다."
              </p>
              <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                <li>서비스가 제공하는 모든 분석과 솔루션은 이용자의 주관적 응답에 기반한 통계적·심리학적 참고 자료입니다.</li>
                <li>심각한 우울, 불안, 가정폭력, 정신과적 위기 상황의 경우 반드시 전문 의료기관이나 공인된 전문 상담사의 진료를 받으셔야 합니다.</li>
                <li>이용자가 서비스를 통해 얻은 조언에 대한 최종 판단과 행동의 책임은 이용자 본인에게 있습니다.</li>
              </ul>
            </div>
          </section>

          {/* 제11조 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">제11조 (분쟁 해결)</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              서비스 이용과 관련하여 분쟁이 발생한 경우, 양 당사자는 원만한 해결을 위해 성실히 협의합니다. 협의가 이루어지지 않을 경우 관할 법원에 소를 제기할 수 있습니다.
            </p>
          </section>

          <div className="pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center">
              시행일: 2024년 1월 1일
            </p>
          </div>
        </div>
      </div>

      {/* PG 심사 승인 요건 준수 Footer */}
      <Footer className="pb-28 mt-8" />

      <BottomNav />
    </div>
  );
}