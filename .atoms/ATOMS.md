# Project Context

## Project Overview
HeartSync is an AI-driven relationship diagnostics platform that helps couples analyze and improve their relationships through psychological assessments based on Gottman theory, Attachment theory, EFT, and CBT. It features a 50-question diagnostic survey, AI-generated reports, chatbot coaching, payment integration (Toss Payments), and admin management tools.

## Key Decisions
| Date | Decision | By | Rationale |
|------|----------|-----|-----------|
| 2026-03-12 | Use Atoms Cloud as backend with entity-based data model | Team | Simplifies auth, database, and AI integration |
| 2026-03-13 | Implement localStorage + server draft sync with exponential backoff | Alex | Ensures data safety offline and across devices |
| 2026-03-13 | Use deepseek-v3.2 for AI report generation | Team | Cost-effective for Korean text generation |
| 2026-03-16 | Toss Payments integration for Korean market | Team | Best payment gateway for Korean users |
| 2026-04-08 | Add admin interface with audit logging | Alex | Track admin activities for security |
| 2026-04-13 | Add prompt=login to OIDC to skip consent screen | Alex | Korean UX - avoid English consent page |
| 2026-06-15 | Make draft deletion non-blocking in submit flow | Alex | 503 errors on draft delete should not block diagnosis submission |

## Constraints
- Active theme: Pink/Rose (Original)
- Color Palette: Pink/Rose gradients - primary hsl(346.8 77.2% 49.8%), accent hsl(346.8 77.2% 49.8%), background white with pink-50 gradients
- Typography: System default sans-serif
- Border radius: 0.5rem (standard shadcn/ui)
- Mobile-first responsive design (max-w-lg container)
- Korean language UI throughout
- Paywall model: Free users see brief analysis, paid users get full AI report
- Draft saving: dual localStorage + server with offline support