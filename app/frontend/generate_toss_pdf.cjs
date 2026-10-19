const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

async function generatePdf() {
  console.log('Reading captured images...');
  const pricingImgPath = path.join(__dirname, 'pricing_cards.png');
  const successImgPath = path.join(__dirname, 'success_fixed.png');
  const allCareImgPath = path.join(__dirname, 'all_care_card_full.png');

  const pricingBase64 = fs.existsSync(pricingImgPath)
    ? `data:image/png;base64,${fs.readFileSync(pricingImgPath).toString('base64')}`
    : '';
  const successBase64 = fs.existsSync(successImgPath)
    ? `data:image/png;base64,${fs.readFileSync(successImgPath).toString('base64')}`
    : '';
  const allCareBase64 = fs.existsSync(allCareImgPath)
    ? `data:image/png;base64,${fs.readFileSync(allCareImgPath).toString('base64')}`
    : '';

  const htmlContent = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>토스페이먼츠 결제경로 안내서 - 주식회사 레드뱅크</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Pretendard:wght@400;600;700;800;900&display=swap');
    
    @page {
      size: A4 landscape;
      margin: 0;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, "Malgun Gothic", sans-serif;
      background: #f8fafc;
      color: #0f172a;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .slide {
      width: 297mm;
      height: 210mm;
      page-break-after: always;
      position: relative;
      overflow: hidden;
      background: #ffffff;
      padding: 15mm 18mm;
      display: flex;
      flex-direction: column;
    }

    /* Header & Footer */
    .slide-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 8px;
      border-bottom: 2px solid #f1f5f9;
      margin-bottom: 14px;
    }
    .slide-logo {
      font-size: 18px;
      font-weight: 900;
      color: #e11d48;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .slide-meta {
      font-size: 11px;
      color: #64748b;
      font-weight: 600;
    }
    .slide-footer {
      margin-top: auto;
      padding-top: 8px;
      border-top: 1px solid #f1f5f9;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      color: #94a3b8;
    }

    /* Cover Slide */
    .cover-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      background: radial-gradient(circle at 50% 30%, #fff1f2 0%, #ffffff 70%);
      border-radius: 20px;
      padding: 18px;
      border: 1px solid #ffe4e6;
    }
    .cover-badge {
      display: inline-block;
      padding: 5px 14px;
      background: #e11d48;
      color: white;
      font-size: 12px;
      font-weight: 800;
      border-radius: 9999px;
      margin-bottom: 12px;
      letter-spacing: 0.5px;
    }
    .cover-title {
      font-size: 30px;
      font-weight: 900;
      color: #0f172a;
      line-height: 1.3;
      margin-bottom: 6px;
    }
    .cover-subtitle {
      font-size: 15px;
      color: #475569;
      font-weight: 600;
      margin-bottom: 22px;
    }
    .info-table {
      width: 100%;
      max-width: 680px;
      border-collapse: collapse;
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
      border: 1px solid #e2e8f0;
      font-size: 11.5px;
    }
    .info-table th {
      background: #f8fafc;
      padding: 8px 14px;
      text-align: left;
      font-weight: 700;
      color: #475569;
      width: 28%;
      border-bottom: 1px solid #e2e8f0;
    }
    .info-table td {
      padding: 8px 14px;
      color: #0f172a;
      font-weight: 600;
      border-bottom: 1px solid #e2e8f0;
      text-align: left;
    }

    /* Content Slides */
    .step-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 800;
      color: #e11d48;
      margin-bottom: 3px;
    }
    .step-title {
      font-size: 19px;
      font-weight: 900;
      color: #0f172a;
      margin-bottom: 12px;
    }
    .content-grid {
      display: grid;
      grid-template-columns: 1.1fr 1fr;
      gap: 18px;
      flex: 1;
      align-items: center;
    }
    .screen-card {
      background: #ffffff;
      border-radius: 14px;
      border: 2px solid #e2e8f0;
      padding: 8px;
      box-shadow: 0 8px 12px -3px rgba(0, 0, 0, 0.06);
      display: flex;
      justify-content: center;
      align-items: center;
      height: 430px;
      overflow: hidden;
    }
    .screen-card img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      border-radius: 8px;
    }
    .desc-card {
      display: flex;
      flex-direction: column;
      gap: 10px;
      justify-content: center;
    }
    .desc-box {
      background: #f8fafc;
      border-left: 4px solid #e11d48;
      padding: 10px 14px;
      border-radius: 0 10px 10px 0;
    }
    .desc-box h4 {
      font-size: 12.5px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 3px;
    }
    .desc-box p, .desc-box ul {
      font-size: 11px;
      color: #475569;
      line-height: 1.45;
    }
    .desc-box ul {
      margin-left: 14px;
      margin-top: 3px;
    }
    .check-item {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      font-size: 11px;
      color: #334155;
      line-height: 1.35;
    }
    .check-icon {
      color: #059669;
      font-weight: 900;
      font-size: 12px;
    }

    /* Toss Payment Mock UI on Slide 3 */
    .toss-mock-window {
      width: 100%;
      max-width: 350px;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 15px 20px -5px rgba(0, 0, 0, 0.12);
      border: 1px solid #cbd5e1;
      overflow: hidden;
    }
    .toss-mock-header {
      background: #0064FF;
      color: white;
      padding: 12px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .toss-mock-header h3 {
      font-size: 13.5px;
      font-weight: 800;
    }
    .toss-mock-body {
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .toss-item-row {
      display: flex;
      justify-content: space-between;
      font-size: 11.5px;
      padding-bottom: 6px;
      border-bottom: 1px dashed #e2e8f0;
    }
    .toss-method-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
    }
    .toss-method-btn {
      padding: 9px;
      border: 1.5px solid #0064FF;
      background: #eff6ff;
      border-radius: 8px;
      text-align: center;
      font-size: 10.5px;
      font-weight: 700;
      color: #0064FF;
    }
    .toss-method-btn.gray {
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      color: #475569;
    }
    .toss-pay-btn {
      background: #0064FF;
      color: white;
      text-align: center;
      padding: 11px;
      border-radius: 10px;
      font-size: 12.5px;
      font-weight: 800;
      margin-top: 4px;
    }
  </style>
</head>
<body>

  <!-- ==================== SLIDE 1: COVER ==================== -->
  <div class="slide">
    <div class="slide-header">
      <div class="slide-logo">💕 HeartSync</div>
      <div class="slide-meta">토스페이먼츠 전자결제 신규 계약 심사 자료</div>
    </div>

    <div class="cover-body">
      <div class="cover-badge">토스페이먼츠(Toss Payments) 결제경로 심사 제출용</div>
      <h1 class="cover-title">홈페이지 결제경로 안내서</h1>
      <p class="cover-subtitle">주식회사 레드뱅크 · HeartSync (하트싱크) AI 관계 진단 서비스</p>

      <table class="info-table">
        <tr>
          <th>가맹점 상호명</th>
          <td><strong>주식회사 레드뱅크</strong></td>
        </tr>
        <tr>
          <th>상점아이디 (MID)</th>
          <td><strong>heartsmd8v</strong></td>
        </tr>
        <tr>
          <th>대표자명</th>
          <td>이종철</td>
        </tr>
        <tr>
          <th>사업자등록번호</th>
          <td>132-86-23186</td>
        </tr>
        <tr>
          <th>통신판매업신고</th>
          <td>제2016-서울송파-0856호</td>
        </tr>
        <tr>
          <th>서비스 공식 URL</th>
          <td><strong>https://heartsync.kr</strong> (상품 확인: https://heartsync.kr/pricing)</td>
        </tr>
        <tr>
          <th>결제 연동 방식</th>
          <td>토스페이먼츠 공식 v2 SDK (@tosspayments/tosspayments-sdk) 직접 연동</td>
        </tr>
        <tr>
          <th>고객센터 연락처</th>
          <td>1599-9573 | vikin@hanmail.net (평일 10:00 ~ 18:00)</td>
        </tr>
      </table>
    </div>

    <div class="slide-footer">
      <span>주식회사 레드뱅크 (Red Bank Co., Ltd.)</span>
      <span>1 / 5</span>
    </div>
  </div>

  <!-- ==================== SLIDE 2: PRICING STEP ==================== -->
  <div class="slide">
    <div class="slide-header">
      <div class="slide-logo">💕 HeartSync</div>
      <div class="slide-meta">STEP 1. 상품 및 플랜 선택 경로</div>
    </div>

    <div class="step-tag">STEP 01</div>
    <h2 class="step-title">결제 상품 선택 및 주문 시작 (Pricing Page)</h2>

    <div class="content-grid">
      <div class="screen-card">
        <img src="${pricingBase64}" alt="플랜 선택 화면">
      </div>

      <div class="desc-card">
        <div class="desc-box">
          <h4>📌 화면 경로 및 URL</h4>
          <p><strong>https://heartsync.kr/pricing</strong></p>
          <p>홈페이지 상단 메뉴 또는 50문항 진단 완료 후 결과 페이지에서 이동합니다.</p>
        </div>

        <div class="desc-box">
          <h4>📦 판매 유료 상품 구성 (단건 최고가: 49,000원)</h4>
          <ul>
            <li><strong>개인 정밀 분석 (1회권)</strong>: 19,900원 (AI 심층 진단 1회, 분석 리포트, PDF 다운로드)</li>
            <li><strong>커플 듀얼 매칭 패키지 (2인)</strong>: 29,000원 (2인 진단, 상호 시선 비교 리포트, 맞춤 대화법)</li>
            <li><strong>30일 관계 개선 올케어 패스</strong>: 49,000원 (30일 무제한 진단 및 AI 1:1 심리 코치)</li>
          </ul>
        </div>

        <div class="check-item">
          <span class="check-icon">✓</span>
          <span><strong>하단 사업자 정보 완비:</strong> 상호명(주식회사 레드뱅크), 대표자, 사업자번호, 통신판매번호, 주소, 고객센터 번호(1599-9573) 100% 명시</span>
        </div>
        <div class="check-item">
          <span class="check-icon">✓</span>
          <span><strong>환불 정책 고지:</strong> AI 리포트 생성 전 7일 이내 100% 전액 환불 정책 명시</span>
        </div>
        <div class="check-item">
          <span class="check-icon">✓</span>
          <span>원하는 플랜의 <strong>[1초 간편결제로 시작하기]</strong> 버튼 클릭 시 다음 결제 단계로 진행</span>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <span>주식회사 레드뱅크 (Red Bank Co., Ltd.)</span>
      <span>2 / 5</span>
    </div>
  </div>

  <!-- ==================== SLIDE 3: TOSS PAYMENT WINDOW ==================== -->
  <div class="slide">
    <div class="slide-header">
      <div class="slide-logo">💕 HeartSync</div>
      <div class="slide-meta">STEP 2. 토스페이먼츠 전자결제창 호출</div>
    </div>

    <div class="step-tag">STEP 02</div>
    <h2 class="step-title">토스페이먼츠 공식 보안 결제창 호출 (Payment Window)</h2>

    <div class="content-grid">
      <div class="screen-card" style="background: #f1f5f9;">
        <div class="toss-mock-window">
          <div class="toss-mock-header">
            <h3>Toss payments</h3>
            <span style="font-size: 11px; opacity: 0.85;">안전결제 모듈</span>
          </div>
          <div class="toss-mock-body">
            <div class="toss-item-row">
              <span style="color: #64748b;">가맹점</span>
              <strong style="color: #0f172a;">주식회사 레드뱅크</strong>
            </div>
            <div class="toss-item-row">
              <span style="color: #64748b;">주문상품</span>
              <strong style="color: #0f172a;">커플 듀얼 매칭 패키지 (2인)</strong>
            </div>
            <div class="toss-item-row" style="border-bottom: 2px solid #0064FF; padding-bottom: 8px;">
              <span style="font-weight: 700; color: #0f172a;">결제금액</span>
              <strong style="font-size: 15px; color: #0064FF;">₩ 29,000</strong>
            </div>

            <div style="font-size: 10.5px; font-weight: 700; color: #475569; margin-top: 2px;">결제 수단 선택</div>
            <div class="toss-method-grid">
              <div class="toss-method-btn">신용/체크카드</div>
              <div class="toss-method-btn gray">토스페이</div>
              <div class="toss-method-btn gray">카카오페이</div>
              <div class="toss-method-btn gray">네이버페이</div>
            </div>

            <div style="font-size: 9.5px; color: #94a3b8; text-align: center; margin-top: 3px;">
              🔒 256-bit SSL 암호화 안전 결제 프로토콜 적용
            </div>
            <div class="toss-pay-btn">29,000원 결제하기</div>
          </div>
        </div>
      </div>

      <div class="desc-card">
        <div class="desc-box">
          <h4>📌 결제 연동 기술 규격</h4>
          <p>토스페이먼츠 최신 <strong>Payment Window API Pattern (@tosspayments/tosspayments-sdk)</strong>을 직접 구현하여 호출합니다.</p>
        </div>

        <div class="desc-box">
          <h4>🔒 보안 및 결제 처리 프로세스</h4>
          <ul>
            <li>프론트엔드에서 주문 생성 API(/prepare_order)를 호출하여 고유 OrderId 발급</li>
            <li>토스페이먼츠 공식 보안 결제창이 브라우저 상에 안전하게 오버레이 팝업</li>
            <li>신용카드(현대, 신한, 국민, 삼성 등) 및 간편결제(토스, 카카오, 네이버) 완벽 지원</li>
            <li>고객의 결제 정보는 PG사 암호화 서버로만 전송되며 사이트에 저장되지 않음</li>
          </ul>
        </div>

        <div class="check-item">
          <span class="check-icon">✓</span>
          <span>고객 결제 승인 완료 시 성공 리다이렉트 URL (https://heartsync.kr/payment-success)로 자동 복귀</span>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <span>주식회사 레드뱅크 (Red Bank Co., Ltd.)</span>
      <span>3 / 5</span>
    </div>
  </div>

  <!-- ==================== SLIDE 4: SUCCESS STEP ==================== -->
  <div class="slide">
    <div class="slide-header">
      <div class="slide-logo">💕 HeartSync</div>
      <div class="slide-meta">STEP 3. 결제 완료 및 서비스 제공</div>
    </div>

    <div class="step-tag">STEP 03</div>
    <h2 class="step-title">결제 승인 완료 및 AI 심층 분석 서비스 즉시 개시</h2>

    <div class="content-grid">
      <div class="screen-card">
        <img src="${successBase64}" alt="결제 완료 화면">
      </div>

      <div class="desc-card">
        <div class="desc-box">
          <h4>📌 결제 완료 확인 화면</h4>
          <p><strong>https://heartsync.kr/payment-success</strong></p>
          <p>토스페이먼츠 결제 승인 완료 후 즉시 주문 상세 정보 및 영수증 확인 화면이 제공됩니다.</p>
        </div>

        <div class="desc-box">
          <h4>⚡ 무형 서비스 즉시 제공 및 혜택 활성화</h4>
          <ul>
            <li><strong>즉시 제공</strong>: 실물 배송이 없는 온라인 디지털 콘텐츠로, 결제 완료 즉시 AI 심층 진단서 생성 및 PDF 다운로드 권한이 자동 활성화됩니다.</li>
            <li><strong>영구 소장 PDF</strong>: 5대 핵심 영역 정밀 분석 결과서 고화질 PDF 즉시 발급</li>
            <li><strong>커플 2인 이용권</strong>: 연인에게 초대 링크 발송 및 상호 매칭 분석 개시</li>
          </ul>
        </div>

        <div class="check-item">
          <span class="check-icon">✓</span>
          <span><strong>주문 내역 영구 보관:</strong> 결제일시, 결제금액(₩29,000), 주문번호(#HS-...), 결제수단 정상 출력</span>
        </div>
        <div class="check-item">
          <span class="check-icon">✓</span>
          <span><strong>청약철회 기준 준수:</strong> 리포트 열람 전 7일 이내 환불 가능하며, 고객센터(1599-9573)를 통해 즉시 처리</span>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <span>주식회사 레드뱅크 (Red Bank Co., Ltd.)</span>
      <span>4 / 5</span>
    </div>
  </div>

  <!-- ==================== SLIDE 5: HIGHEST PRICED ITEM DETAILS ==================== -->
  <div class="slide">
    <div class="slide-header">
      <div class="slide-logo">💕 HeartSync</div>
      <div class="slide-meta">[별첨] 단건 결제 최고가 상품 상세 안내</div>
    </div>

    <div class="step-tag" style="color: #9333ea;">SPECIAL PLAN</div>
    <h2 class="step-title">단건 최고가 상품 안내: 30일 관계 개선 올케어 패스 (₩49,000)</h2>

    <div class="content-grid">
      <div class="screen-card">
        <img src="${allCareBase64}" alt="30일 관계 개선 올케어 패스 상품 상세">
      </div>

      <div class="desc-card">
        <div class="desc-box" style="border-left-color: #9333ea;">
          <h4>👑 단건 결제 최고가 상품 개요</h4>
          <p><strong>상품명</strong>: 30일 관계 개선 올케어 패스 (30-Day Intensive All-Care)</p>
          <p><strong>결제 금액</strong>: <strong style="color: #e11d48; font-size: 13px;">₩49,000</strong> (정상가 ₩79,000 대비 38% 할인)</p>
          <p><strong>서비스 제공 기간</strong>: <strong>결제일로부터 30일간 무제한 제공</strong> (6개월/12개월 초과 불가 규정 완벽 준수)</p>
        </div>

        <div class="desc-box" style="border-left-color: #9333ea;">
          <h4>📦 49,000원 상품 제공 서비스 전체 내역</h4>
          <ul>
            <li>30일간 언제든 50문항 재진단 무제한 (관계 변화 추적 그래프)</li>
            <li>두 사람의 변화 비교 리포트 무제한 업데이트</li>
            <li>주차별 맞춤 커플 미션 & 소통 루틴 가이드 제공</li>
            <li>AI 전문 상담 챗봇 30일 무제한 우선 지원</li>
            <li>진단서 및 단계별 변화 리포트 무제한 PDF 소장</li>
            <li>갈등 위기 상황 즉시대처용 AI 솔루션 치트키 제공</li>
          </ul>
        </div>

        <div class="check-item">
          <span class="check-icon">✓</span>
          <span><strong>온라인 무형 서비스:</strong> 별도 실물 배송이 없으며 결제 완료 즉시 30일간 전체 기능 활성화</span>
        </div>
        <div class="check-item">
          <span class="check-icon">✓</span>
          <span><strong>소비자 보호 환불 정책:</strong> 리포트 생성 및 상담 개시 전 7일 이내 100% 전액 환불 보장 명시</span>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <span>주식회사 레드뱅크 (Red Bank Co., Ltd.)</span>
      <span>5 / 5</span>
    </div>
  </div>

</body>
</html>`;

  const htmlPath = path.join(__dirname, 'toss_presentation.html');
  fs.writeFileSync(htmlPath, htmlContent, 'utf8');
  console.log('HTML presentation written with 5 slides:', htmlPath);

  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage();
  
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const baseName = '토스페이먼츠_결제경로_주식회사레드뱅크';
  let pdfOutputPath = path.join(__dirname, '..', '..', `${baseName}.pdf`);
  const desktopDir = 'C:\\Users\\vikin\\OneDrive\\바탕 화면';
  let desktopPdfPath = path.join(desktopDir, `${baseName}.pdf`);

  // If locked, fallback to alternative name
  try {
    if (fs.existsSync(pdfOutputPath)) {
      fs.unlinkSync(pdfOutputPath);
    }
  } catch (e) {
    console.log('Original PDF locked by another application. Using v2 name.');
    pdfOutputPath = path.join(__dirname, '..', '..', `${baseName}_최종.pdf`);
    desktopPdfPath = path.join(desktopDir, `${baseName}_최종.pdf`);
  }

  await page.pdf({
    path: pdfOutputPath,
    format: 'A4',
    landscape: true,
    printBackground: true,
    margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
  });

  try {
    fs.copyFileSync(pdfOutputPath, desktopPdfPath);
    console.log('Copied directly to Desktop:', desktopPdfPath);
  } catch (err) {
    console.log('Desktop copy notice:', err.message);
  }

  await browser.close();
  console.log('5-Slide PDF generated successfully at:', pdfOutputPath);
}

generatePdf().catch(err => {
  console.error('Error generating PDF:', err);
  process.exit(1);
});
