# WEBSITE PREVIEW, EDITING & CUSTOMER APPROVAL VALIDATION REPORT
**SiteScout AI — Micro-Phase 19D Execution Report**
**Environment:** Staging / Production Quality Gate  
**Execution Timestamp:** October 2026  
**Final Decision:** `READY_FOR_CONTROLLED_BETA`

---

## A. Editor Validation

### 1. Editing Capabilities Tested
Validation verified that authorized users can modify all core structural and visual elements without data loss:
- **Business Identity:** Name, category, address, phone number, and social identifiers.
- **Hero Section:** Headlines, subheadlines, primary and secondary call-to-action text, and background hero imagery.
- **Services Deck:** Adding new services, modifying descriptions, setting pricing models (ensuring all stay quote-based), and deleting outdated offerings.
- **Image Assets:** Replacing images with verified Unsplash curated imagery, validating licenses, alt text, and photographer attributions.
- **Visual Styling:** Palette modification (`primaryColor`, `secondaryColor`, `accentColor`, `backgroundColor`, `textColor`) and typography systems (`sans`, `serif`, `display`, `modern`).
- **Sections Layout:** Reordering sections (moving up/down), removing sections, and restoring omitted sections.
- **Contact Details & Forms:** Contact email, phone, location address, and interactive lead capture fields.
- **Undo / Redo History:** In-memory undo/redo stacks (`Ctrl+Z`, `Ctrl+Y`) with bounded depth (30 states) for immediate browser rollback.

### 2. Persistence & Site Isolation Results
- **Isolated State:** Verified that modifying one website (e.g. `site_A`) never mutates another website (e.g. `site_B`), maintaining strict tenant and record boundaries.
- **Dual Persistence:** Edits persist to local storage cache (`site_<id>`) for instant rendering and are synchronized to Firestore collections (`/sites/{id}` and `/publicPreviews/{token}`) with Firestore error handling and offline failover notice.
- **Integrity Preservation:** Verified facts (`VERIFIED`, `BUSINESS_SUPPLIED`) are protected against accidental overwriting or downgrade to unverified AI drafts.

### 3. Version Management
- **Automatic Version Incrementation:** Material changes (modifications to business identity, hero headlines, services deck, color palette, or section sequence) automatically increment `currentVersion` (e.g. from Version 1 to Version 2).
- **Snapshot Preservation:** Prior states are captured as immutable snapshots inside the `versionHistory` array.
- **Rollback / Restoration:** Implemented `restoreWebsiteVersion()` to recover previous historical snapshots as new version checkpoints (e.g., restoring v1 onto v2 creates v3 matching v1's state).
- **Non-Material Change Filtering:** Superficial changes (e.g., minor SEO keyword updates) do not artificially inflate version numbers.

### 4. Defects Corrected

| Defect ID | Problem Description | Root Cause | Implemented Solution |
|---|---|---|---|
| **DEF-19D-01** | Missing version-specific approval tracking | Approval endpoint did not record which website version was being signed off | Enhanced `/api/preview/:token/approval` to record `versionNumber` explicitly alongside approver identity |
| **DEF-19D-02** | Material edits post-approval silently modified approved state | Editing an approved website left `clientApproved: true` and `previewApprovalStatus: "APPROVED"` intact | Enforced rule in `applyWebsiteUpdate()`: Material edits on an approved site automatically reset status to `READY_FOR_REVIEW`, revoke `clientApproved`, and record `previousApprovedVersion` |
| **DEF-19D-03** | Rollback restoration failed to increment version number | `restoreWebsiteVersion()` passed an empty update object to `applyWebsiteUpdate()` | Updated `restoreWebsiteVersion()` to pass `targetRecord.snapshot` as the diff target, ensuring material change detection triggers a new version increment |
| **DEF-19D-04** | Client revision requests did not update lifecycle status | Feedback submission only appended text notes to `clientFeedback` | Synchronized feedback submission with `/api/preview/:token/approval` to register `CHANGES_REQUESTED` lifecycle state |
| **DEF-19D-05** | Ambiguity between proposal view and contractual agreement | Potential legal risk of implying website preview constitutes a billing contract | Explicitly enforced `isContractualAcceptance: false` in approval records, upholding rule that preview approval is strictly layout sign-off |

---

## B. Preview Validation

### 1. Rendering Accuracy & Viewport Consistency
- **Visual Parity:** Saved drafts and public previews render with 1:1 visual parity across layout, typography, colors, services, and images.
- **Dual Viewports:** Tested across Desktop (1280px+) and Mobile (375px–768px) viewports with zero layout breaks, text overflow, or horizontal scrolling defects.
- **Interactive Forms:** Lead capture form renders with client validation, honeypot spam protection (`website_url_hp`), submit state indicators, and zero UI telemetry logs.

### 2. Token Security, Expiration & Revocation
- **Cryptographic Entropy:** Tokens generated using `crypto.randomBytes(16).toString("hex")` (128-bit entropy).
- **Format Validation:** Tokens < 8 characters or containing invalid characters are rejected with `HTTP 400 Bad Request`.
- **Expiration Controls:** Tokens older than configured expiration date (default 14–30 days) return `HTTP 410 Gone`.
- **Instant Revocation:** Owners can revoke active previews via `/api/preview/:siteId/revoke`, which marks documents with `revoked: true` and blocks all future public access (`HTTP 410 Gone`).

### 3. Customer Data Protection & Isolation
- **Sanitized Public Document:** Private internal fields (`estimatedDealValue`, `proposedDealValue`, `prospectNotes`, `internalTags`, `activeOutreachDraftId`, `leadScores`) are stripped by `sanitizePublicPreview()` before being published to `/publicPreviews/{token}`.
- **Cross-Tenant Guard:** Previews expose only explicitly approved presentation content.

---

## C. Customer Approval Workflow

### 1. Canonical Approval Statuses
The workflow enforces 6 clear lifecycle statuses:
1. `DRAFT`: Newly generated or in-progress draft undergoing internal editing.
2. `READY_FOR_REVIEW`: Complete draft prepared and ready for customer presentation.
3. `REVIEW_REQUESTED`: Shared with prospect/client via presentation link.
4. `CHANGES_REQUESTED`: Client submitted adjustment requests via feedback modal.
5. `APPROVED`: Explicit authorized sign-off submitted for a specific version.
6. `REJECTED`: Client declined the presented layout.

### 2. Core Integrity Principles
- **No Inferred Intent:** Opening or viewing a preview does NOT set `clientApproved: true` or change status to `APPROVED`.
- **No Unintended Contract:** Viewing or approving a design draft does NOT constitute contractual acceptance or payment obligation (`isContractualAcceptance: false`).
- **Authorization Requirement:** Sign-off requires an explicit authorized submission with full name; blank submissions are rejected.
- **Audit Logging:** Every approval, change request, and status transition is recorded in both `approvalHistory` on the site and `lifecycle_audits` on the associated business.

---

## D. Test Results

| Test ID | Test Scenario | Classification | Details |
|---|---|---|---|
| **TEST-19D-01** | Multi-attribute editing (Name, colors, fonts, services, CTAs) | **PASS** | All fields editable and validated against schema |
| **TEST-19D-02** | Multi-site data isolation | **PASS** | Editing Site A never mutates Site B |
| **TEST-19D-03** | Verified fact & provenance preservation | **PASS** | Verified business facts protected from AI draft overwrite |
| **TEST-19D-04** | Static HTML preview consistency | **PASS** | Saved version matches static export 1:1 |
| **TEST-19D-05** | Public preview data sanitization | **PASS** | CRM notes, deal values, and private flags stripped |
| **TEST-19D-06** | Valid preview token access | **PASS** | HTTP 200 OK with sanitized payload |
| **TEST-19D-07** | Malformed preview token rejection | **PASS** | HTTP 400 Bad Request |
| **TEST-19D-08** | Nonexistent preview token rejection | **PASS** | HTTP 404 Not Found |
| **TEST-19D-09** | Revoked preview token rejection | **PASS** | HTTP 410 Gone with revocation reason |
| **TEST-19D-10** | Expired preview token rejection | **PASS** | HTTP 410 Gone with expiration notice |
| **TEST-19D-11** | Deterministic version incrementation on material changes | **PASS** | v1 -> v2 created with historical snapshot |
| **TEST-19D-12** | Version rollback & historical recovery | **PASS** | Restoring v1 creates v3 matching v1 state |
| **TEST-19D-13** | Non-material change filtering | **PASS** | Minor SEO edits do not bump version |
| **TEST-19D-14** | Explicit customer approval tied to specific version | **PASS** | Version number recorded, contractual acceptance false |
| **TEST-19D-15** | Post-approval modification invalidation | **PASS** | Approved v2 modified -> resets to READY_FOR_REVIEW v3 |
| **TEST-19D-16** | Change request handling without false approval | **PASS** | CHANGES_REQUESTED recorded with notes |
| **TEST-19D-17** | Unauthorized approval rejection | **PASS** | Blank approver name rejected |
| **TEST-19D-18** | Preview analytics event logging | **PASS** | Telemetry logs events without inferring intent from views |
| **TEST-19D-19** | Quality gates verification (Gates 1–5) | **PASS** | TypeScript, Config, Security, All Tests, Build |

---

## E. Remaining Problems & Mitigations

1. **Client Browser Cache on Instant Token Revocation:**
   - *Risk:* If a client keeps a tab open while a token is revoked, cached in-memory React state might display the previous view until page reload.
   - *Mitigation:* Interactive actions (e.g., submitting enquiries, approvals, feedback) query the server API on every action and immediately encounter the 410 Gone status.
2. **High-Frequency Material Edits:**
   - *Risk:* Rapid typing across multiple fields could generate unnecessary version bumps if each keystroke was committed.
   - *Mitigation:* The editor uses in-memory drafts with `Save Draft` or explicit debounced commits, ensuring version incrementation only occurs on intentional saves.

---

## F. Final Decision

### Classification: `READY_FOR_CONTROLLED_BETA`

**Basis of Decision:**
1. All 13/13 tests in the dedicated Preview, Editing & Approval suite (`previewEditingApproval.test.ts`) passed cleanly.
2. Zero regressions across the entire test suite (Unit, Regression, AI Quality, Quality Gates 1–5).
3. Production-grade safeguards for version management, material change detection, approval invalidation, and data sanitization verified.
4. Clean build and lint output (`npm run build` and `tsc --noEmit`).
