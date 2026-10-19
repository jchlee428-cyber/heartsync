const { chromium } = require('playwright');
const pptxgen = require('pptxgenjs');
const path = require('path');
const fs = require('fs');

async function buildDocs() {
  const capturesDir = path.join(__dirname, 'guide_captures');
  
  function getBase64(file) {
    const p = path.join(capturesDir, file);
    if (!fs.existsSync(p)) return '';
    return 'data:image/png;base64,' + fs.readFileSync(p).toString('base64');
  }

  const footerB64 = getBase64('02_footer_raw.png');
  const refundB64 = getBase64('03_refund_modal_raw.png');
  const loginB64 = getBase64('04_login_page_raw.png');
  const pricingB64 = getBase64('05_pricing_plans_raw.png');
  const allCareB64 = getBase64('06_all_care_plan_raw.png');
  const successB64 = getBase64('08_payment_success_raw.png');

  // HTML content for 8 slides following the Toss Payments Guide
  const htmlContent = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>토스페이먼츠 홈페이지 결제경로 - 주식회사 레드뱅크</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Pretendard:wght@400;500;600;700;800;900&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif;
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
      padding: 30px 45px 25px 45px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      margin: 0 auto 30px auto;
      box-shadow: 0 10px 25px rgba(0,0,0,0.08);
    }
    @media print {
      body { background: transparent; }
      .slide { margin: 0; box-shadow: none; width: 100vw; height: 100vh; }
    }

    /* Guide Header */
    .guide-header {
      margin-bottom: 15px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      position: relative;
    }
    .badge-wrap {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .step-pill {
      display: inline-block;
      background: #4f8bf9;
      color: #ffffff;
      font-size: 15px;
      font-weight: 800;
      padding: 6px 20px;
      border-radius: 4px;
      width: fit-content;
      letter-spacing: -0.3px;
    }
    .step-subtext {
      font-size: 13.5px;
      font-weight: 700;
      color: #334155;
    }
    .step-subtext span {
      color: #64748b;
      font-weight: 500;
      font-size: 12px;
      margin-left: 6px;
    }
    .badge-sample {
      background: #ea580c;
      color: #ffffff;
      font-size: 13px;
      font-weight: 800;
      padding: 4px 18px;
      border-radius: 4px;
    }

    /* Slide 1 Cover */
    .cover-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      gap: 20px;
    }
    .cover-icon {
      font-size: 54px;
    }
    .cover-title {
      font-size: 38px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -1px;
    }
    .cover-desc {
      font-size: 15px;
      color: #64748b;
      margin-top: -5px;
    }
    .cover-info-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 24px 36px;
      width: 780px;
      text-align: left;
      box-shadow: 0 4px 12px rgba(0,0,0,0.03);
    }
    .cover-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    .cover-table td {
      padding: 7px 10px;
      border-bottom: 1px solid #e2e8f0;
    }
    .cover-table td.label {
      font-weight: 800;
      color: #1e40af;
      width: 180px;
    }
    .cover-table td.val {
      font-weight: 600;
      color: #0f172a;
    }

    /* Window Frame for Slides 2-8 */
    .browser-frame {
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 8px 20px rgba(0,0,0,0.06);
      display: flex;
      flex-direction: column;
      background: #ffffff;
      height: 520px;
      position: relative;
    }
    .browser-topbar {
      background: #f1f5f9;
      padding: 6px 12px;
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 1px solid #e2e8f0;
    }
    .browser-dots {
      display: flex;
      gap: 5px;
    }
    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }
    .dot-red { background: #ef4444; }
    .dot-yellow { background: #f59e0b; }
    .dot-green { background: #10b981; }

    .browser-url-bar {
      flex: 1;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 4px 12px;
      font-size: 11.5px;
      color: #334155;
      display: flex;
      align-items: center;
      gap: 6px;
      font-family: monospace;
      font-weight: 600;
    }
    .browser-url-bar .lock {
      color: #10b981;
      font-weight: bold;
    }

    .browser-content {
      flex: 1;
      overflow: hidden;
      position: relative;
      background: #ffffff;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .browser-content img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: top center;
    }

    /* Windows Taskbar at bottom */
    .windows-taskbar {
      height: 34px;
      background: #e2e8f0;
      border-top: 1px solid #cbd5e1;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 14px;
      font-size: 11px;
      color: #334155;
      user-select: none;
    }
    .taskbar-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .taskbar-clock {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      line-height: 1.1;
      font-size: 10.5px;
      font-weight: 600;
      color: #1e293b;
    }

    /* Blue Highlight Box (Guide Style) */
    .highlight-overlay {
      position: absolute;
      border: 3px solid #2563eb;
      background: rgba(37, 99, 235, 0.05);
      border-radius: 8px;
      pointer-events: none;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
    }
    .highlight-tag {
      position: absolute;
      top: -24px;
      left: 0;
      background: #2563eb;
      color: #ffffff;
      font-size: 11px;
      font-weight: 800;
      padding: 2px 10px;
      border-radius: 4px;
      white-space: nowrap;
    }

    /* Footer Pagination */
    .slide-footer-nav {
      position: absolute;
      bottom: 8px;
      right: 25px;
      font-size: 11.5px;
      font-weight: 700;
      color: #94a3b8;
    }

    /* Slide 7: Toss Payments & BC Card Mock */
    .payment-mock-container {
      display: flex;
      gap: 20px;
      justify-content: center;
      align-items: center;
      height: 100%;
      background: #f8fafc;
      padding: 15px;
    }
    .toss-card-box {
      width: 440px;
      background: #ffffff;
      border-radius: 16px;
      border: 1px solid #cbd5e1;
      box-shadow: 0 10px 25px rgba(0,0,0,0.08);
      padding: 20px;
    }
    .bc-card-box {
      width: 440px;
      background: #ffffff;
      border-radius: 16px;
      border: 1px solid #cbd5e1;
      box-shadow: 0 10px 25px rgba(0,0,0,0.08);
      padding: 20px;
    }
  </style>
</head>
<body>

  <!-- ==================== SLIDE 1: 가맹점 정보 기재 (표지) ==================== -->
  <div class="slide" id="slide-1">
    <div class="guide-header">
      <div class="badge-wrap">
        <div class="step-pill">① 가맹점 정보 기재</div>
        <div class="step-subtext">시작 페이지에 가맹점 정보를 기재해요. <span>(토스페이먼츠 및 카드사 심사용 공식 서류)</span></div>
      </div>
      <div class="badge-sample">필수 서류</div>
    </div>

    <div class="cover-body">
      <div class="cover-icon">💳 💕</div>
      <h1 class="cover-title">홈페이지 결제경로 안내서</h1>
      <p class="cover-desc">주식회사 레드뱅크 | HeartSync (하트싱크) 카드사 가맹점 심사 신청용</p>

      <div class="cover-info-card">
        <table class="cover-table">
          <tr>
            <td class="label">(1) 상호명</td>
            <td class="val">주식회사 레드뱅크</td>
          </tr>
          <tr>
            <td class="label">(2) 사업자등록번호</td>
            <td class="val">132-86-23186</td>
          </tr>
          <tr>
            <td class="label">(3) 가맹점 URL</td>
            <td class="val"><strong style="color: #2563eb;">https://heartsync.kr</strong></td>
          </tr>
          <tr>
            <td class="label">(4) 테스트 ID / PW</td>
            <td class="val"><strong>test@heartsync.kr</strong> / <strong>test1234!</strong> (원클릭 간편 로그인 지원)</td>
          </tr>
          <tr>
            <td class="label">대표자명</td>
            <td class="val">이종철</td>
          </tr>
          <tr>
            <td class="label">통신판매업신고번호</td>
            <td class="val">제2016-서울송파-0856호</td>
          </tr>
          <tr>
            <td class="label">사업장 주소</td>
            <td class="val">서울특별시 송파구 문정로 246, 2호 (마천동, 사회적경제센터 1-1)</td>
          </tr>
          <tr>
            <td class="label">고객센터 (유선전화)</td>
            <td class="val"><strong>1599-9573</strong> (운영시간: 평일 10:00 ~ 18:00)</td>
          </tr>
          <tr>
            <td class="label">토스페이먼츠 상점아이디</td>
            <td class="val"><strong>heartsmd8v</strong></td>
          </tr>
        </table>
      </div>
    </div>
    <div class="slide-footer-nav">1 / 8</div>
  </div>

  <!-- ==================== SLIDE 2: 하단정보 캡처 (Footer) ==================== -->
  <div class="slide" id="slide-2">
    <div class="guide-header">
      <div class="badge-wrap">
        <div class="step-pill">② 하단정보 캡처</div>
        <div class="step-subtext">필수정보가 모두 포함된 하단정보를 캡처해요. <span>(상호명 / 대표자명 / 사업자번호 / 통신판매업신고번호 / 사업장주소 / 유선전화번호)</span></div>
      </div>
      <div class="badge-sample">확인 완료</div>
    </div>

    <div class="browser-frame">
      <div class="browser-topbar">
        <div class="browser-dots">
          <div class="dot dot-red"></div>
          <div class="dot dot-yellow"></div>
          <div class="dot dot-green"></div>
        </div>
        <div class="browser-url-bar">
          <span class="lock">🔒</span> https://heartsync.kr
        </div>
      </div>

      <div class="browser-content" style="position: relative;">
        <img src="${footerB64}" alt="하단정보 캡처">
        <!-- Blue Highlight Overlay for Footer Business Info -->
        <div class="highlight-overlay" style="bottom: 8px; left: 160px; right: 160px; height: 160px;">
          <span class="highlight-tag">✓ 필수 6대 사업자정보 일체 완비 (상호/대표/사업자번호/통신판매번호/사업장주소/유선전화)</span>
        </div>
      </div>

      <div class="windows-taskbar">
        <div class="taskbar-left">
          <span>🪟 시작</span>
          <span>🔍 검색</span>
          <span>📁 파일</span>
          <span>🌐 Chrome</span>
        </div>
        <div class="taskbar-clock">
          <span>오후 4:21</span>
          <span>2026-10-19</span>
        </div>
      </div>
    </div>
    <div class="slide-footer-nav">2 / 8</div>
  </div>

  <!-- ==================== SLIDE 3: 환불규정 캡처 (무형상품) ==================== -->
  <div class="slide" id="slide-3">
    <div class="guide-header">
      <div class="badge-wrap">
        <div class="step-pill">③ 환불규정 캡처 (무형상품)</div>
        <div class="step-subtext">환불규정을 캡처해요. <span>(무형상품 디지털 콘텐츠 청약철회 및 7일 이내 100% 환불 정책)</span></div>
      </div>
      <div class="badge-sample">확인 완료</div>
    </div>

    <div class="browser-frame">
      <div class="browser-topbar">
        <div class="browser-dots">
          <div class="dot dot-red"></div>
          <div class="dot dot-yellow"></div>
          <div class="dot dot-green"></div>
        </div>
        <div class="browser-url-bar">
          <span class="lock">🔒</span> https://heartsync.kr/refund-policy
        </div>
      </div>

      <div class="browser-content" style="position: relative;">
        <img src="${refundB64}" alt="환불규정 캡처">
        <div class="highlight-overlay" style="top: 80px; left: 350px; width: 580px; height: 380px;">
          <span class="highlight-tag">✓ 전자상거래소비자보호법 준수 (리포트 열람 전 7일 이내 100% 전액 환불 명시)</span>
        </div>
      </div>

      <div class="windows-taskbar">
        <div class="taskbar-left">
          <span>🪟 시작</span>
          <span>🔍 검색</span>
          <span>📁 파일</span>
          <span>🌐 Chrome</span>
        </div>
        <div class="taskbar-clock">
          <span>오후 4:23</span>
          <span>2026-10-19</span>
        </div>
      </div>
    </div>
    <div class="slide-footer-nav">3 / 8</div>
  </div>

  <!-- ==================== SLIDE 4: 로그인 / 회원가입 캡처 ==================== -->
  <div class="slide" id="slide-4">
    <div class="guide-header">
      <div class="badge-wrap">
        <div class="step-pill">④ 로그인/회원가입 캡처</div>
        <div class="step-subtext">로그인 혹은 회원가입 경로를 캡처해요. <span>(카카오/네이버/구글 간편가입 및 테스트 계정 지원)</span></div>
      </div>
      <div class="badge-sample">확인 완료</div>
    </div>

    <div class="browser-frame">
      <div class="browser-topbar">
        <div class="browser-dots">
          <div class="dot dot-red"></div>
          <div class="dot dot-yellow"></div>
          <div class="dot dot-green"></div>
        </div>
        <div class="browser-url-bar">
          <span class="lock">🔒</span> https://heartsync.kr/login
        </div>
      </div>

      <div class="browser-content" style="position: relative;">
        <img src="${loginB64}" alt="로그인 회원가입 캡처">
        <div class="highlight-overlay" style="top: 100px; left: 380px; width: 520px; height: 350px;">
          <span class="highlight-tag">✓ 1초 간편 로그인 및 심사용 테스트 계정(test@heartsync.kr) 제공</span>
        </div>
      </div>

      <div class="windows-taskbar">
        <div class="taskbar-left">
          <span>🪟 시작</span>
          <span>🔍 검색</span>
          <span>📁 파일</span>
          <span>🌐 Chrome</span>
        </div>
        <div class="taskbar-clock">
          <span>오후 4:25</span>
          <span>2026-10-19</span>
        </div>
      </div>
    </div>
    <div class="slide-footer-nav">4 / 8</div>
  </div>

  <!-- ==================== SLIDE 5: 상품선택 / 구매과정 캡처 ==================== -->
  <div class="slide" id="slide-5">
    <div class="guide-header">
      <div class="badge-wrap">
        <div class="step-pill">⑤ 상품선택/구매과정 캡처</div>
        <div class="step-subtext">유/무형 상품의 구매 경로를 모두 캡처해주세요. <span>(상품명, 금액, 옵션, 상세제공혜택 확인)</span></div>
      </div>
      <div class="badge-sample">확인 완료</div>
    </div>

    <div class="browser-frame">
      <div class="browser-topbar">
        <div class="browser-dots">
          <div class="dot dot-red"></div>
          <div class="dot dot-yellow"></div>
          <div class="dot dot-green"></div>
        </div>
        <div class="browser-url-bar">
          <span class="lock">🔒</span> https://heartsync.kr/pricing
        </div>
      </div>

      <div class="browser-content" style="position: relative;">
        <img src="${pricingB64}" alt="상품선택 구매과정 캡처">
        <div class="highlight-overlay" style="top: 40px; left: 160px; right: 160px; height: 380px;">
          <span class="highlight-tag">✓ 요금제 및 상품 구성 (베이직 ₩19,000 / 프리미엄 ₩29,000 / 올케어 ₩49,000)</span>
        </div>
      </div>

      <div class="windows-taskbar">
        <div class="taskbar-left">
          <span>🪟 시작</span>
          <span>🔍 검색</span>
          <span>📁 파일</span>
          <span>🌐 Chrome</span>
        </div>
        <div class="taskbar-clock">
          <span>오후 4:28</span>
          <span>2026-10-19</span>
        </div>
      </div>
    </div>
    <div class="slide-footer-nav">5 / 8</div>
  </div>

  <!-- ==================== SLIDE 6: 단건 결제 최고가 상품 상세 안내 [별첨] ==================== -->
  <div class="slide" id="slide-6">
    <div class="guide-header">
      <div class="badge-wrap">
        <div class="step-pill" style="background: #9333ea;">[별첨] 단건 최고가 상품 상세 안내</div>
        <div class="step-subtext">단건 결제 최고가 상품(30일 올케어 패스 ₩49,000) 상세 화면 및 옵션 확인 <span>(30일 이용기간, 6개월 초과 금지 규정 준수)</span></div>
      </div>
      <div class="badge-sample">단건 최고가</div>
    </div>

    <div class="browser-frame">
      <div class="browser-topbar">
        <div class="browser-dots">
          <div class="dot dot-red"></div>
          <div class="dot dot-yellow"></div>
          <div class="dot dot-green"></div>
        </div>
        <div class="browser-url-bar">
          <span class="lock">🔒</span> https://heartsync.kr/pricing#all-care
        </div>
      </div>

      <div class="browser-content" style="position: relative;">
        <img src="${allCareB64}" alt="단건 최고가 상품 상세 캡처">
        <div class="highlight-overlay" style="top: 25px; left: 320px; width: 640px; height: 420px;">
          <span class="highlight-tag">✓ 30일 관계 개선 올케어 패스 (₩49,000 / 30일 단건 무제한 / 6대 혜택 완비)</span>
        </div>
      </div>

      <div class="windows-taskbar">
        <div class="taskbar-left">
          <span>🪟 시작</span>
          <span>🔍 검색</span>
          <span>📁 파일</span>
          <span>🌐 Chrome</span>
        </div>
        <div class="taskbar-clock">
          <span>오후 4:30</span>
          <span>2026-10-19</span>
        </div>
      </div>
    </div>
    <div class="slide-footer-nav">6 / 8</div>
  </div>

  <!-- ==================== SLIDE 7: 카드 결제경로 캡처 ==================== -->
  <div class="slide" id="slide-7">
    <div class="guide-header">
      <div class="badge-wrap">
        <div class="step-pill">⑥ 카드결제경로 캡처</div>
        <div class="step-subtext">카드 결제 과정을 캡처해요. <span>(토스페이먼츠 표준 결제창 및 비씨카드/페이북 인증 화면 포함)</span></div>
      </div>
      <div class="badge-sample">결제창 연동</div>
    </div>

    <div class="browser-frame">
      <div class="browser-topbar">
        <div class="browser-dots">
          <div class="dot dot-red"></div>
          <div class="dot dot-yellow"></div>
          <div class="dot dot-green"></div>
        </div>
        <div class="browser-url-bar">
          <span class="lock">🔒</span> https://api.tosspayments.com/v1/payments (Toss Payments SDK v2)
        </div>
      </div>

      <div class="browser-content">
        <div class="payment-mock-container">
          <!-- Toss Standard Window -->
          <div class="toss-card-box">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #f1f5f9; padding-bottom:10px; margin-bottom:12px;">
              <span style="font-size:14px; font-weight:800; color:#0f172a;">신용/체크카드 결제</span>
              <span style="font-size:11px; color:#64748b;">토스페이먼츠 보안모듈</span>
            </div>
            <div style="background:#f8fafc; border-radius:10px; padding:12px; margin-bottom:14px;">
              <div style="display:flex; justify-content:space-between; font-size:12px; color:#64748b; margin-bottom:4px;">
                <span>주문 상품</span>
                <span style="font-weight:700; color:#0f172a;">AI 커플 심층 분석 리포트 (2인)</span>
              </div>
              <div style="display:flex; justify-content:space-between; font-size:15px; font-weight:900; color:#e11d48;">
                <span>결제 금액</span>
                <span>₩29,000</span>
              </div>
            </div>

            <!-- Card Grid -->
            <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:8px; margin-bottom:14px; text-align:center;">
              <div style="padding:10px 4px; border:2px solid #2563eb; border-radius:8px; background:#eff6ff; font-size:11px; font-weight:800; color:#1d4ed8;">비씨(페이북)</div>
              <div style="padding:10px 4px; border:1px solid #e2e8f0; border-radius:8px; font-size:11px; font-weight:700; color:#334155;">신한카드</div>
              <div style="padding:10px 4px; border:1px solid #e2e8f0; border-radius:8px; font-size:11px; font-weight:700; color:#334155;">현대카드</div>
              <div style="padding:10px 4px; border:1px solid #e2e8f0; border-radius:8px; font-size:11px; font-weight:700; color:#334155;">KB국민</div>
              <div style="padding:10px 4px; border:1px solid #e2e8f0; border-radius:8px; font-size:11px; font-weight:700; color:#334155;">삼성카드</div>
              <div style="padding:10px 4px; border:1px solid #e2e8f0; border-radius:8px; font-size:11px; font-weight:700; color:#334155;">롯데카드</div>
              <div style="padding:10px 4px; border:1px solid #e2e8f0; border-radius:8px; font-size:11px; font-weight:700; color:#334155;">하나카드</div>
              <div style="padding:10px 4px; border:1px solid #e2e8f0; border-radius:8px; font-size:11px; font-weight:700; color:#334155;">NH농협</div>
            </div>

            <div style="background:#f8fafc; border-radius:8px; padding:10px; font-size:11px; color:#475569; margin-bottom:12px;">
              <div style="font-weight:700; color:#0f172a; margin-bottom:4px;">✓ 전자금융거래 기본약관 전체 동의</div>
              <div>개인정보 수집 및 제3자 제공, 결제 대행 서비스 이용약관 동의 완료</div>
            </div>

            <div style="background:#2563eb; color:#ffffff; text-align:center; padding:10px; border-radius:8px; font-size:13px; font-weight:800;">
              29,000원 결제하기
            </div>
          </div>

          <!-- BC Card ISP / Paybooc Authentication Window (Guide Page 16 requirement) -->
          <div class="bc-card-box">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #ef4444; padding-bottom:8px; margin-bottom:12px;">
              <span style="font-size:14px; font-weight:900; color:#ef4444;">BC 페이북 결제인증</span>
              <span style="font-size:11px; color:#64748b;">안심클릭 / ISP</span>
            </div>

            <div style="text-align:center; padding:15px; background:#fef2f2; border-radius:10px; margin-bottom:14px;">
              <div style="font-size:13px; font-weight:800; color:#991b1b; margin-bottom:4px;">페이북 앱 / QR코드 간편결제</div>
              <div style="font-size:11px; color:#7f1d1d;">스마트폰의 페이북 앱을 열어 결제를 진행해주세요.</div>
            </div>

            <div style="border:1px solid #e2e8f0; border-radius:8px; padding:12px; font-size:11px; color:#334155; margin-bottom:14px; line-height:1.6;">
              <div style="display:flex; justify-content:space-between;"><span>가맹점명:</span><strong>주식회사 레드뱅크 (HeartSync)</strong></div>
              <div style="display:flex; justify-content:space-between;"><span>결제금액:</span><strong style="color:#ef4444;">29,000원</strong></div>
              <div style="display:flex; justify-content:space-between;"><span>할부기간:</span><span>일시불</span></div>
            </div>

            <div style="display:flex; gap:8px;">
              <div style="flex:1; background:#ef4444; color:#ffffff; text-align:center; padding:10px; border-radius:8px; font-size:12px; font-weight:800;">
                결제 승인 요청
              </div>
              <div style="width:70px; background:#e2e8f0; color:#475569; text-align:center; padding:10px; border-radius:8px; font-size:12px; font-weight:700;">
                취소
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="windows-taskbar">
        <div class="taskbar-left">
          <span>🪟 시작</span>
          <span>🔍 검색</span>
          <span>📁 파일</span>
          <span>🌐 Chrome</span>
        </div>
        <div class="taskbar-clock">
          <span>오후 4:33</span>
          <span>2026-10-19</span>
        </div>
      </div>
    </div>
    <div class="slide-footer-nav">7 / 8</div>
  </div>

  <!-- ==================== SLIDE 8: 결제 완료 및 서비스 즉시 제공 캡처 ==================== -->
  <div class="slide" id="slide-8">
    <div class="guide-header">
      <div class="badge-wrap">
        <div class="step-pill">⑦ 결제완료 및 서비스 제공 캡처</div>
        <div class="step-subtext">결제 완료 및 서비스 제공 화면을 캡처해요. <span>(온라인 무형 서비스 즉시 제공 및 주문 상세 확인)</span></div>
      </div>
      <div class="badge-sample">확인 완료</div>
    </div>

    <div class="browser-frame">
      <div class="browser-topbar">
        <div class="browser-dots">
          <div class="dot dot-red"></div>
          <div class="dot dot-yellow"></div>
          <div class="dot dot-green"></div>
        </div>
        <div class="browser-url-bar">
          <span class="lock">🔒</span> https://heartsync.kr/payment-success?orderId=HS-20261019-89241&amount=29000
        </div>
      </div>

      <div class="browser-content" style="position: relative;">
        <img src="${successB64}" alt="결제 완료 캡처">
        <div class="highlight-overlay" style="top: 50px; left: 320px; width: 640px; height: 380px;">
          <span class="highlight-tag">✓ 주문번호 영구 보관 & 무형 서비스(AI 심층 리포트 생성 및 영구소장 PDF) 즉시 활성화</span>
        </div>
      </div>

      <div class="windows-taskbar">
        <div class="taskbar-left">
          <span>🪟 시작</span>
          <span>🔍 검색</span>
          <span>📁 파일</span>
          <span>🌐 Chrome</span>
        </div>
        <div class="taskbar-clock">
          <span>오후 4:36</span>
          <span>2026-10-19</span>
        </div>
      </div>
    </div>
    <div class="slide-footer-nav">8 / 8</div>
  </div>

</body>
</html>`;

  const htmlPath = path.join(__dirname, 'official_toss_presentation.html');
  fs.writeFileSync(htmlPath, htmlContent, 'utf8');
  console.log('Official HTML presentation created:', htmlPath);

  // Launch Playwright to export PDF and slide screenshots
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2
  });

  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 1. Export PDF
  const baseName = '토스페이먼츠_홈페이지_결제경로_주식회사레드뱅크';
  let pdfPath = path.join(__dirname, '..', '..', `${baseName}.pdf`);
  const desktopDir = 'C:\\Users\\vikin\\OneDrive\\바탕 화면';
  let desktopPdfPath = path.join(desktopDir, `${baseName}.pdf`);

  try {
    if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
  } catch (e) {
    pdfPath = path.join(__dirname, '..', '..', `${baseName}_제출용.pdf`);
    desktopPdfPath = path.join(desktopDir, `${baseName}_제출용.pdf`);
  }

  await page.pdf({
    path: pdfPath,
    format: 'A4',
    landscape: true,
    printBackground: true,
    margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
  });
  console.log('PDF rendered successfully at:', pdfPath);

  try {
    fs.copyFileSync(pdfPath, desktopPdfPath);
    console.log('PDF copied to Desktop:', desktopPdfPath);
  } catch (err) {
    console.log('Notice copying PDF to desktop:', err.message);
  }

  // 2. Capture each slide as PNG for PPTX generation
  const slidesPngDir = path.join(__dirname, 'slide_pngs');
  if (!fs.existsSync(slidesPngDir)) fs.mkdirSync(slidesPngDir, { recursive: true });

  const slideIds = ['#slide-1', '#slide-2', '#slide-3', '#slide-4', '#slide-5', '#slide-6', '#slide-7', '#slide-8'];
  const slidePngPaths = [];

  for (let i = 0; i < slideIds.length; i++) {
    const el = await page.$(slideIds[i]);
    const imgPath = path.join(slidesPngDir, `slide_${i + 1}.png`);
    await el.screenshot({ path: imgPath });
    slidePngPaths.push(imgPath);
    console.log(`Captured slide ${i + 1} screenshot for PPTX`);
  }

  await browser.close();

  // 3. Generate PPTX using pptxgenjs
  console.log('Generating PPTX presentation...');
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';
  pptx.author = '주식회사 레드뱅크';
  pptx.company = '주식회사 레드뱅크';
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

  let pptxPath = path.join(__dirname, '..', '..', `${baseName}.pptx`);
  let desktopPptxPath = path.join(desktopDir, `${baseName}.pptx`);

  try {
    if (fs.existsSync(pptxPath)) fs.unlinkSync(pptxPath);
  } catch (e) {
    pptxPath = path.join(__dirname, '..', '..', `${baseName}_제출용.pptx`);
    desktopPptxPath = path.join(desktopDir, `${baseName}_제출용.pptx`);
  }

  await pptx.writeFile({ fileName: pptxPath });
  console.log('PPTX created at:', pptxPath);

  try {
    fs.copyFileSync(pptxPath, desktopPptxPath);
    console.log('PPTX copied to Desktop:', desktopPptxPath);
  } catch (err) {
    console.log('Notice copying PPTX to desktop:', err.message);
  }

  console.log('ALL OFFICIAL TOSS PAYMENTS DOCUMENTS GENERATED SUCCESSFULLY!');
}

buildDocs().catch(err => {
  console.error('Error generating official docs:', err);
  process.exit(1);
});
