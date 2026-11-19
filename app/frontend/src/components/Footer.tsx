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
    <footer className={`bg-gray-50 border-t border-gray-200/70 text-gray-600 text-[13px] py-10 px-5 ${className}`}>
      <div className="max-w-lg mx-auto space-y-6">
        {/* ── 1. 필수 법적 정책 링크 (Toss Payments Audit Links) ── */}
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[13px] sm:text-[14px] font-medium text-gray-600">
          <Link to="/terms" className="hover:text-gray-900 transition-colors font-semibold text-gray-800 underline underline-offset-4">
            서비스 이용약관 (주식회사 레드뱅크)
          </Link>
          <span className="text-gray-300">|</span>
          <Link to="/privacy" className="hover:text-gray-900 transition-colors font-semibold text-gray-800 underline underline-offset-4">
            개인정보처리방침 (주식회사 레드뱅크)
          </Link>
          <span className="text-gray-300">|</span>
          <button
            type="button"
            onClick={() => setIsRefundModalOpen(true)}
            className="hover:text-pink-600 transition-colors underline underline-offset-4 font-medium"
          >
            취소 및 환불규정
          </button>
          <span className="text-gray-300">|</span>
          <Link to="/about" className="hover:text-gray-900 transition-colors font-medium">
            회사소개
          </Link>
        </div>

        {/* ── 1-2. 홈페이지 하단 이용약관 및 개인정보처리방침 핵심 내용 기재 (휴대폰 결제 심사 필수 요건) ── */}
        <div className="bg-white border border-gray-200/80 rounded-2xl p-4 text-[12.5px] sm:text-[13px] leading-[1.7] text-gray-600 space-y-3 shadow-2xs">
          <div>
            <p className="font-bold text-gray-800 text-[13px] sm:text-[13.5px]">
              📋 [서비스 이용약관 요약 — 상호명: 주식회사 레드뱅크]
            </p>
            <p className="text-gray-600 mt-1">
              본 약관은 <strong className="font-semibold text-gray-800">주식회사 레드뱅크</strong>(사업자등록번호: 132-86-23186, 대표자: 이종철)가 운영하는 HeartSync 서비스의 이용조건·절차 및 회원·비회원 구매자의 권리·의무를 규정합니다. 유료 디지털 콘텐츠는 단건 결제로 제공(최대 이용기간 30일, 선물 티켓 등록 유효기간 결제일로부터 30일)되며, 미사용 시 7일 이내 100% 환불을 보장합니다.{" "}
              <Link to="/terms" className="text-pink-600 font-semibold underline underline-offset-2">
                [이용약관 전문보기]
              </Link>
            </p>
          </div>
          <div className="pt-2.5 border-t border-gray-100">
            <p className="font-bold text-gray-800 text-[13px] sm:text-[13.5px]">
              🔒 [개인정보처리방침 요약 — 상호명: 주식회사 레드뱅크]
            </p>
            <p className="text-gray-600 mt-1">
              <strong className="font-semibold text-gray-800">주식회사 레드뱅크</strong>(개인정보보호책임자: 이종철, 연락처: 1599-9573)는 회원 가입, 비회원 구매·선물하기 결제, AI 진단 리포트 제공을 위해 최소한의 개인정보(이메일, 성명/연락처, 결제기록)를 수집하며, 회원 탈퇴 또는 목적 달성 시 지체 없이 파기합니다(전자상거래법상 결제·계약 기록 5년 보관, 결제 처리 위탁: 토스페이먼츠).{" "}
              <Link to="/privacy" className="text-blue-600 font-semibold underline underline-offset-2">
                [개인정보처리방침 전문보기]
              </Link>
            </p>
          </div>
        </div>

        {/* ── 2. 의료법 및 심리상담 법적 리스크 방어 (면책 조항 필수) ── */}
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 text-[13px] leading-[1.68] text-amber-900 shadow-2xs">
          <div className="flex items-center gap-1.5 font-bold mb-1.5 text-amber-950 text-[13.5px]">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>의료 및 심리상담 면책 조항 (Legal Disclaimer)</span>
          </div>
          <p className="text-amber-900/90 leading-[1.68]">
            "본 진단 및 AI 코칭은 임상 심리학적 치료나 정신건강의학과 전문의의 의료 진단 행위를 대체하지 않으며, 관계 개선을 돕기 위한 코칭 가이드 목적의 콘텐츠입니다."
          </p>
        </div>

        {/* ── 3. PG사(토스페이먼츠) 실서비스 심사 필수 사업자 정보 ── */}
        <div className="space-y-1.5 text-[12.5px] sm:text-[13px] text-gray-600 leading-[1.7] border-t border-gray-200/60 pt-4">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
            <span className="font-bold text-gray-800">상호명: 주식회사 레드뱅크</span>
            <span className="text-gray-300">|</span>
            <span>대표자: 이종철</span>
            <span className="text-gray-300">|</span>
            <span>개인정보관리책임자: 이종철</span>
          </div>

          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
            <span>사업자등록번호: <strong className="font-semibold text-gray-800 hs-num">132-86-23186</strong></span>
            <span className="text-gray-300">|</span>
            <span>통신판매업신고번호: <strong className="font-semibold text-gray-800">제2016-서울송파-0856호</strong></span>
          </div>

          <div className="flex items-start gap-1">
            <span>사업장 주소: 서울특별시 송파구 문정로 246, 2호 (마천동, 사회적경제센터 1-1)</span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 pt-1 text-gray-700 font-medium">
            <span className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-pink-500" />
              고객센터: <strong className="font-semibold text-gray-900 hs-num">1599-9573</strong> (평일 10:00~18:00)
            </span>
            <span className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-pink-500" />
              이메일: vikin@hanmail.net
            </span>
          </div>
        </div>

        {/* ── 4. 전자금융거래 안전보장 마크 (Toss Payments PG 에스크로) ── */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-200/50 text-[12px] text-gray-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>토스페이먼츠(Toss Payments) 공식 안전 결제 가맹점</span>
          </div>
          <div className="flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-gray-400" />
            <span>256-bit SSL 보안 암호화</span>
          </div>
        </div>

        <div className="text-center text-[12px] text-gray-500 pt-1 space-y-1 leading-[1.65]">
          <p>© {new Date().getFullYear()} HeartSync (대표: 이종철). All Rights Reserved.</p>
          <p className="text-[11.5px] text-gray-400">
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
