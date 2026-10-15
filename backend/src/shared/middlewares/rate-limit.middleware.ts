import rateLimit from "express-rate-limit";

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20, // 20 attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts, please try again later" },
});

// Each scan is a billed Infomaniak AI call, unlike a login attempt - keyed
// by the authenticated user (not IP, see auth.middleware.ts - this runs
// after it) so one person spamming it doesn't also throttle everyone else
// behind the same office/company IP.
export const documentScannerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 10, // 10 scans per user per hour
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.user.userId),
  message: { message: "Too many document scans, please try again later" },
});
