import { app } from "../server";

export default function handler(req: any, res: any) {
  // Restore original /api/* path when Vercel rewrites /api/(.*) -> /api/index?__path=$1
  try {
    const parsed = new URL(req.url || "/", "http://localhost");
    const rewrittenPath = parsed.searchParams.get("__path");
    if (rewrittenPath !== null) {
      parsed.searchParams.delete("__path");
      const remainingSearch = parsed.searchParams.toString();
      const normalizedPath = rewrittenPath.replace(/^\/+/, "");
      req.url = `/api/${normalizedPath}${remainingSearch ? `?${remainingSearch}` : ""}`;
    } else if (
      !req.url ||
      req.url === "/" ||
      req.url === "/api" ||
      req.url === "/api/index" ||
      req.url.startsWith("/api/index?")
    ) {
      const originalHeader =
        req.headers?.["x-vercel-original-url"] ||
        req.headers?.["x-forwarded-uri"] ||
        req.headers?.["x-invoke-path"];
      if (
        typeof originalHeader === "string" &&
        originalHeader.startsWith("/api/") &&
        !originalHeader.startsWith("/api/index")
      ) {
        req.url = originalHeader;
      }
    }
  } catch {
    // Keep existing req.url if URL parsing fails
  }

  if (typeof req.body === "string") {
    const trimmed = req.body.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        req.body = JSON.parse(trimmed);
      } catch {
        // Leave body as-is if not valid JSON
      }
    }
  }

  if (req.body && typeof req.body === "object") {
    req._body = true;
  }

  return app(req, res);
}
