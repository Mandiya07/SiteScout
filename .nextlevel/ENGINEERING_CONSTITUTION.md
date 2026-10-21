# Engineering Constitution

## 1. Safety & Data Integrity First
- Critical authority is always enforced server-side and at the authoritative database boundary.
- Zero data loss: Never delete production data or alter schemas without verification, backup, and recovery plans.
- Tenant Isolation: Every operation verifies identity -> tenant context -> role/permission -> ownership -> resource access.

## 2. Authentication vs. Authorization
- Authentication ("Who are you?") is strictly separated from Authorization ("What are you allowed to do?").
- Client-supplied identifiers (`userId`, `siteId`, `role`) are never trusted without cryptographic session verification.

## 3. Anti-SSRF & Input Defense
- Outbound fetch operations against user-provided URLs must undergo protocol validation, hostname filtering, DNS resolution checks, and private/loopback/cloud metadata IP blocking.
- User inputs rendered into HTML documents or emails must pass strict escaping and URI sanitization.

## 4. Evidence-Based Verification
- Every status claim must be based on automated test runs, compiler verification, linter execution, or audited security assertions.
