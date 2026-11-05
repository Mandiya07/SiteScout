import { app } from "../server";

export default function handler(req: any, res: any) {
  // Ensure req.url matches the search route inside the Express router
  if (!req.url || req.url === "/" || req.url === "/api" || req.url.startsWith("/api/search") || req.url.startsWith("/search")) {
    req.url = "/api/search";
  }
  if (req.body && typeof req.body === "object") {
    req._body = true;
  }
  return app(req, res);
}
