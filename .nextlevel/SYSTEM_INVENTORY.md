# System Inventory

## 1. Codebase Structure
- `/src/App.tsx`: Main application shell with tab routing, state management, and modal orchestration.
- `/src/components/`:
  - `BusinessFinder.tsx`: Prospect discovery search, filter, card view, and quick actions.
  - `OpportunityAnalysis.tsx`: Audit inspection, score breakdown, and live URL testing.
  - `WebsiteGenerator.tsx`: Customizer studio, styling controls, content editor, and section reordering.
  - `WebsiteView.tsx`: Live responsive preview canvas for generated websites.
  - `ShareablePreview.tsx`: Client portal view for tokenized links.
  - `ProspectPipeline.tsx` & `CRMSync.tsx`: Prospect CRM management and deal tracking.
  - `SalesAssistant.tsx` & `DraftEmailModal.tsx`: Grounded sales copywriting and email delivery.
- `/src/services/`: Modular client API bridges (`siteService.ts`, `prospectService.ts`, `salesService.ts`).
- `/src/lib/`: Security utilities, HTML generator (`htmlGenerator.ts`), formatters (`formatters.ts`), taxonomy (`heroImages.ts`), and truth profile engine (`businessTruth.ts`).
- `/server.ts`: Express backend serving API endpoints, auth middleware, and static assets.
- `/server/services/`: Backend modular services (`auditService.ts`, `geminiService.ts`, `prospectService.ts`, `salesContentService.ts`).
- `/server/ssrfGuard.ts`: SSRF defense module with DNS lookup and private IP blocking.
- `/firestore.rules`: Security rules enforcing multi-tenant isolation and ownership immutability.
