const { chromium } = require('playwright');
const pptxgen = require('pptxgenjs');
const path = require('path');
const fs = require('fs');

async function buildDocs() {
  const capturesDir = path.join(__dirname, 'guide_captures');

  function getBase64(file, fallbackFile) {
    let p = path.join(capturesDir, file);
    if (!fs.existsSync(p) && fallbackFile) {
      p = path.join(capturesDir, fallbackFile);
    }
    if (!fs.existsSync(p)) {
      console.warn('Warning: Missing capture file:', p);
      return '';
    }
    return 'data:image/png;base64,' + fs.readFileSync(p).toString('base64');
  }

  const mainPageB64 = getBase64('01_main_page_raw.png');
  const footerB64 = getBase64('02_footer_raw.png');
  const refundB64 = getBase64('03_refund_modal_raw.png');
  const termsPageB64 = getBase64('03_terms_page_raw.png');
  const privacyPageB64 = getBase64('03_privacy_page_raw.png');
  const loginB64 = getBase64('04_login_page_raw.png');
  const mypageWithdrawB64 = getBase64('04_mypage_withdraw_raw.png');
  const pricingB64 = getBase64('05_pricing_plans_raw.png');
  const allCareB64 = getBase64('06_all_care_plan_raw.png');
  const tossLiveWidgetB64 = getBase64('07_toss_live_widget_raw.png');
  const tossMobileTabB64 = getBase64('07_toss_mobile_tab_raw.png');
  const tossBcSelectedB64 = getBase64('07_toss_bc_selected_raw.png');
  const tossNhMerchantB64 = getBase64('07_toss_nh_popup_raw.png', '07_toss_nh_merchant_raw.png');
  const bcPayboocMainB64 = getBase64('07_bc_paybooc_main_raw.png');
  const bcPayboocQrB64 = getBase64('07_bc_paybooc_qr_raw.png');
  const bcPayboocIspB64 = getBase64('07_bc_paybooc_isp_raw.png');
  const successB64 = getBase64('08_payment_success_raw.png');

  const htmlContent = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>토스페이먼츠 홈페이지 결제경로 - 주식회사 레드뱅크</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Pretendard:wght@400;500;600;700;800;900&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Malgun Gothic', sans-serif;
      background: #f1f5f9;
      color: #1e293b;
      -webkit-font-smoothing: antialiased;
    }

    .slide {
      width: 1280px;
      height: 720px;
      page-break-after: always;
      position: relative;
      background: #ffffff;
      padding: 24px 42px 20px 42px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      margin: 0 auto 24px auto;
      box-shadow: 0 10px 25px rgba(0,0,0,0.08);
    }
    @media print {
      body { background: transparent; }
      .slide { margin: 0; box-shadow: none; width: 100vw; height: 100vh; }
    }

    .guide-header {
      margin-bottom: 10px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      position: relative;
    }
    .badge-wrap {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .step-pill {
      display: inline-block;
      background: #2563eb;
      color: #ffffff;
      font-size: 14.5px;
      font-weight: 800;
      padding: 5px 16px;
      border-radius: 5px;
      width: fit-content;
      letter-spacing: -0.3px;
    }
    .step-subtext {
      font-size: 13px;
      font-weight: 700;
      color: #1e293b;
    }
    .step-subtext span {
      color: #64748b;
      font-weight: 500;
      font-size: 11.5px;
      margin-left: 6px;
    }
    .badge-sample {
      background: #1d4ed8;
      color: #ffffff;
      font-size: 12px;
      font-weight: 800;
      padding: 5px 14px;
      border-radius: 5px;
      white-space: nowrap;
    }

    .flow-bar {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 9px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 5px 12px;
      font-size: 11.5px;
      font-weight: 700;
      color: #64748b;
    }
    .flow-step {
      padding: 3px 9px;
      border-radius: 5px;
      background: #e2e8f0;
      color: #475569;
    }
    .flow-step.active {
      background: #2563eb;
      color: #ffffff;
      font-weight: 800;
    }
    .flow-arrow {
      color: #94a3b8;
      font-weight: 900;
    }

    .cover-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      gap: 12px;
    }
    .cover-title {
      font-size: 31px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -1px;
    }
    .cover-desc {
      font-size: 13.5px;
      color: #475569;
      margin-top: -6px;
      font-weight: 600;
    }
    .cover-info-card {
      background: #f8fafc;
      border: 2px solid #cbd5e1;
      border-radius: 14px;
      padding: 16px 28px;
      width: 980px;
      text-align: left;
      box-shadow: 0 4px 12px rgba(0,0,0,0.04);
    }
    .cover-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .cover-table td {
      padding: 6px 10px;
      border-bottom: 1px solid #e2e8f0;
    }
    .cover-table tr:last-child td {
      border-bottom: none;
    }
    .cover-table td.label {
      font-weight: 800;
      color: #1e40af;
      width: 225px;
    }
    .cover-table td.val {
      font-weight: 600;
      color: #0f172a;
    }

    .browser-frame {
      border: 1.5px solid #94a3b8;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 8px 20px rgba(0,0,0,0.07);
      display: flex;
      flex-direction: column;
      background: #ffffff;
      flex: 1;
      position: relative;
    }
    .browser-topbar {
      background: #e2e8f0;
      padding: 6px 14px;
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 1px solid #cbd5e1;
      flex-shrink: 0;
    }
    .browser-dots { display: flex; gap: 5px; }
    .dot { width: 10px; height: 10px; border-radius: 50%; }
    .dot-red { background: #ef4444; }
    .dot-yellow { background: #f59e0b; }
    .dot-green { background: #10b981; }

    .browser-url-bar {
      flex: 1;
      background: #ffffff;
      border: 1px solid #94a3b8;
      border-radius: 6px;
      padding: 4px 12px;
      font-size: 12px;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 6px;
      font-family: Consolas, monospace;
      font-weight: 700;
    }
    .browser-url-bar .lock { color: #16a34a; font-weight: bold; }

    .browser-content {
      flex: 1;
      overflow: hidden;
      position: relative;
      background: #ffffff;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .browser-content > img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: top center;
    }

    .windows-taskbar {
      height: 30px;
      background: #1e293b;
      border-top: 1px solid #0f172a;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      font-size: 11px;
      color: #f8fafc;
      flex-shrink: 0;
    }
    .taskbar-left { display: flex; align-items: center; gap: 14px; font-weight: 600; }
    .taskbar-clock {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      line-height: 1.15;
      font-size: 10px;
      font-weight: 700;
      color: #ffffff;
      background: rgba(37, 99, 235, 0.45);
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid #60a5fa;
    }

    .highlight-overlay {
      position: absolute;
      border: 3px solid #2563eb;
      background: rgba(37, 99, 235, 0.04);
      border-radius: 8px;
      pointer-events: none;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.18);
      z-index: 20;
    }
    .highlight-tag {
      position: absolute;
      top: -24px;
      left: -2px;
      background: #2563eb;
      color: #ffffff;
      font-size: 11px;
      font-weight: 800;
      padding: 3px 10px;
      border-radius: 4px;
      white-space: nowrap;
      box-shadow: 0 2px 6px rgba(0,0,0,0.15);
    }

    .slide-footer-nav {
      position: absolute;
      bottom: 4px;
      right: 42px;
      font-size: 11px;
      font-weight: 800;
      color: #64748b;
    }

    .popup-window {
      background: #ffffff;
      border: 2.5px solid #2563eb;
      border-radius: 10px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.45);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .popup-titlebar {
      background: #1e293b;
      color: #ffffff;
      padding: 6px 12px;
      font-size: 11px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .popup-urlbar {
      background: #f1f5f9;
      border-bottom: 1px solid #cbd5e1;
      padding: 4px 10px;
      font-family: Consolas, monospace;
      font-size: 10.5px;
      font-weight: 700;
      color: #1e40af;
    }
  </style>
</head>
<body>

  <!-- ==================== SLIDE 1: ① 가맹점 정보 기재 (보완사항 100% 반영본) ==================== -->
  <div class="slide" id="slide-1">
    <div class="guide-header">
      <div class="badge-wrap">
        <div class="step-pill">① 가맹점 정보 기재 (온보딩팀 보완 요청 사항 반영 완료)</div>
        <div class="step-subtext">라이브키(live_gck_) 연동 완료 · 가맹점 상호명(주식회사 레드뱅크) 일치 설정 · 토스 통합결제창 내 휴대폰 결제 연동 완료</div>
      </div>
      <div class="badge-sample" style="background: #16a34a;">라이브키 연동 · 통합결제창 심사본</div>
    </div>

    <div class="flow-bar">
      <span>결제경로 전체 흐름:</span>
      <span class="flow-step active">1. 메인 페이지 / 하단 약관</span>
      <span class="flow-arrow">→</span>
      <span class="flow-step active">2. 회원가입 약관동의 · 회원탈퇴</span>
      <span class="flow-arrow">→</span>
      <span class="flow-step active">3. 상품 선택 (/pricing)</span>
      <span class="flow-arrow">→</span>
      <span class="flow-step active">4. 토스 라이브 통합결제창 확인 (신용카드 · 휴대폰)</span>
    </div>

    <div class="cover-body">
      <h1 class="cover-title">토스페이먼츠 홈페이지 결제경로 안내서 (보완본)</h1>
      <p class="cover-desc">주식회사 레드뱅크 | HeartSync (하트싱크) — 라이브키 연동 · 상호명 일치 · 토스 통합결제창(카드·휴대폰) 적용 완료</p>

      <div class="cover-info-card">
        <table class="cover-table">
          <tr>
            <td class="label">(1) 상호명 (사업자등록증 동일)</td>
            <td class="val"><strong>주식회사 레드뱅크</strong> &nbsp;(토스 상점관리자 가맹점명·이용약관·개인정보처리방침 모두 <strong>‘주식회사 레드뱅크’</strong> 일치 확인)</td>
          </tr>
          <tr>
            <td class="label">(2) 사업자등록번호</td>
            <td class="val"><strong>132-86-23186</strong> &nbsp;|&nbsp; 대표자명: 이종철 &nbsp;|&nbsp; 통신판매업신고번호: 제2016-서울송파-0856호</td>
          </tr>
          <tr>
            <td class="label">(3) 홈페이지 URL</td>
            <td class="val"><strong style="color: #2563eb; font-size: 14.5px;">https://www.heartsync.kr</strong> &nbsp;(상품 페이지: https://www.heartsync.kr/pricing)</td>
          </tr>
          <tr>
            <td class="label">(4) 심사용 테스트 ID / PW</td>
            <td class="val">ID: <strong style="color: #dc2626; font-size: 14px;">test@heartsync.kr</strong> &nbsp;/&nbsp; PW: <strong style="color: #dc2626; font-size: 14px;">test1234!</strong> &nbsp;(로그인 화면 내 [체험 계정으로 빠른 로그인] 버튼 지원)</td>
          </tr>
          <tr>
            <td class="label">(5) 사업장 주소 / 고객센터</td>
            <td class="val">서울특별시 송파구 문정로 246, 2호 (마천동, 사회적경제센터 1-1) &nbsp;|&nbsp; 고객센터: <strong>1599-9573</strong> (vikin@hanmail.net)</td>
          </tr>
          <tr>
            <td class="label">(6) 판매 상품 및 제공 기간</td>
            <td class="val">AI 커플 관계 진단·코칭 무형 콘텐츠 (단건 최고가: <strong>30일 올케어 패스 49,000원</strong> / 선물 티켓 유효기간: <strong>결제일로부터 30일</strong>, 미등록 전액환불)</td>
          </tr>
          <tr>
            <td class="label">(7) 라이브키 연동 상태 [보완 1]</td>
            <td class="val"><strong style="color: #16a34a;">결제위젯 라이브키(live_gck_... / live_gsk_...) 실연동 완료</strong> — 결제창 상단 테스트 배너 제거 및 실결제 가능 상태 전환 완료</td>
          </tr>
          <tr>
            <td class="label">(8) 통합결제창 연동 내역 [보완 2·3]</td>
            <td class="val"><strong style="color: #2563eb;">자체 휴대폰 모달 제거 완료 → 토스 통합결제창 내 ① 신용·체크카드(BC·농협 실결제창) &nbsp;② 휴대폰 결제([더보기 &gt; 휴대폰]) 통합 제공</strong></td>
          </tr>
        </table>
      </div>
    </div>
    <div class="slide-footer-nav">1 / 12</div>
  </div>

  <!-- ==================== SLIDE 2: ② 하단정보 및 약관 요약 캡처 ==================== -->
  <div class="slide" id="slide-2">
    <div class="guide-header">
      <div class="badge-wrap">
        <div class="step-pill">② 홈페이지 하단정보(Footer) 및 약관 기재 캡처</div>
        <div class="step-subtext">홈페이지 하단에 사업자 필수 6대 정보와 이용약관·개인정보처리방침 본문 요약(상호명: 주식회사 레드뱅크)을 상시 기재했어요.</div>
      </div>
      <div class="badge-sample">하단 사업자정보 · 약관 기재</div>
    </div>

    <div class="browser-frame">
      <div class="browser-topbar">
        <div class="browser-dots"><div class="dot dot-red"></div><div class="dot dot-yellow"></div><div class="dot dot-green"></div></div>
        <div class="browser-url-bar"><span class="lock">🔒</span> https://www.heartsync.kr (홈페이지 하단 Footer 영역)</div>
      </div>
      <div class="browser-content">
        <img src="${footerB64}" alt="하단정보 캡처" style="object-position: bottom center;" />
        <div class="highlight-overlay" style="bottom: 18px; left: 220px; right: 220px; height: 295px;">
          <span class="highlight-tag">✓ 하단 필수 사업자 정보(주식회사 레드뱅크 / 132-86-23186 / 1599-9573) 및 이용약관·개인정보처리방침 상시 노출</span>
        </div>
      </div>
      <div class="windows-taskbar">
        <div class="taskbar-left"><span>🪟 시작</span><span>🔍 검색</span><span>🌐 Chrome - HeartSync</span></div>
        <div class="taskbar-clock"><span>오후 5:50</span><span>2026-11-18</span></div>
      </div>
    </div>
    <div class="slide-footer-nav">2 / 12</div>
  </div>

  <!-- ==================== SLIDE 3: ③ 환불규정 캡처 ==================== -->
  <div class="slide" id="slide-3">
    <div class="guide-header">
      <div class="badge-wrap">
        <div class="step-pill">③ 취소 및 환불규정 캡처 (무형상품 · 선물 티켓 유효기간 30일)</div>
        <div class="step-subtext">결제 후 7일 이내 미사용 시 100% 환불 및 선물하기 티켓 유효기간(결제일로부터 30일, 등록 전 구매자 100% 환불, 제3자 양도 불가)을 명시했어요.</div>
      </div>
      <div class="badge-sample">환불규정 · 선물티켓 유효기간</div>
    </div>

    <div class="browser-frame">
      <div class="browser-topbar">
        <div class="browser-dots"><div class="dot dot-red"></div><div class="dot dot-yellow"></div><div class="dot dot-green"></div></div>
        <div class="browser-url-bar"><span class="lock">🔒</span> https://www.heartsync.kr (하단 [취소 및 환불규정] 클릭 시 호출 화면)</div>
      </div>
      <div class="browser-content" style="background: #272226;">
        <img src="${refundB64}" alt="환불규정 캡처" style="object-fit: contain;" />
        <div class="highlight-overlay" style="top: 28px; left: 375px; right: 375px; bottom: 16px;">
          <span class="highlight-tag">✓ 무형상품 환불규정 · 선물 티켓 등록 유효기간(결제일로부터 30일) · 휴대폰 당월/익월 환불 규정 명시</span>
        </div>
      </div>
      <div class="windows-taskbar">
        <div class="taskbar-left"><span>🪟 시작</span><span>🔍 검색</span><span>🌐 Chrome - HeartSync</span></div>
        <div class="taskbar-clock"><span>오후 5:51</span><span>2026-11-18</span></div>
      </div>
    </div>
    <div class="slide-footer-nav">3 / 12</div>
  </div>

  <!-- ==================== SLIDE 4: ④ 로그인/회원가입 시 이용약관·개인정보처리방침 동의 캡처 ==================== -->
  <div class="slide" id="slide-4">
    <div class="guide-header">
      <div class="badge-wrap">
        <div class="step-pill">④ 로그인 및 가입 시 이용약관 · 개인정보처리방침 동의 캡처</div>
        <div class="step-subtext">회원가입 및 로그인 시 [필수] 서비스 이용약관 동의, [필수] 개인정보 수집 및 이용방침 동의(주식회사 레드뱅크) 과정을 구축했어요.</div>
      </div>
      <div class="badge-sample">가입 약관동의 · 테스트계정</div>
    </div>

    <div class="browser-frame">
      <div class="browser-topbar">
        <div class="browser-dots"><div class="dot dot-red"></div><div class="dot dot-yellow"></div><div class="dot dot-green"></div></div>
        <div class="browser-url-bar"><span class="lock">🔒</span> https://www.heartsync.kr/login (테스트 계정: test@heartsync.kr / test1234!)</div>
      </div>
      <div class="browser-content" style="background: #fffafb;">
        <img src="${loginB64}" alt="로그인 및 약관동의 화면 캡처" style="object-fit: contain;" />
        <div class="highlight-overlay" style="top: 52px; left: 390px; right: 390px; bottom: 18px;">
          <span class="highlight-tag">✓ 가입/로그인 시 [필수] 이용약관 동의 · [필수] 개인정보처리방침 동의 체크박스 및 전문 보기 구축</span>
        </div>
      </div>
      <div class="windows-taskbar">
        <div class="taskbar-left"><span>🪟 시작</span><span>🔍 검색</span><span>🌐 Chrome - HeartSync</span></div>
        <div class="taskbar-clock"><span>오후 5:52</span><span>2026-11-18</span></div>
      </div>
    </div>
    <div class="slide-footer-nav">4 / 12</div>
  </div>

  <!-- ==================== SLIDE 5: ④-2 회원 탈퇴 경로(/my) 및 두 약관 내 상호명(주식회사 레드뱅크) 확인 ==================== -->
  <div class="slide" id="slide-5">
    <div class="guide-header">
      <div class="badge-wrap">
        <div class="step-pill">④-2 회원 탈퇴 경로 및 약관 내 상호명(주식회사 레드뱅크) 기재 캡처</div>
        <div class="step-subtext">마이페이지(/my) 내 [회원 탈퇴하기] 경로와 이용약관(/terms) · 개인정보처리방침(/privacy) 내 사업자등록증 상호명(주식회사 레드뱅크) 기재를 확인해요.</div>
      </div>
      <div class="badge-sample" style="background: #dc2626;">휴대폰 심사 필수 요건 확인</div>
    </div>

    <div class="browser-frame">
      <div class="browser-topbar">
        <div class="browser-dots"><div class="dot dot-red"></div><div class="dot dot-yellow"></div><div class="dot dot-green"></div></div>
        <div class="browser-url-bar"><span class="lock">🔒</span> https://www.heartsync.kr/my (회원탈퇴) &nbsp;|&nbsp; https://www.heartsync.kr/terms &nbsp;|&nbsp; https://www.heartsync.kr/privacy</div>
      </div>

      <div class="browser-content" style="background: #f1f5f9; padding: 12px 16px; display: flex; gap: 12px; align-items: stretch; justify-content: space-between;">
        <div style="flex: 1.08; background: #ffffff; border: 2.5px solid #2563eb; border-radius: 10px; overflow: hidden; display: flex; flex-direction: column;">
          <div style="background: #2563eb; color: #ffffff; font-size: 11.5px; font-weight: 800; padding: 7px 12px; display: flex; justify-content: space-between;">
            <span>① 회원 탈퇴 경로 (마이페이지 /my 하단)</span>
            <span style="background: #1d4ed8; padding: 1px 7px; border-radius: 4px; font-size: 10px;">회원 탈퇴하기</span>
          </div>
          <div style="flex: 1; overflow: hidden; background: #ffffff;">
            <img src="${mypageWithdrawB64}" alt="마이페이지 회원 탈퇴 경로" style="width: 100%; height: 100%; object-fit: cover; object-position: bottom center;" />
          </div>
          <div style="padding: 7px 10px; background: #eff6ff; border-top: 1px solid #bfdbfe; font-size: 10.5px; font-weight: 800; color: #1e40af;">
            ✓ 로그인 후 [마이페이지(/my)] → 하단 [회원 탈퇴하기] 클릭 시 즉시 탈퇴 처리
          </div>
        </div>

        <div style="flex: 0.96; background: #ffffff; border: 2.5px solid #2563eb; border-radius: 10px; overflow: hidden; display: flex; flex-direction: column;">
          <div style="background: #2563eb; color: #ffffff; font-size: 11.5px; font-weight: 800; padding: 7px 12px; display: flex; justify-content: space-between;">
            <span>② 서비스 이용약관 (/terms) 상호명 명시</span>
            <span style="background: #1d4ed8; padding: 1px 7px; border-radius: 4px; font-size: 10px;">주식회사 레드뱅크</span>
          </div>
          <div style="flex: 1; overflow: hidden; background: #ffffff;">
            <img src="${termsPageB64}" alt="서비스 이용약관 상호명" style="width: 100%; height: 100%; object-fit: cover; object-position: top center;" />
          </div>
          <div style="padding: 7px 10px; background: #eff6ff; border-top: 1px solid #bfdbfe; font-size: 10.5px; font-weight: 800; color: #1e40af;">
            ✓ 사업자등록증과 동일한 상호명 ‘주식회사 레드뱅크’ 명시
          </div>
        </div>

        <div style="flex: 0.96; background: #ffffff; border: 2.5px solid #2563eb; border-radius: 10px; overflow: hidden; display: flex; flex-direction: column;">
          <div style="background: #2563eb; color: #ffffff; font-size: 11.5px; font-weight: 800; padding: 7px 12px; display: flex; justify-content: space-between;">
            <span>③ 개인정보처리방침 (/privacy) 상호명 명시</span>
            <span style="background: #1d4ed8; padding: 1px 7px; border-radius: 4px; font-size: 10px;">주식회사 레드뱅크</span>
          </div>
          <div style="flex: 1; overflow: hidden; background: #ffffff;">
            <img src="${privacyPageB64}" alt="개인정보처리방침 상호명" style="width: 100%; height: 100%; object-fit: cover; object-position: top center;" />
          </div>
          <div style="padding: 7px 10px; background: #eff6ff; border-top: 1px solid #bfdbfe; font-size: 10.5px; font-weight: 800; color: #1e40af;">
            ✓ 상호명 ‘주식회사 레드뱅크’ 및 토스페이먼츠(주) 결제 위탁 명시
          </div>
        </div>
      </div>

      <div class="windows-taskbar">
        <div class="taskbar-left"><span>🪟 시작</span><span>🔍 검색</span><span>🌐 Chrome - HeartSync (/my · /terms · /privacy)</span></div>
        <div class="taskbar-clock"><span>오후 5:53</span><span>2026-11-18</span></div>
      </div>
    </div>
    <div class="slide-footer-nav">5 / 12</div>
  </div>

  <!-- ==================== SLIDE 6: ⑤ 상품선택/구매과정 캡처 (1/2) — 메인 페이지 ==================== -->
  <div class="slide" id="slide-6">
    <div class="guide-header">
      <div class="badge-wrap">
        <div class="step-pill">⑤ 상품선택/구매과정 캡처 (1/2) — 메인 페이지</div>
        <div class="step-subtext">결제경로 흐름 [메인 페이지 → 상품 선택 → 통합결제창 호출 → 결제창 확인] 중 첫 단계인 메인 페이지 화면이에요.</div>
      </div>
      <div class="badge-sample">STEP 1. 메인 페이지</div>
    </div>

    <div class="flow-bar">
      <span class="flow-step active">1. 메인 페이지 (현재 단계)</span>
      <span class="flow-arrow">→</span>
      <span class="flow-step">2. 상품 선택 (/pricing)</span>
      <span class="flow-arrow">→</span>
      <span class="flow-step">3. 토스 라이브 통합결제창 호출</span>
      <span class="flow-arrow">→</span>
      <span class="flow-step">4. 결제창 확인 (신용카드 · 휴대폰)</span>
    </div>

    <div class="browser-frame">
      <div class="browser-topbar">
        <div class="browser-dots"><div class="dot dot-red"></div><div class="dot dot-yellow"></div><div class="dot dot-green"></div></div>
        <div class="browser-url-bar"><span class="lock">🔒</span> https://www.heartsync.kr</div>
      </div>
      <div class="browser-content">
        <img src="${mainPageB64}" alt="메인 페이지 캡처" />
        <div class="highlight-overlay" style="top: 286px; left: 380px; right: 380px; height: 70px;">
          <span class="highlight-tag">✓ 메인 페이지 내 [무료 진단 시작하기] 및 상단 메뉴 통해 상품 페이지(/pricing) 이동</span>
        </div>
      </div>
      <div class="windows-taskbar">
        <div class="taskbar-left"><span>🪟 시작</span><span>🔍 검색</span><span>🌐 Chrome - HeartSync</span></div>
        <div class="taskbar-clock"><span>오후 5:54</span><span>2026-11-18</span></div>
      </div>
    </div>
    <div class="slide-footer-nav">6 / 12</div>
  </div>

  <!-- ==================== SLIDE 7: ⑤ 상품선택/구매과정 캡처 (2/2) — 상품 선택 (라이브 모드 전환 완료) ==================== -->
  <div class="slide" id="slide-7">
    <div class="guide-header">
      <div class="badge-wrap">
        <div class="step-pill">⑤ 상품선택/구매과정 캡처 (2/2) — 상품 선택 (라이브 결제 모드 동작 확인)</div>
        <div class="step-subtext">테스트 모드 배너가 제거된 실제 라이브 요금제 페이지에서 단건 최고가 상품(49,000원)의 [1초 간편결제로 시작하기]를 클릭해요.</div>
      </div>
      <div class="badge-sample" style="background: #16a34a;">STEP 2. 상품 선택 (라이브 모드)</div>
    </div>

    <div class="flow-bar">
      <span class="flow-step">1. 메인 페이지</span>
      <span class="flow-arrow">→</span>
      <span class="flow-step active">2. 상품 선택 (/pricing) (현재 단계)</span>
      <span class="flow-arrow">→</span>
      <span class="flow-step">3. 토스 라이브 통합결제창 호출</span>
      <span class="flow-arrow">→</span>
      <span class="flow-step">4. 결제창 확인 (신용카드 · 휴대폰)</span>
    </div>

    <div class="browser-frame">
      <div class="browser-topbar">
        <div class="browser-dots"><div class="dot dot-red"></div><div class="dot dot-yellow"></div><div class="dot dot-green"></div></div>
        <div class="browser-url-bar"><span class="lock">🔒</span> https://www.heartsync.kr/pricing</div>
      </div>

      <div class="browser-content" style="background: #f8fafc; display: flex; gap: 12px; padding: 10px 14px;">
        <div style="flex: 1; height: 100%; border: 1.5px solid #cbd5e1; border-radius: 8px; overflow: hidden; position: relative; background: #fff;">
          <img src="${pricingB64}" alt="개인 정밀 분석 19,900원" style="width: 100%; height: 100%; object-fit: cover; object-position: center 20%;" />
          <div class="highlight-overlay" style="bottom: 22px; left: 75px; right: 75px; height: 120px;">
            <span class="highlight-tag">① 개인 정밀 분석 (₩19,900) / 커플 듀얼 패키지 (₩29,000)</span>
          </div>
        </div>
        <div style="flex: 1; height: 100%; border: 2px solid #2563eb; border-radius: 8px; overflow: hidden; position: relative; background: #fff;">
          <img src="${allCareB64}" alt="30일 올케어 패스 49,000원" style="width: 100%; height: 100%; object-fit: cover; object-position: center 45%;" />
          <div class="highlight-overlay" style="top: 90px; left: 75px; right: 75px; bottom: 26px;">
            <span class="highlight-tag">② 단건 최고가: 30일 올케어 패스 (₩49,000) → [1초 간편결제로 시작하기]</span>
          </div>
        </div>
      </div>

      <div class="windows-taskbar">
        <div class="taskbar-left"><span>🪟 시작</span><span>🔍 검색</span><span>🌐 Chrome - HeartSync</span></div>
        <div class="taskbar-clock"><span>오후 5:55</span><span>2026-11-18</span></div>
      </div>
    </div>
    <div class="slide-footer-nav">7 / 12</div>
  </div>

  <!-- ==================== SLIDE 8: ⑥ [보완 1 완료] 라이브키 연동 통합결제창 호출 확인 ==================== -->
  <div class="slide" id="slide-8">
    <div class="guide-header">
      <div class="badge-wrap">
        <div class="step-pill">⑥ [보완 1 반영] 토스페이먼츠 라이브 통합결제창(live_gck_) 연동 및 테스트 배너 제거 확인</div>
        <div class="step-subtext">실제 라이브키를 연동하여 “테스트 환경이에요” 배너가 제거되었으며, 하단 별도 모달 없이 토스 공식 통합결제창으로 일원화되었어요.</div>
      </div>
      <div class="badge-sample" style="background: #16a34a;">보완 1 완료: 라이브키 실연동</div>
    </div>

    <div class="flow-bar">
      <span class="flow-step">1. 메인 페이지</span>
      <span class="flow-arrow">→</span>
      <span class="flow-step">2. 상품 선택 (/pricing)</span>
      <span class="flow-arrow">→</span>
      <span class="flow-step active">3. 토스 라이브 통합결제창 호출 (현재 단계)</span>
      <span class="flow-arrow">→</span>
      <span class="flow-step">4. 카드사 / 휴대폰 결제수단 확인</span>
    </div>

    <div class="browser-frame">
      <div class="browser-topbar">
        <div class="browser-dots"><div class="dot dot-red"></div><div class="dot dot-yellow"></div><div class="dot dot-green"></div></div>
        <div class="browser-url-bar"><span class="lock">🔒</span> https://www.heartsync.kr/pricing (Toss Payments 라이브 통합결제창 호출 — live_gck_ 연동 완료)</div>
      </div>

      <div class="browser-content" style="background: #f1f5f9; padding: 12px 16px; display: flex; gap: 14px; align-items: stretch;">
        <div style="flex: 1; background: #ffffff; border: 2.5px solid #16a34a; border-radius: 10px; overflow: hidden; display: flex; flex-direction: column;">
          <div style="background: #16a34a; color: #ffffff; font-size: 12px; font-weight: 800; padding: 7px 14px; display: flex; justify-content: space-between;">
            <span>① 라이브 통합결제창 기본 호출 화면 (“테스트 환경” 배너 없음)</span>
            <span style="background: #15803d; padding: 1px 8px; border-radius: 4px; font-size: 10.5px;">LIVE KEY 연동</span>
          </div>
          <div style="flex: 1; overflow: hidden; background: #5b5458; display: flex; align-items: center; justify-content: center;">
            <img src="${tossLiveWidgetB64}" alt="토스 라이브 통합결제창" style="width: 100%; height: 100%; object-fit: contain;" />
          </div>
          <div style="padding: 7px 12px; background: #f0fdf4; border-top: 1px solid #bbf7d0; font-size: 11px; font-weight: 800; color: #166534;">
            ✓ 라이브키 연동 완료로 상단 노란색 테스트 배너 완전 제거 · 하단 자체 제작 버튼 제거 완료
          </div>
        </div>

        <div style="flex: 1; background: #ffffff; border: 2.5px solid #2563eb; border-radius: 10px; overflow: hidden; display: flex; flex-direction: column;">
          <div style="background: #2563eb; color: #ffffff; font-size: 12px; font-weight: 800; padding: 7px 14px; display: flex; justify-content: space-between;">
            <span>② [신용·체크카드] → 카드사 선택 화면 (비씨 · 농협 등 전 카드사)</span>
            <span style="background: #1d4ed8; padding: 1px 8px; border-radius: 4px; font-size: 10.5px;">통합결제창</span>
          </div>
          <div style="flex: 1; overflow: hidden; background: #5b5458; display: flex; align-items: center; justify-content: center;">
            <img src="${tossBcSelectedB64}" alt="신용체크카드 선택 화면" style="width: 100%; height: 100%; object-fit: contain;" />
          </div>
          <div style="padding: 7px 12px; background: #eff6ff; border-top: 1px solid #bfdbfe; font-size: 11px; font-weight: 800; color: #1e40af;">
            ✓ 구매 단계 상호명(주식회사 레드뱅크 | 132-86-23186) 고지 및 [49,000원 결제하기] 정상 활성화
          </div>
        </div>
      </div>

      <div class="windows-taskbar">
        <div class="taskbar-left"><span>🪟 시작</span><span>🔍 검색</span><span>🌐 Chrome - HeartSync (Toss Live Widget)</span></div>
        <div class="taskbar-clock"><span>오후 5:56</span><span>2026-11-18</span></div>
      </div>
    </div>
    <div class="slide-footer-nav">8 / 12</div>
  </div>

  <!-- ==================== SLIDE 9: ⑥-2 [보완 2 완료] 실결제 카드사 모듈 호출 및 상호명 일치 확인 ==================== -->
  <div class="slide" id="slide-9">
    <div class="guide-header">
      <div class="badge-wrap">
        <div class="step-pill">⑥-2 [보완 2 반영] 실결제 카드사 창 호출 및 가맹점 상호명(‘주식회사 레드뱅크’) 설정 확인</div>
        <div class="step-subtext">테스트키 사용 시 노출되던 공용 모달(‘가맹점명: 토스페이먼츠’)이 제거되고, 주식회사 레드뱅크 라이브 MID로 실제 NH농협·BC카드 창이 호출돼요.</div>
      </div>
      <div class="badge-sample" style="background: #dc2626;">보완 2 완료: 가맹점명 일치</div>
    </div>

    <div class="flow-bar">
      <span class="flow-step">1. 메인 페이지</span>
      <span class="flow-arrow">→</span>
      <span class="flow-step">2. 상품 선택 (/pricing)</span>
      <span class="flow-arrow">→</span>
      <span class="flow-step">3. 토스 라이브 통합결제창</span>
      <span class="flow-arrow">→</span>
      <span class="flow-step active">4. 실결제 카드창 호출 확인 (주식회사 레드뱅크 MID 연동)</span>
    </div>

    <div class="browser-frame">
      <div class="browser-topbar">
        <div class="browser-dots"><div class="dot dot-red"></div><div class="dot dot-yellow"></div><div class="dot dot-green"></div></div>
        <div class="browser-url-bar"><span class="lock">🔒</span> https://www.heartsync.kr/pricing &nbsp;→&nbsp; NH농협카드 실결제(vbv.nonghyup.com) &amp; BC 페이북 실결제(vp.vpay.co.kr)</div>
      </div>

      <div class="browser-content" style="background: #f1f5f9; padding: 12px 16px; display: flex; gap: 14px; align-items: stretch;">
        <div style="flex: 1; background: #ffffff; border: 2.5px solid #2563eb; border-radius: 10px; overflow: hidden; display: flex; flex-direction: column;">
          <div style="background: #2563eb; color: #ffffff; font-size: 12px; font-weight: 800; padding: 7px 14px; display: flex; justify-content: space-between;">
            <span>① NH농협카드 라이브 결제창 호출 (vbv.nonghyup.com)</span>
            <span style="background: #1d4ed8; padding: 1px 8px; border-radius: 4px; font-size: 10.5px;">실결제 모듈 전환</span>
          </div>
          <div style="flex: 1; overflow: hidden; background: #272226; display: flex; align-items: center; justify-content: center;">
            <img src="${tossNhMerchantB64}" alt="NH농협카드 실결제창" style="width: 100%; height: 100%; object-fit: contain;" />
          </div>
          <div style="padding: 7px 12px; background: #eff6ff; border-top: 1px solid #bfdbfe; font-size: 11px; font-weight: 800; color: #1e40af;">
            ✓ 기존 테스트 모달(‘가맹점명: 토스페이먼츠’) 대신 ‘주식회사 레드뱅크’ 라이브 가맹점 실결제 모듈 호출 확인
          </div>
        </div>

        <div style="flex: 1; background: #ffffff; border: 2.5px solid #2563eb; border-radius: 10px; overflow: hidden; display: flex; flex-direction: column;">
          <div style="background: #2563eb; color: #ffffff; font-size: 12px; font-weight: 800; padding: 7px 14px; display: flex; justify-content: space-between;">
            <span>② BC카드(페이북) 라이브 결제창 호출 (상품명 · 49,000원 · 실시간 QR)</span>
            <span style="background: #1d4ed8; padding: 1px 8px; border-radius: 4px; font-size: 10.5px;">주식회사 레드뱅크</span>
          </div>
          <div style="flex: 1; overflow: hidden; background: #f8fafc; display: flex; align-items: center; justify-content: center;">
            <img src="${bcPayboocQrB64}" alt="BC 페이북 실결제창" style="width: 100%; height: 100%; object-fit: contain;" />
          </div>
          <div style="padding: 7px 12px; background: #eff6ff; border-top: 1px solid #bfdbfe; font-size: 11px; font-weight: 800; color: #1e40af;">
            ✓ 상점관리자 상호명 ‘주식회사 레드뱅크’ 설정 완료 · 상품명(30일 관계 개선 올케어 패스 / 49,000원) 정상 연동
          </div>
        </div>
      </div>

      <div class="windows-taskbar">
        <div class="taskbar-left"><span>🪟 시작</span><span>🔍 검색</span><span>🌐 Chrome - HeartSync</span><span>💳 카드사 실결제 팝업</span></div>
        <div class="taskbar-clock"><span>오후 5:57</span><span>2026-11-18</span></div>
      </div>
    </div>
    <div class="slide-footer-nav">9 / 12</div>
  </div>

  <!-- ==================== SLIDE 10: ⑥-3 BC카드 결제창 세부 인증 화면 (간편결제 & 기타결제) ==================== -->
  <div class="slide" id="slide-10">
    <div class="guide-header">
      <div class="badge-wrap">
        <div class="step-pill">⑥-3 카드 결제경로 세부 확인 — BC카드 [간편결제(페이북 QR)] 및 [기타결제(비밀번호·인증서)]</div>
        <div class="step-subtext">토스페이먼츠 결제경로 가이드 기준에 따라 비씨카드 라이브 결제창의 [간편결제] 및 [기타결제] 인증 화면을 모두 캡처했어요.</div>
      </div>
      <div class="badge-sample" style="background: #dc2626;">BC카드 간편결제 · 기타결제</div>
    </div>

    <div class="browser-frame">
      <div class="browser-topbar">
        <div class="browser-dots"><div class="dot dot-red"></div><div class="dot dot-yellow"></div><div class="dot dot-green"></div></div>
        <div class="browser-url-bar"><span class="lock">🔒</span> https://www.heartsync.kr/pricing &nbsp;→&nbsp; BC카드 라이브 페이북 결제창 (간편결제 및 기타결제 인증 화면)</div>
      </div>

      <div class="browser-content" style="background: #f1f5f9; padding: 14px 18px; display: flex; gap: 14px; align-items: stretch;">
        <div style="flex: 0.95; background: #ffffff; border: 2px solid #64748b; border-radius: 10px; overflow: hidden; display: flex; flex-direction: column;">
          <div style="background: #334155; color: #ffffff; font-size: 11.5px; font-weight: 800; padding: 7px 12px; display: flex; justify-content: space-between;">
            <span>① BC카드 라이브 결제창 최초 호출</span>
            <span style="color: #cbd5e1;">BC 페이북</span>
          </div>
          <div style="flex: 1; overflow: hidden; background: #ffffff; padding: 6px;">
            <img src="${bcPayboocMainB64}" alt="BC 페이북 최초 호출" style="width: 100%; height: 100%; object-fit: contain;" />
          </div>
          <div style="padding: 7px 10px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; font-weight: 700; color: #334155;">
            • [결제하기] 클릭 → 페이북 앱 QR/결제코드<br/>
            • [기타 결제] 클릭 → 비밀번호/인증서 결제
          </div>
        </div>

        <div style="flex: 1.05; background: #ffffff; border: 3px solid #2563eb; border-radius: 10px; overflow: hidden; display: flex; flex-direction: column;">
          <div style="background: #2563eb; color: #ffffff; font-size: 12px; font-weight: 800; padding: 7px 12px; display: flex; justify-content: space-between;">
            <span>② BC카드 [간편결제] 인증 화면 (QR · 결제코드)</span>
            <span style="background: #1d4ed8; padding: 1px 7px; border-radius: 4px; font-size: 10.5px;">간편결제</span>
          </div>
          <div style="flex: 1; overflow: hidden; background: #ffffff; padding: 6px;">
            <img src="${bcPayboocQrB64}" alt="BC카드 간편결제 QR 화면" style="width: 100%; height: 100%; object-fit: contain;" />
          </div>
          <div style="padding: 7px 10px; background: #eff6ff; border-top: 1px solid #bfdbfe; font-size: 11px; font-weight: 800; color: #1e40af;">
            ✓ 상품명(30일 관계 개선 올케어 패스) · 금액(49,000원)<br/>
            ✓ 라이브 QR코드 및 7자리 결제코드 정상 생성
          </div>
        </div>

        <div style="flex: 1.05; background: #ffffff; border: 3px solid #2563eb; border-radius: 10px; overflow: hidden; display: flex; flex-direction: column;">
          <div style="background: #2563eb; color: #ffffff; font-size: 12px; font-weight: 800; padding: 7px 12px; display: flex; justify-content: space-between;">
            <span>③ BC카드 [기타결제] 인증 화면 (비밀번호 · ISP)</span>
            <span style="background: #1d4ed8; padding: 1px 7px; border-radius: 4px; font-size: 10.5px;">기타결제</span>
          </div>
          <div style="flex: 1; overflow: hidden; background: #ffffff; padding: 6px;">
            <img src="${bcPayboocIspB64}" alt="BC카드 기타결제 ISP 화면" style="width: 100%; height: 100%; object-fit: contain;" />
          </div>
          <div style="padding: 7px 10px; background: #eff6ff; border-top: 1px solid #bfdbfe; font-size: 11px; font-weight: 800; color: #1e40af;">
            ✓ [기타 결제] 클릭 시 비밀번호 결제 및 인증서 등록/결제<br/>
            ✓ 기업공용·선불·기존 ISP 등록 카드 결제 직전 화면 확인
          </div>
        </div>
      </div>

      <div class="windows-taskbar">
        <div class="taskbar-left"><span>🪟 시작</span><span>🔍 검색</span><span>🌐 Chrome - HeartSync</span><span>💳 BC 페이북 결제</span></div>
        <div class="taskbar-clock"><span>오후 5:58</span><span>2026-11-18</span></div>
      </div>
    </div>
    <div class="slide-footer-nav">10 / 12</div>
  </div>

  <!-- ==================== SLIDE 11: ⑥-4 [보완 3 완료] 토스 통합결제창 내 [휴대폰] 결제수단 연동 확인 ==================== -->
  <div class="slide" id="slide-11">
    <div class="guide-header">
      <div class="badge-wrap">
        <div class="step-pill">⑥-4 [보완 3 반영] 토스페이먼츠 통합결제창 내 [휴대폰] 결제수단 노출 확인 (별도 결제창 제거 완료)</div>
        <div class="step-subtext">자체 제작 휴대폰 결제창을 제거하고, 토스 통합결제창 [더보기 ∨] 클릭 시 공식 [휴대폰] 결제수단이 선택되도록 연동했어요. (*심사 전 실결제 미시도 준수)</div>
      </div>
      <div class="badge-sample" style="background: #16a34a;">보완 3 완료: 통합결제창 휴대폰 연동</div>
    </div>

    <div class="flow-bar">
      <span class="flow-step">1. 메인 페이지</span>
      <span class="flow-arrow">→</span>
      <span class="flow-step">2. 상품 선택 (/pricing)</span>
      <span class="flow-arrow">→</span>
      <span class="flow-step">3. 토스 통합결제창 [더보기 ∨] 클릭</span>
      <span class="flow-arrow">→</span>
      <span class="flow-step active">4. 통합결제창 내 [휴대폰] 결제수단 노출 확인 (실결제 미시도)</span>
    </div>

    <div class="browser-frame">
      <div class="browser-topbar">
        <div class="browser-dots"><div class="dot dot-red"></div><div class="dot dot-yellow"></div><div class="dot dot-green"></div></div>
        <div class="browser-url-bar"><span class="lock">🔒</span> https://www.heartsync.kr/pricing (토스페이먼츠 통합결제창 내 공식 [휴대폰] 결제수단 연동 화면)</div>
      </div>

      <div class="browser-content" style="background: #f1f5f9; padding: 12px 16px; display: flex; gap: 14px; align-items: stretch;">
        <div style="flex: 1; background: #ffffff; border: 2.5px solid #64748b; border-radius: 10px; overflow: hidden; display: flex; flex-direction: column;">
          <div style="background: #334155; color: #ffffff; font-size: 12px; font-weight: 800; padding: 7px 14px; display: flex; justify-content: space-between;">
            <span>① 통합결제창 호출 후 결제수단 하단 [더보기 ∨] 클릭</span>
            <span style="color: #cbd5e1; font-size: 10.5px;">STEP 1</span>
          </div>
          <div style="flex: 1; overflow: hidden; background: #5b5458; display: flex; align-items: center; justify-content: center;">
            <img src="${tossLiveWidgetB64}" alt="통합결제창 더보기 클릭 전" style="width: 100%; height: 100%; object-fit: contain;" />
          </div>
          <div style="padding: 7px 12px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; font-weight: 700; color: #334155;">
            ✓ 별도 자체 휴대폰 버튼 없이 토스페이먼츠 통합결제창 단일 UI 제공
          </div>
        </div>

        <div style="flex: 1; background: #ffffff; border: 3px solid #2563eb; border-radius: 10px; overflow: hidden; display: flex; flex-direction: column;">
          <div style="background: #2563eb; color: #ffffff; font-size: 12px; font-weight: 800; padding: 7px 14px; display: flex; justify-content: space-between;">
            <span>② 토스 통합결제창 내 공식 [휴대폰] 결제수단 노출 및 선택 확인</span>
            <span style="background: #1d4ed8; padding: 1px 8px; border-radius: 4px; font-size: 10.5px;">통합결제창 [휴대폰]</span>
          </div>
          <div style="flex: 1; overflow: hidden; background: #5b5458; display: flex; align-items: center; justify-content: center;">
            <img src="${tossMobileTabB64}" alt="통합결제창 휴대폰 수단 선택" style="width: 100%; height: 100%; object-fit: contain;" />
          </div>
          <div style="padding: 7px 12px; background: #eff6ff; border-top: 1px solid #bfdbfe; font-size: 11px; font-weight: 800; color: #1e40af;">
            ✓ 상점관리자 [라이브 / 기본 UI] 설정 반영으로 [휴대폰] 수단 정상 노출 (*안내에 따라 심사 완료 전 결제 시도는 하지 않음)
          </div>
        </div>
      </div>

      <div class="windows-taskbar">
        <div class="taskbar-left"><span>🪟 시작</span><span>🔍 검색</span><span>🌐 Chrome - HeartSync (토스 통합결제창 휴대폰 결제수단)</span></div>
        <div class="taskbar-clock"><span>오후 5:59</span><span>2026-11-18</span></div>
      </div>
    </div>
    <div class="slide-footer-nav">11 / 12</div>
  </div>

  <!-- ==================== SLIDE 12: ⑦ 결제완료 및 무형상품 서비스 제공 캡처 ==================== -->
  <div class="slide" id="slide-12">
    <div class="guide-header">
      <div class="badge-wrap">
        <div class="step-pill">⑦ 결제완료 및 서비스 즉시 제공 캡처</div>
        <div class="step-subtext">결제 승인 완료 후 주문 상세 내역 확인 및 무형 콘텐츠(AI 심층 리포트·코칭)가 즉시 활성화되는 화면이에요.</div>
      </div>
      <div class="badge-sample">결제완료 확인</div>
    </div>

    <div class="browser-frame">
      <div class="browser-topbar">
        <div class="browser-dots"><div class="dot dot-red"></div><div class="dot dot-yellow"></div><div class="dot dot-green"></div></div>
        <div class="browser-url-bar"><span class="lock">🔒</span> https://www.heartsync.kr/payment-success?orderId=HS-couple_premium-20261118&amp;amount=49000</div>
      </div>
      <div class="browser-content">
        <img src="${successB64}" alt="결제 완료 캡처" />
        <div class="highlight-overlay" style="top: 48px; left: 340px; right: 340px; bottom: 52px;">
          <span class="highlight-tag">✓ 결제 승인 완료 (#HS-couple_premium-20261118 / ₩49,000) 및 즉시 서비스 시작 가능</span>
        </div>
      </div>
      <div class="windows-taskbar">
        <div class="taskbar-left"><span>🪟 시작</span><span>🔍 검색</span><span>🌐 Chrome - HeartSync</span></div>
        <div class="taskbar-clock"><span>오후 6:00</span><span>2026-11-18</span></div>
      </div>
    </div>
    <div class="slide-footer-nav">12 / 12</div>
  </div>

</body>
</html>`;

  const htmlPath = path.join(__dirname, 'official_toss_presentation.html');
  fs.writeFileSync(htmlPath, htmlContent, 'utf8');
  console.log('Official 12-slide HTML presentation created:', htmlPath);

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2,
  });

  await page.goto('file:///' + htmlPath.replace(/\\/g, '/'), { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  const baseName = '토스페이먼츠_홈페이지_결제경로_주식회사레드뱅크';
  const rootDir = path.join(__dirname, '..', '..');

  const pdfPath = path.join(rootDir, `${baseName}.pdf`);

  await page.pdf({
    path: pdfPath,
    format: 'A4',
    landscape: true,
    printBackground: true,
    margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
  });
  console.log('PDF rendered successfully at:', pdfPath);

  // Capture each of the 12 slides as high-res PNG for PPTX generation
  const slidesPngDir = path.join(__dirname, 'slide_pngs');
  if (!fs.existsSync(slidesPngDir)) fs.mkdirSync(slidesPngDir, { recursive: true });

  const slideIds = [
    '#slide-1', '#slide-2', '#slide-3', '#slide-4', '#slide-5', '#slide-6',
    '#slide-7', '#slide-8', '#slide-9', '#slide-10', '#slide-11', '#slide-12',
  ];
  const slidePngPaths = [];

  for (let i = 0; i < slideIds.length; i++) {
    const el = await page.$(slideIds[i]);
    const imgPath = path.join(slidesPngDir, `slide_${i + 1}.png`);
    await el.screenshot({ path: imgPath });
    slidePngPaths.push(imgPath);
    console.log(`Captured slide ${i + 1} screenshot for PPTX`);
  }

  await browser.close();

  console.log('Generating PPTX presentation...');
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';
  pptx.author = '주식회사 레드뱅크';
  pptx.company = '주식회사 레드뱅크';
  pptx.subject = '토스페이먼츠 홈페이지 결제경로 보완본 (라이브키 연동 · 상호명 일치 · 통합결제창)';
  pptx.title = '토스페이먼츠 홈페이지 결제경로 - 주식회사 레드뱅크';

  for (let i = 0; i < slidePngPaths.length; i++) {
    const slide = pptx.addSlide();
    slide.addImage({
      path: slidePngPaths[i],
      x: 0,
      y: 0,
      w: '100%',
      h: '100%',
    });
  }

  const pptxPath = path.join(rootDir, `${baseName}.pptx`);
  await pptx.writeFile({ fileName: pptxPath });
  console.log('PPTX generated successfully at:', pptxPath);
}

buildDocs().catch((err) => {
  console.error('Error building Toss docs:', err);
  process.exit(1);
});
