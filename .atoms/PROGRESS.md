# Requirements & Progress

## Requirements Overview
HeartSync relationship diagnostics platform with AI-powered analysis, payment integration, admin tools, and offline-capable draft saving.

## User Stories
- As a user, I can complete a 50-question relationship diagnostic survey
- As a user, my progress is auto-saved locally and to the cloud
- As a paid user, I receive a detailed AI psychological analysis report
- As a user, I can chat with an AI coach about my results
- As an admin, I can manage users and view audit logs

## Task Breakdown
- [x] Fix 503 error on "AI 분석 받기" button - make draft deletion non-blocking
- [x] Add prompt=login to OIDC authorization URL to skip consent screen
- [x] Implement admin activity logging in Atoms Cloud database
- [x] Add confetti interstitial screen after diagnosis submission (2s before navigating to results)
- [x] Apply Zen theme - CSS variables (light/dark), Tailwind config, font imports
- [x] Apply Zen theme - Header, BottomNav components
- [x] Apply Zen theme - HeroSection, RelationshipSection, SolutionSection
- [x] Apply Zen theme - Index, PricingPage, DiagnosisPage
- [x] Apply Zen theme - ChatbotPage, MyPage

## Progress Log
- 2026-03-12: Initial project setup with React + Atoms Cloud backend
- 2026-03-13: Core diagnosis flow, draft saving, offline sync, AI reports, chatbot, PDF download, social sharing
- 2026-03-13: Scoring system, sync analytics, exponential backoff retry
- 2026-03-16: Payment integration (Stripe then Toss Payments), paywall for reports
- 2026-03-18: Company info page, accessibility improvements, notifications, header component
- 2026-04-08: Admin interface (dashboard, users, settings, activity logs), login method updates
- 2026-04-13: Fixed OIDC authorization URL, diagnosed AI analysis error
- 2026-06-15: Fixed 503 error - draft deletion made non-blocking so diagnosis submission succeeds even if draft cleanup fails
- 2026-07-06: Fixed Toss Payments SDK v2 API call - changed from Widget API pattern to Payment Window API pattern
- 2026-07-06: Applied Zen theme across all frontend components - CSS variables, Tailwind config, fonts, and semantic color classes
- 2026-07-06: Reverted Zen theme back to original Pink/Rose theme - restored CSS variables, Tailwind config, and all component styles
- 2026-07-06: Added dedicated Payment History page (/payment-history) with active plan display, summary stats, and detailed order list
- 2026-07-06: Added diagnosis record deletion feature with confirmation modal on MyPage
- 2026-07-08: Added Terms of Service page (/terms) with cancellation/refund policy and Privacy Policy page (/privacy)
- 2026-07-08: Added footer links on homepage for Terms, Privacy, and About pages
- 2026-07-09: Integrated Stripe payment system alongside existing Toss Payments - backend service, router, and frontend payment provider selector