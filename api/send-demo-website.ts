import { app } from "../server";

export default function handler(req: any, res: any) {
  // Ensure req.url matches the send-demo-website route inside the Express router
  if (
    !req.url ||
    req.url === "/" ||
    req.url === "/api" ||
    req.url.startsWith("/api/send-demo-website") ||
    req.url.startsWith("/send-demo-website")
  ) {
    req.url = "/api/send-demo-website";
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
