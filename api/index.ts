import { app } from "../server";

export default function handler(req: any, res: any) {
  if (req.body && typeof req.body === "object") {
    req._body = true;
  }
  return app(req, res);
}
