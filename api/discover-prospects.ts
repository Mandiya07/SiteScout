import { app } from "../server";

export default function handler(req: any, res: any) {
  // Ensure req.url matches the discover-prospects route inside the Express router
  if (!req.url || req.url === "/" || req.url === "/api" || req.url.startsWith("/api/discover-prospects") || req.url.startsWith("/discover-prospects")) {
    req.url = "/api/discover-prospects";
  }
  if (req.body && typeof req.body === "object") {
    req._body = true;
  }
  return app(req, res);
}
