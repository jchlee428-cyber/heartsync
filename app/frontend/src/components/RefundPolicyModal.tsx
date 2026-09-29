import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ShieldCheck, RotateCcw, AlertCircle, FileText, CheckCircle2 } from "lucide-react";

interface RefundPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RefundPolicyModal({ isOpen, onClose }: RefundPolicyModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-pink-100 rounded-3xl bg-white shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white p-5 flex-shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-pink-300 text-[10px] font-black w-fit mb-1.5">
            <ShieldCheck className="w-3 h-3 text-pink-400" />
            전자상거래소비자보호법 준수
          </div>
          <DialogTitle className="text-lg font-black text-white">
            취소 및 환불 규정 (Refund Policy)
          </DialogTitle>
          <DialogDescription className="text-gray-300 text-xs mt-1">
            HeartSync의 투명하고 공정한 디지털 콘텐츠 환불 및 청약철회 기준입니다.
          </DialogDescription>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-gray-700 flex-1 leading-relaxed">
          {/* Section 1 */}
          <div className="bg-pink-50/60 rounded-2xl p-4 border border-pink-100 space-y-2">
            <h4 className="font-extrabold text-pink-950 text-sm flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4 text-pink-600" />
              1. 7일 이내 100% 전액 환불 보장
            </h4>
            <p className="text-[11px] text-pink-900 leading-relaxed">
              결제일로부터 <strong>7일 이내</strong>, AI 심층 분석 리포트를 생성·열람하지 않은 미사용 이용권의 경우 아무런 위약금 없이 <strong>100% 전액 환불</strong>됩니다.
            </p>
          </div>

          {/* Section 2 */}
          <div className="space-y-1.5">
            <h5 className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              2. 환불 절차 및 처리 기한
            </h5>
            <ul className="space-y-1 text-[11px] text-gray-600 pl-4 list-disc">
              <li>고객센터(1599-9573) 또는 이메일(vikin@hanmail.net)로 환불 요청 접수</li>
              <li>접수 후 즉시 결제 취소 승인 (영업일 기준 3~5일 이내 카드사 취소 반영)</li>
              <li>간편결제(카카오페이/토스페이/네이버페이)는 당일 즉시 취소 승인</li>
            </ul>
          </div>

          {/* Section 3 */}
          <div className="space-y-1.5">
            <h5 className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              3. 청약철회(환불)가 제한되는 경우
            </h5>
            <p className="text-[11px] text-gray-500">
              디지털 콘텐츠 특성상 전자상거래 등에서의 소비자보호에 관한 법률 제17조 제2항에 따라 아래의 경우 환불이 제한됩니다:
            </p>
            <ul className="space-y-1 text-[11px] text-gray-600 pl-4 list-disc">
              <li>결제 후 AI 심층 리포트가 생성되어 이미 열람한 경우 (디지털 재화 제공 완료)</li>
              <li>결제일로부터 7일이 경과한 경우</li>
              <li>선물하기 티켓을 상대방이 이미 등록하여 검사를 완료한 경우</li>
            </ul>
          </div>

          {/* Section 4 */}
          <div className="space-y-1.5">
            <h5 className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-purple-600" />
              4. 정기 구독 취소 (30일 올케어)
            </h5>
            <ul className="space-y-1 text-[11px] text-gray-600 pl-4 list-disc">
              <li>다음 결제 주기 도래 전 언제든 마이페이지에서 위약금 없이 해지 가능</li>
              <li>해지 후에도 남은 결제 주기 만료일까지 모든 프리미엄 서비스 유지</li>
            </ul>
          </div>

          {/* Business Info Footer */}
          <div className="pt-3 border-t border-gray-100 text-[10px] text-gray-400 space-y-0.5">
            <p>상호: 주식회사 레드뱅크 | 대표자: 이종철</p>
            <p>사업자등록번호: 132-86-23186 | 통신판매업: 제2016-서울송파-0856호</p>
            <p>고객센터: 1599-9573 (평일 10:00 ~ 18:00)</p>
          </div>
        </div>

        {/* Footer Button */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-xs transition-colors"
          >
            확인했습니다
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
