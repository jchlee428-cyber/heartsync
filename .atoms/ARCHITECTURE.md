# Architecture Design

## System Overview
Full-stack web application with React frontend and Atoms Cloud backend (FastAPI + PostgreSQL). Frontend communicates via @metagptx/web-sdk for auth, entities, AI, and custom API calls.

## Tech Stack
- Frontend: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, React Router
- Backend: Atoms Cloud (FastAPI, SQLAlchemy, PostgreSQL)
- AI: deepseek-v3.2 via Atoms Cloud AI hub (streaming)
- Payment: Toss Payments SDK
- PDF: html2canvas + jsPDF

## Module Design
| Module | Responsibility | Key Files |
|--------|---------------|-----------|
| Diagnosis Survey | 50-question assessment with swipe, tooltips, part intros | DiagnosisPage.tsx |
| Draft Sync | localStorage + server dual save with offline/retry | DiagnosisPage.tsx (saveDraft, syncToServerWithRetry) |
| AI Report | Streaming psychological analysis generation | ResultPage.tsx (generateReport) |
| Payment | Toss Payments order creation and verification | PricingPage.tsx, PaymentSuccessPage.tsx, backend/routers/payments.py |
| Chatbot | AI coaching based on diagnosis results | ChatbotPage.tsx |
| Admin | User management, audit logs, settings | admin/*.tsx, backend/routers/admin_*.py |
| Auth | OIDC via Atoms Cloud with prompt=login | backend/core/auth.py |
| Notifications | Report completion alerts, weekly checkpoints | MyPage.tsx, backend/routers/notification_actions.py |

## Tech Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| State Management | React useState + useRef | Simple enough for single-page flows |
| Draft Persistence | localStorage + server entity | Offline resilience + cross-device sync |
| AI Streaming | client.ai.gentxt with onChunk | Real-time report generation UX |
| Error Handling | Non-blocking draft deletion | 503 errors shouldn't block core user flow |

## File Tree Plan
```
app/
├── backend/
│   ├── core/auth.py          # OIDC auth with prompt=login
│   ├── routers/              # API endpoints
│   └── main.py               # FastAPI entry
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── DiagnosisPage.tsx   # Survey + draft sync
│   │   │   ├── ResultPage.tsx      # AI report + paywall
│   │   │   ├── ChatbotPage.tsx     # AI coaching
│   │   │   ├── PricingPage.tsx     # Plans
│   │   │   ├── MyPage.tsx          # Profile + history
│   │   │   └── admin/             # Admin pages
│   │   ├── components/            # Shared UI
│   │   └── lib/                   # Utils, API clients
│   └── public/                    # Static assets
```

## Implementation Guide
- Entity CRUD via `client.entities.<table>.*` methods
- AI generation via `client.ai.gentxt` with streaming
- Auth via `client.auth.me()` and `client.auth.toLogin()`
- Custom API calls via `client.apiCall.invoke()`
- Draft deletion errors are caught and ignored to prevent blocking user flow