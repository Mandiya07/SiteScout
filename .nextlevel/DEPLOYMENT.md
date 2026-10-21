# Deployment & Operational Runbook

## Deployment Environment
- **Platform**: Cloud Run (Containerized via reverse proxy on Port 3000)
- **Start Script**: `node dist/server.cjs`
- **Build Script**: `vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs`

## Environment Variables
- `GEMINI_API_KEY`: Server-side Gemini 2.5 Flash access key for live generation and search grounding (optional, graceful fallback provided).
- `NODE_ENV`: `production` in container, development during local iteration.
