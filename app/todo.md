# 토스페이먼츠 결제 시스템 변경 - 개발 계획

## 변경 파일 목록

### 백엔드 (3개 파일)
1. **backend/services/payment.py** - 토스페이먼츠 REST API 연동 서비스 (전면 재작성)
   - httpx를 사용한 토스페이먼츠 API 호출
   - 결제 승인 API (`POST /v1/payments/confirm`)
   - 결제 조회 API (`GET /v1/payments/{paymentKey}`)
   - 테스트 시크릿 키: `test_sk_...` (환경변수 TOSS_SECRET_KEY)

2. **backend/routers/payments.py** - 결제 라우터 수정
   - `POST /create_payment_session` → 주문 생성 + orderId 반환 (토스 SDK가 프론트에서 결제 호출)
   - `POST /verify_payment` → paymentKey, orderId, amount로 토스 결제 승인 확인
   - Stripe 관련 코드 전면 제거

3. **backend/requirements.txt** - stripe 제거 (httpx는 이미 있음)

### 프론트엔드 (2개 파일)
4. **frontend/src/pages/PricingPage.tsx** - 토스페이먼츠 SDK 연동
   - @tosspayments/tosspayments-sdk 사용
   - 테스트 클라이언트 키: `test_ck_...` (환경변수 또는 하드코딩)
   - 결제 요청 → 성공/실패 URL 리다이렉트

5. **frontend/src/pages/PaymentSuccessPage.tsx** - 결제 승인 확인 로직 변경
   - URL 파라미터: paymentKey, orderId, amount
   - 서버에 승인 요청 → 결과 표시

### DB 마이그레이션 (1개)
6. **orders 테이블** - stripe_session_id, stripe_payment_intent → toss_payment_key, toss_order_id 필드 추가

## 토스페이먼츠 결제 플로우
1. 사용자가 요금제 선택 → 백엔드에 주문 생성 요청
2. 백엔드가 주문 생성 후 orderId 반환
3. 프론트엔드에서 토스페이먼츠 SDK로 결제 요청 (orderId, amount, orderName 전달)
4. 결제 완료 → successUrl로 리다이렉트 (paymentKey, orderId, amount 파라미터 포함)
5. 프론트엔드가 백엔드에 결제 승인 요청 (paymentKey, orderId, amount)
6. 백엔드가 토스페이먼츠 API로 결제 승인 확인 → 주문 상태 업데이트 → 플랜 활성화

## 테스트 키 (토스페이먼츠 공식 테스트 키)
- Client Key: `test_ck_D5GePWvyJnrK0W0k6q8gmeYBlNkw` (프론트엔드)
- Secret Key: `test_sk_zXLkKEypNArWmo50nX3lmeaxYG5R` (백엔드, 환경변수)