import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";

export default function PrivacyPage() {
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
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 mb-3">
            <Shield className="w-6 h-6 text-blue-500" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-1">개인정보처리방침</h1>
          <p className="text-sm text-gray-500">HeartSync 개인정보 보호 정책</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-50 space-y-6">
          {/* 제1조 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">제1조 (개인정보의 수집 및 이용 목적)</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-2">
              HeartSync(이하 "서비스")는 다음의 목적을 위해 개인정보를 수집·이용합니다.
            </p>
            <ul className="text-sm text-gray-600 leading-relaxed space-y-1.5 list-disc list-inside">
              <li>회원 가입 및 관리: 본인 확인, 서비스 이용 자격 확인</li>
              <li>서비스 제공: 관계 진단, AI 분석 리포트 생성, AI 코칭 제공</li>
              <li>결제 처리: 유료 서비스 결제 및 환불 처리</li>
              <li>서비스 개선: 이용 통계 분석, 서비스 품질 향상</li>
              <li>고객 지원: 문의 응대, 불만 처리, 공지사항 전달</li>
            </ul>
          </section>

          {/* 제2조 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">제2조 (수집하는 개인정보 항목)</h2>
            <div className="text-sm text-gray-600 leading-relaxed space-y-3">
              <div>
                <p className="font-semibold text-gray-800 mb-1">필수 수집 항목</p>
                <ul className="list-disc list-inside space-y-1 pl-2">
                  <li>이메일 주소 (로그인 및 계정 식별)</li>
                  <li>비밀번호 (암호화 저장)</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-gray-800 mb-1">서비스 이용 시 자동 수집 항목</p>
                <ul className="list-disc list-inside space-y-1 pl-2">
                  <li>진단 응답 데이터 (관계 진단 설문 답변)</li>
                  <li>AI 분석 리포트 내용</li>
                  <li>챗봇 상담 대화 내역</li>
                  <li>서비스 이용 기록, 접속 로그, 접속 IP</li>
                  <li>기기 정보 (브라우저 종류, OS)</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-gray-800 mb-1">결제 시 수집 항목</p>
                <ul className="list-disc list-inside space-y-1 pl-2">
                  <li>결제 수단 정보 (토스페이먼츠를 통해 처리, 서비스에 직접 저장하지 않음)</li>
                  <li>결제 내역 (주문번호, 금액, 결제일시)</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 제3조 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">제3조 (개인정보의 보유 및 이용 기간)</h2>
            <ul className="text-sm text-gray-600 leading-relaxed space-y-1.5 list-disc list-inside">
              <li>회원 탈퇴 시까지 보유하며, 탈퇴 후 즉시 파기합니다.</li>
              <li>단, 관계 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다:
                <ul className="list-disc list-inside pl-4 mt-1 space-y-1">
                  <li>전자상거래 등에서의 소비자보호에 관한 법률: 계약·청약철회 기록 5년, 대금결제 기록 5년</li>
                  <li>통신비밀보호법: 접속 로그 3개월</li>
                </ul>
              </li>
            </ul>
          </section>

          {/* 제4조 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">제4조 (개인정보의 제3자 제공)</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              서비스는 이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다. 다만, 다음의 경우에는 예외로 합니다:
            </p>
            <ul className="text-sm text-gray-600 leading-relaxed space-y-1.5 list-disc list-inside mt-2">
              <li>이용자가 사전에 동의한 경우</li>
              <li>법령에 의해 요구되는 경우</li>
              <li>서비스 제공을 위해 필요한 경우 (결제 처리 등)</li>
            </ul>
          </section>

          {/* 제5조 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">제5조 (개인정보 처리 위탁)</h2>
            <div className="text-sm text-gray-600 leading-relaxed">
              <p className="mb-2">서비스는 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리를 위탁하고 있습니다:</p>
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">토스페이먼츠</span>
                  <span className="text-gray-500">결제 처리</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Atoms Cloud</span>
                  <span className="text-gray-500">데이터 저장 및 인증</span>
                </div>
              </div>
            </div>
          </section>

          {/* 제6조 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">제6조 (개인정보의 파기)</h2>
            <ul className="text-sm text-gray-600 leading-relaxed space-y-1.5 list-disc list-inside">
              <li>보유 기간이 경과하거나 처리 목적이 달성된 경우 지체 없이 파기합니다.</li>
              <li>전자적 파일: 복구 불가능한 방법으로 영구 삭제</li>
              <li>종이 문서: 분쇄기로 분쇄하거나 소각</li>
            </ul>
          </section>

          {/* 제7조 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">제7조 (이용자의 권리와 행사 방법)</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-2">
              이용자는 언제든지 다음의 권리를 행사할 수 있습니다:
            </p>
            <ul className="text-sm text-gray-600 leading-relaxed space-y-1.5 list-disc list-inside">
              <li>개인정보 열람 요구</li>
              <li>오류 등이 있을 경우 정정 요구</li>
              <li>삭제 요구</li>
              <li>처리 정지 요구</li>
              <li>회원 탈퇴 (마이페이지에서 직접 가능)</li>
            </ul>
          </section>

          {/* 제8조 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">제8조 (개인정보의 안전성 확보 조치)</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-2">
              서비스는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다:
            </p>
            <ul className="text-sm text-gray-600 leading-relaxed space-y-1.5 list-disc list-inside">
              <li>비밀번호 암호화 저장</li>
              <li>SSL/TLS를 통한 데이터 전송 암호화</li>
              <li>접근 권한 관리 및 제한</li>
              <li>개인정보 접근 로그 기록 및 보관</li>
              <li>정기적인 보안 점검</li>
            </ul>
          </section>

          {/* 제9조 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">제9조 (쿠키의 사용)</h2>
            <ul className="text-sm text-gray-600 leading-relaxed space-y-1.5 list-disc list-inside">
              <li>서비스는 이용자의 편의를 위해 쿠키를 사용합니다.</li>
              <li>쿠키는 로그인 상태 유지, 서비스 이용 환경 설정 등에 사용됩니다.</li>
              <li>이용자는 브라우저 설정을 통해 쿠키 저장을 거부할 수 있으나, 일부 서비스 이용에 제한이 있을 수 있습니다.</li>
            </ul>
          </section>

          {/* 제10조 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">제10조 (개인정보 보호 책임자)</h2>
            <div className="text-sm text-gray-600 leading-relaxed">
              <p className="mb-2">개인정보 처리에 관한 불만이나 문의사항이 있으시면 아래로 연락해주세요:</p>
              <div className="bg-gray-50 rounded-lg p-4 space-y-1.5">
                <p><span className="font-medium text-gray-700">담당:</span> 개인정보 보호 책임자</p>
                <p><span className="font-medium text-gray-700">이메일:</span> privacy@heartsync.kr</p>
              </div>
            </div>
          </section>

          {/* 제11조 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">제11조 (개인정보처리방침의 변경)</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              이 개인정보처리방침은 법령, 정책 또는 보안 기술의 변경에 따라 내용이 추가·삭제·수정될 수 있으며, 변경 시 서비스 내 공지사항을 통해 고지합니다.
            </p>
          </section>

          <div className="pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center">
              시행일: 2024년 1월 1일
            </p>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}