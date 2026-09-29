import { useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Lock, AlertTriangle, Phone, Mail, Building2, MapPin, ExternalLink } from "lucide-react";
import RefundPolicyModal from "./RefundPolicyModal";

interface FooterProps {
  className?: string;
}

export default function Footer({ className = "" }: FooterProps) {
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);

  return (
    <footer className={`bg-gray-50 border-t border-gray-200/70 text-gray-500 text-xs py-10 px-5 ${className}`}>
      <div className="max-w-lg mx-auto space-y-6">
        {/* ── 1. 필수 법적 정책 링크 (Toss Payments Audit Links) ── */}
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-xs font-semibold text-gray-600">
          <Link to="/terms" className="hover:text-gray-900 transition-colors">
            이용약관
          </Link>
          <span className="text-gray-300">|</span>
          <Link to="/privacy" className="hover:text-gray-900 transition-colors font-bold text-gray-800">
            개인정보처리방침
          </Link>
          <span className="text-gray-300">|</span>
          <button
            type="button"
            onClick={() => setIsRefundModalOpen(true)}
            className="hover:text-pink-600 transition-colors underline font-medium"
          >
            취소 및 환불규정
          </button>
          <span className="text-gray-300">|</span>
          <Link to="/about" className="hover:text-gray-900 transition-colors">
            회사소개
          </Link>
        </div>

        {/* ── 2. 의료법 및 심리상담 법적 리스크 방어 (면책 조항 필수) ── */}
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 text-[11px] leading-relaxed text-amber-900 shadow-2xs">
          <div className="flex items-center gap-1.5 font-bold mb-1 text-amber-950">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
            <span>의료 및 심리상담 면책 조항 (Legal Disclaimer)</span>
          </div>
          <p className="text-amber-800/90 leading-normal">
            "본 진단 및 AI 코칭은 임상 심리학적 치료나 정신건강의학과 전문의의 의료 진단 행위를 대체하지 않으며, 관계 개선을 돕기 위한 코칭 가이드 목적의 콘텐츠입니다."
          </p>
        </div>

        {/* ── 3. PG사(토스페이먼츠) 실서비스 심사 필수 사업자 정보 ── */}
        <div className="space-y-1 text-[11px] text-gray-500 leading-relaxed border-t border-gray-200/60 pt-4">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="font-extrabold text-gray-800">상호명: 주식회사 레드뱅크</span>
            <span className="text-gray-300">|</span>
            <span>대표자: 이종철</span>
            <span className="text-gray-300">|</span>
            <span>개인정보관리책임자: 이종철</span>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span>사업자등록번호: <strong>132-86-23186</strong></span>
            <span className="text-gray-300">|</span>
            <span>통신판매업신고번호: <strong>제2016-서울송파-0856호</strong></span>
          </div>

          <div className="flex items-start gap-1">
            <span>사업장 주소: 서울특별시 송파구 문정로 246, 2호 (마천동, 사회적경제센터 1-1)</span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 pt-1 text-gray-600 font-medium">
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3 text-pink-500" />
              고객센터: <strong>1599-9573</strong> (평일 10:00~18:00)
            </span>
            <span className="flex items-center gap-1">
              <Mail className="w-3 h-3 text-pink-500" />
              이메일: vikin@hanmail.net
            </span>
          </div>
        </div>

        {/* ── 4. 전자금융거래 안전보장 마크 (Toss Payments PG 에스크로) ── */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-200/50 text-[10px] text-gray-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>토스페이먼츠(Toss Payments) 공식 안전 결제 가맹점</span>
          </div>
          <div className="flex items-center gap-1">
            <Lock className="w-3 h-3 text-gray-400" />
            <span>256-bit SSL 보안 암호화</span>
          </div>
        </div>

        <div className="text-center text-[10px] text-gray-400 pt-1 space-y-0.5 leading-relaxed">
          <p>© {new Date().getFullYear()} HeartSync (대표: 이종철). All Rights Reserved.</p>
          <p className="text-[9px] text-gray-400">
            본 사이트의 관계 진단 50문항, AI 심층 분석 알고리즘, 리포트 서식 및 시각 디자인 일체는 저작권법의 보호를 받는 독점 지식재산이며, 무단 복제·도용·재배포를 엄격히 금지합니다.
          </p>
        </div>
      </div>

      {/* Refund Policy Modal */}
      <RefundPolicyModal
        isOpen={isRefundModalOpen}
        onClose={() => setIsRefundModalOpen(false)}
      />
    </footer>
  );
}
