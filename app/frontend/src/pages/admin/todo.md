# 관리자 모드 개발 계획

## 파일 구조
1. `AdminDashboardPage.tsx` - 관리자 대시보드 (통계, 최근 주문, 최근 진단)
2. `AdminSettingsPage.tsx` - 설정 관리 (환경변수 CRUD)
3. `AdminLayout.tsx` - 관리자 공통 레이아웃 (사이드바, 헤더)

## 기능
### 대시보드
- 전체 진단 수, 전체 주문 수, 전체 채팅 세션 수 통계
- 최근 주문 목록 (전체 사용자)
- 최근 진단 목록 (전체 사용자)

### 설정 관리
- 백엔드/프론트엔드 환경변수 조회
- 환경변수 수정/추가/삭제

## API 사용
- GET /api/v1/entities/orders/all - 전체 주문 조회
- GET /api/v1/entities/diagnoses/all - 전체 진단 조회
- GET /api/v1/entities/chat_sessions/all - 전체 채팅 세션 조회
- GET /api/v1/admin/settings/ - 설정 조회
- PUT/POST/DELETE /api/v1/admin/settings/{type}/{key} - 설정 CRUD

## 라우트
- /admin - 대시보드
- /admin/settings - 설정 관리