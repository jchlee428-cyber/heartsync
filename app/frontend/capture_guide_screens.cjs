const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function capture() {
  const browser = await chromium.launch({ channel: 'chrome' });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  const outDir = path.join(__dirname, 'guide_captures');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log('1. Capturing Footer (Business Info)...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '02_footer_raw.png') });

  console.log('2. Capturing Refund Policy Modal...');
  // Click the refund policy button in the footer
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const refundBtn = buttons.find(b => b.textContent && b.textContent.includes('취소 및 환불규정'));
    if (refundBtn) refundBtn.click();
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '03_refund_modal_raw.png') });

  console.log('3. Capturing Login Page...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '04_login_page_raw.png') });

  console.log('4. Capturing Pricing Page (Products & Plans)...');
  await page.goto('http://localhost:3000/pricing', { waitUntil: 'networkidle' });
  await page.evaluate(() => window.scrollTo(0, 520));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '05_pricing_plans_raw.png') });

  console.log('5. Capturing 30-Day All-Care (Highest Priced Plan ₩49,000)...');
  await page.evaluate(() => window.scrollTo(0, 1600));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '06_all_care_plan_raw.png') });

  console.log('6. Capturing Payment Success Page...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.setItem('token', 'mock_toss_approval_token_guide_2026');
    localStorage.setItem('user', JSON.stringify({
      id: 'hs-user-test-01',
      name: '홍길동',
      email: 'test@heartsync.kr'
    }));
  });
  await page.goto('http://localhost:3000/payment-success?paymentKey=toss_pk_test_sample_20261019&orderId=HS-20261019-89241&amount=29000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '08_payment_success_raw.png') });

  await browser.close();
  console.log('All guide screenshots captured in:', outDir);
}

capture().catch(console.error);
