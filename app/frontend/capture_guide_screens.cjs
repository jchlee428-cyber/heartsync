const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const FAST_ONLY_WIDGET = process.argv.includes('--fast');
const CARDS_ONLY = process.argv.includes('--cards-only');

async function openLiveTossModal(page) {
  await page.goto('http://localhost:3000/pricing', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll('h3'));
    const allCareHeading = headings.find((h) => h.textContent && h.textContent.includes('30일 관계 개선 올케어 패스'));
    if (allCareHeading) {
      const card = allCareHeading.closest('div.relative');
      if (card) {
        const payBtn = Array.from(card.querySelectorAll('button')).find(
          (b) => b.textContent && b.textContent.includes('간편결제로 시작하기')
        );
        if (payBtn) payBtn.click();
      }
    }
  });
  await page.waitForSelector('#toss-widget-submit-btn:not([disabled])', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(3000);
}

async function capture() {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 860 },
    deviceScaleFactor: 2,
    locale: 'ko-KR',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  const outDir = path.join(__dirname, 'guide_captures');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // Always ensure test user is logged in cleanly
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  if (!FAST_ONLY_WIDGET && !CARDS_ONLY) {
    console.log('1. Capturing Main Page & Footer...');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outDir, '01_main_page_raw.png') });

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(outDir, '02_footer_raw.png') });

    console.log('2. Capturing Refund Policy Modal & Terms/Privacy Pages...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const refundBtn = buttons.find((b) => b.textContent && b.textContent.includes('취소 및 환불규정'));
      if (refundBtn) refundBtn.click();
    });
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(outDir, '03_refund_modal_raw.png') });

    await page.goto('http://localhost:3000/terms', { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(outDir, '03_terms_page_raw.png') });

    await page.goto('http://localhost:3000/privacy', { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(outDir, '03_privacy_page_raw.png') });

    console.log('3. Capturing Login Page...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(outDir, '04_login_page_raw.png') });
  }

  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('token', 'hs_session_toss_review_2026');
    localStorage.setItem('isLougOutManual', 'false');
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: 'usr_email_test',
        name: '테스트회원',
        email: 'test@heartsync.kr',
        role: 'user',
      })
    );
  });

  if (!FAST_ONLY_WIDGET && !CARDS_ONLY) {
    console.log('4. Capturing MyPage Withdrawal...');
    await page.goto('http://localhost:3000/my', { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(outDir, '04_mypage_withdraw_raw.png') });

    console.log('5. Capturing Pricing Page (Live Mode)...');
    await page.goto('http://localhost:3000/pricing', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.evaluate(() => window.scrollTo(0, 420));
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(outDir, '05_pricing_plans_raw.png') });

    await page.evaluate(() => window.scrollTo(0, 1480));
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(outDir, '06_all_care_plan_raw.png') });
  }

  if (!CARDS_ONLY) {
    // 6. Open Live Toss Widget & expand [더보기] -> check [휴대폰] (NO payment attempt!)
    console.log('6. Opening Live Toss Widget & expanding [더보기]...');
    await openLiveTossModal(page);
    await page.screenshot({ path: path.join(outDir, '07_toss_live_widget_raw.png') });

    for (const frame of page.frames()) {
      if (frame.url().includes('payment-widget.tosspayments.com') && frame.url().includes('payment-methods')) {
        try {
          const expanded = await frame.evaluate(() => {
            const els = Array.from(document.querySelectorAll('button, a, div[role="button"], span'));
            const moreBtn = els.find((el) => (el.textContent || '').trim().startsWith('더보기'));
            if (moreBtn) {
              moreBtn.click();
              return true;
            }
            return false;
          });
          console.log('Expanded [더보기]:', expanded);
        } catch {}
      }
    }
    await page.waitForTimeout(1200);

    for (const frame of page.frames()) {
      if (frame.url().includes('payment-widget.tosspayments.com') && frame.url().includes('payment-methods')) {
        const fullTxt = await frame.evaluate(() => (document.body ? document.body.innerText : '')).catch(() => '');
        console.log('Expanded Widget Methods:', fullTxt.replace(/\s+/g, ' '));
        try {
          const clickedMob = await frame.evaluate(() => {
            const els = Array.from(document.querySelectorAll('button, li, a, div[role="button"], div[role="radio"], span'));
            const mob = els.find((el) => {
              const t = (el.textContent || '').trim();
              return t === '휴대폰' || t === '휴대폰 결제';
            });
            if (mob) {
              mob.click();
              return true;
            }
            return false;
          });
          console.log('Selected [휴대폰] inside expanded widget (NO submit):', clickedMob);
        } catch {}
      }
    }
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outDir, '07_toss_mobile_tab_raw.png') });
  }

  // 7. NH농협카드 -> [다른 결제] -> [일반결제] to verify 가맹점명: 주식회사 레드뱅크
  console.log('7. Opening NH농협카드 -> [다른 결제] -> [일반결제] to verify 가맹점명...');
  await openLiveTossModal(page);
  for (const frame of page.frames()) {
    if (frame.url().includes('payment-widget.tosspayments.com') && frame.url().includes('payment-methods')) {
      await frame.evaluate(() => {
        const els = Array.from(document.querySelectorAll('button, li, a, span, div[role="button"]'));
        const cardTab = els.find((el) => (el.textContent || '').trim().includes('신용·체크카드'));
        if (cardTab) cardTab.click();
      }).catch(() => {});
    }
  }
  await page.waitForTimeout(1000);
  for (const frame of page.frames()) {
    if (frame.url().includes('payment-widget.tosspayments.com') && frame.url().includes('payment-methods')) {
      await frame.evaluate(() => {
        const els = Array.from(document.querySelectorAll('button, li, a, span, div[role="button"]'));
        const nh = els.find((el) => (el.textContent || '').trim() === '농협');
        if (nh) nh.click();
      }).catch(() => {});
    }
  }
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, '07_toss_nh_selected_raw.png') });
  await page.click('#toss-widget-submit-btn').catch(() => {});
  await page.waitForTimeout(4500);

  // Inside NHCard iframe (vbv.nonghyup.com), click [다른 결제] via DOM then trusted click [일반결제]
  let nhPopup = null;
  for (const frame of page.frames()) {
    if (frame.url().includes('nonghyup.com')) {
      console.log('Found NH frame:', frame.url());
      await frame.evaluate(() => {
        const els = Array.from(document.querySelectorAll('a, button, li, span, div'));
        const otherTab = els.find((el) => (el.textContent || '').replace(/\s+/g, '') === '다른결제' && el.children.length === 0);
        if (otherTab) (otherTab.closest('a, button, li') || otherTab).click();
      }).catch(() => {});
      await page.waitForTimeout(1200);

      const nhPopupPromise = context.waitForEvent('page', { timeout: 5000 }).catch(() => null);
      await frame.locator('text=일반결제').first().click({ force: true }).catch(() => {});
      nhPopup = await nhPopupPromise;
      await page.waitForTimeout(2500);

      // Dismiss inner security-install notice [취소] if visible so 가맹점명: 주식회사 레드뱅크 is 100% unobstructed
      await frame.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, a, span'));
        const cancelNotice = btns.find((b) => {
          const txt = (b.textContent || '').trim();
          if (txt !== '취소') return false;
          const dialog = b.closest('div');
          return dialog && (dialog.textContent || '').includes('보안프로그램');
        });
        if (cancelNotice) cancelNotice.click();
      }).catch(() => {});
      await page.waitForTimeout(700);
    }
  }
  for (const frame of page.frames()) {
    if (frame.url().includes('nonghyup.com') || frame.url().includes('nhcard')) {
      const generalText = await frame.evaluate(() => (document.body ? document.body.innerText : '')).catch(() => '');
      console.log('NH Frame After Trusted [일반결제]:', frame.url().slice(0, 80), '=>', generalText.replace(/\s+/g, ' ').slice(0, 500));
    }
  }
  if (nhPopup) {
    await nhPopup.waitForLoadState('domcontentloaded').catch(() => {});
    await nhPopup.waitForTimeout(2500);
    const nhPopText = await nhPopup.evaluate(() => (document.body ? document.body.innerText : '')).catch(() => '');
    console.log('NH Popup After Trusted [일반결제]:', nhPopup.url(), '=>', nhPopText.replace(/\s+/g, ' ').slice(0, 500));
    await nhPopup.screenshot({ path: path.join(outDir, '07_toss_nh_popup_raw.png') });
    await nhPopup.close().catch(() => {});
  }
  await page.screenshot({ path: path.join(outDir, '07_toss_nh_merchant_raw.png') });

  // 8. BC카드 (비씨) -> capture Paybooc popup (vp.vpay.co.kr) -> main, QR, ISP
  console.log('8. Opening BC카드 (비씨) -> ISP/페이북...');
  await openLiveTossModal(page);
  for (const frame of page.frames()) {
    if (frame.url().includes('payment-widget.tosspayments.com') && frame.url().includes('payment-methods')) {
      await frame.evaluate(() => {
        const els = Array.from(document.querySelectorAll('button, li, a, span, div[role="button"]'));
        const cardTab = els.find((el) => (el.textContent || '').trim().includes('신용·체크카드'));
        if (cardTab) cardTab.click();
      }).catch(() => {});
    }
  }
  await page.waitForTimeout(1000);
  for (const frame of page.frames()) {
    if (frame.url().includes('payment-widget.tosspayments.com') && frame.url().includes('payment-methods')) {
      await frame.evaluate(() => {
        const els = Array.from(document.querySelectorAll('button, li, a, span, div[role="button"]'));
        const bc = els.find((el) => (el.textContent || '').trim() === '비씨');
        if (bc) bc.click();
      }).catch(() => {});
    }
  }
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, '07_toss_bc_selected_raw.png') });

  const bcPopupPromise = context.waitForEvent('page', { timeout: 7000 }).catch(() => null);
  await page.click('#toss-widget-submit-btn').catch(() => {});
  const bcPopup = await bcPopupPromise;
  await page.waitForTimeout(3000);

  if (bcPopup) {
    await bcPopup.waitForLoadState('domcontentloaded').catch(() => {});
    await bcPopup.waitForTimeout(3000);
    await bcPopup.setViewportSize({ width: 640, height: 560 }).catch(() => {});
    const bcTxt = await bcPopup.evaluate(() => (document.body ? document.body.innerText : '')).catch(() => '');
    console.log('BC Popup Ready:', bcPopup.url(), '=>', bcTxt.replace(/\s+/g, ' ').slice(0, 400));
    await bcPopup.screenshot({ path: path.join(outDir, '07_bc_paybooc_main_raw.png') });

    // Click [결제하기] directly on main screen -> capture live QR screen (07_bc_paybooc_isp_raw.png is already saved)
    await bcPopup.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('a, button, span, div'));
      const payBtn = btns.find((b) => (b.textContent || '').trim() === '결제하기');
      if (payBtn) payBtn.click();
    }).catch(() => {});
    await bcPopup.waitForTimeout(2500);
    const qrTxt = await bcPopup.evaluate(() => (document.body ? document.body.innerText : '')).catch(() => '');
    console.log('BC Popup QR Screen:', qrTxt.replace(/\s+/g, ' ').slice(0, 400));
    await bcPopup.screenshot({ path: path.join(outDir, '07_bc_paybooc_qr_raw.png') });
    await bcPopup.close().catch(() => {});
  } else {
    console.log('No separate BC popup window opened; checking in-page frames...');
    await page.screenshot({ path: path.join(outDir, '07_bc_paybooc_main_raw.png') });
  }

  if (!FAST_ONLY_WIDGET && !CARDS_ONLY) {
    console.log('9. Capturing Payment Success screen...');
    await page.goto(
      'http://localhost:3000/payment-success?paymentKey=live_sample_preview_only&orderId=HS-couple_premium-20261118&amount=49000&plan_type=couple_premium',
      { waitUntil: 'networkidle' }
    );
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(outDir, '08_payment_success_raw.png') });
  }

  await browser.close();
  console.log('Capture completed successfully!');
}

capture().catch((err) => {
  console.error('Capture script failed:', err);
  process.exit(1);
});
