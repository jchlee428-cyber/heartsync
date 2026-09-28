# HeartSync AI 관계 진단 - 개발 계획

## 개발 태스크

### 1. 데이터베이스 테이블 생성
- `diagnoses` 테이블: id, user_id, answers (JSON string), scores (JSON string), total_score (integer), ai_report (text), created_at (datetime)

### 2. 사용자 인증 연동
- Header.tsx에 로그인/로그아웃 기능 추가 (프로필 아이콘 클릭 시)
- App.tsx에 AuthCallback 라우트 이미 설정됨

### 3. 새 페이지 생성 (총 4개 페이지)
- `src/pages/DiagnosisPage.tsx` - 10개 질문 설문 페이지 (5개 카테고리 x 2문항, 1~5점 리커트)
- `src/pages/ResultPage.tsx` - AI 분석 결과 페이지 (deepseek-v3.2 스트리밍)
- `src/pages/ChatbotPage.tsx` - AI 챗봇 코치 (deepseek-v3.2 스트리밍 채팅)
- `src/pages/MyPage.tsx` - 과거 진단 기록 목록 + 상세 보기

### 4. 기존 컴포넌트 수정
- `BottomNav.tsx` - react-router Link로 변경, 실제 라우팅 연결
- `Header.tsx` - 로그인/프로필 기능 추가
- `App.tsx` - 새 라우트 추가
- `HeroSection.tsx` - CTA 버튼에 진단 페이지 링크 연결
- `SolutionSection.tsx` - CTA 버튼에 진단 페이지 링크 연결

### 파일 목록 (8개 이내)
1. `src/pages/DiagnosisPage.tsx` - 진단 설문
2. `src/pages/ResultPage.tsx` - AI 분석 결과
3. `src/pages/ChatbotPage.tsx` - AI 챗봇
4. `src/pages/MyPage.tsx` - 마이페이지
5. `src/components/Header.tsx` - 수정 (인증)
6. `src/components/BottomNav.tsx` - 수정 (라우팅)
7. `src/App.tsx` - 수정 (라우트 추가)
8. `src/pages/Index.tsx` - 수정 (CTA 링크)