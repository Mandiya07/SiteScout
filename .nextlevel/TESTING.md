# Testing & Quality Engineering

## Test Suites
1. **Automated QA Suite (`src/lib/qaSuite.test.ts`)**:
   - SSRF Guard Protections (private IPs, loopback, cloud metadata, scheme checks)
   - HTML Escaping & XSS Sanitization (script tags, malicious protocols)
   - Audit Semantics & Scoring Models (presence vs. opportunity scores)
   - Business Truth Invariants (`VERIFIED`, `BUSINESS_SUPPLIED`, `AI_DRAFT`)
   - Firestore Security Matrix (12 Dirty Dozen attack vectors)
2. **Security Rules TDD (`firestore.rules.test.ts`)**:
   - Static analysis of `firestore.rules` against unauthenticated reads, cross-tenant updates, ownership hijacking, and privilege escalation.
3. **Build & Type Checking**:
   - `tsc --noEmit` (0 errors)
   - `vite build && esbuild server.ts` (Clean build)
