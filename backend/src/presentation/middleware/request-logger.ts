import type { Request, Response, NextFunction } from "express";

/** Request logging middleware. Logs method, path, status, duration. */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  res.on("finish", () => {
    console.log(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms ${req.user?.sub ?? "-"}`);
  });
  next();
}
