# Security Architecture & Policies

## 1. Zero-Trust Access Control
- All private resource endpoints enforce cryptographic authentication and ownership checks (`request.auth.uid == resource.data.userId`).
- Immutable ownership: Updates cannot overwrite `userId` or `ownerId` fields.
- Admin protection: Standard users cannot escalate privileges or self-assign `admin` roles.

## 2. Anti-SSRF Defense
- Outbound requests to target domains are validated via `server/ssrfGuard.ts`.
- Blocks private IPv4 (`127.0.0.1`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), IPv6 loopbacks, cloud metadata (`169.254.169.254`), decimal/hex encodings, and local hostnames.
- Manual redirect checks ensure redirected URLs undergo full SSRF verification.

## 3. XSS & Link Defense
- Static HTML generation uses `escapeHtml()` on all dynamic strings.
- Target URLs pass through `sanitizeUrl()`, stripping `javascript:` and `data:` schemes.
