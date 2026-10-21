# Architecture Specification

## 1. System Topology
```
[ Browser Client (React 18 + Vite) ]
         │ (HTTP / HTTPS)
         ▼
[ Express Server (server.ts : Port 3000) ]
   ├── [ Auth Layer (verifyAuthToken / optionalAuthToken) ]
   ├── [ SSRF Guard (server/ssrfGuard.ts) ]
   ├── [ Gemini 2.5 Flash / Search Grounding ]
   ├── [ Static Assets & 1:1 HTML Compiler ]
   └── [ Client Portal Preview Engine ]
         │
         ▼
[ Firebase Firestore Database (Multi-Tenant) ]
```

## 2. Request Lifecycle & Fallback Strategy
1. **Search Discovery**: Client calls `/api/search` (guest-enabled via `optionalAuthToken`). Server grounds query with Google Maps or uses local deterministic search fallback.
2. **Audit & Analysis**: Client calls `/api/audit-url` or `/api/analyze`. SSRF guard checks URLs, while scoring models compute presence and opportunity indices.
3. **Site Generation**: AI synthesizes structured website JSON schemas with verified business details, matching industry taxonomies and curated image banks.
4. **Tokenized Previews**: Secured token documents created in Firestore; public visitors review prototypes at `/preview/:token` and submit append-only feedback.
5. **Deployment Lifecycle**: State transitions logged from `DRAFT` to `LIVE` with production static HTML exports.
