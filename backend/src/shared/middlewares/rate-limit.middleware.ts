import rateLimit from "express-rate-limit";

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20, // 20 attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts, please try again later" },
});

// Each scan is a billed Infomaniak AI call, unlike a login attempt - keyed
// by the authenticated user's company (not IP, see auth.middleware.ts - this
// runs after it), so neither one person spamming it throttles everyone else
// behind the same office IP, nor does adding users multiply the budget.
export const documentScannerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 20, // 20 scans per company per hour
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `company:${req.user.company_id}`,
  message: { message: "Too many document scans, please try again later" },
});

// Public self-registration (POST /user with no token) - each one creates a
// company and an account, with its own document-scanner quota, so creating
// them in a loop has to be slowed down. Per IP; an authenticated
// PLATFORM_ADMIN adding employees (a token is present) isn't counted.
export const registrationRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 5, // 5 registrations per IP per hour
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => Boolean(req.headers.authorization),
  message: { message: "Too many registrations, please try again later" },
});

// Errors a browser reports (POST /error-log/client) - one buggy page could
// otherwise send one per render, or a user could fill the table (and the
// Discord channel) by hand: the demo account's password is public. Per user
// first - a real page sends at most 10 per page load anyway (see
// error-reporter.ts) - then for everyone together, so a handful of accounts
// can't add up either. The same bug only bumps a counter (see
// error_log.fingerprint.ts), so real reports are rarely anywhere near this.
export const clientErrorRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 10, // 10 reports per user per hour
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `user:${req.user.userId}`,
  message: { message: "Too many error reports, please try again later" },
});

export const clientErrorGlobalRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 100, // 100 reports per hour, all users together
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: () => "all",
  message: { message: "Too many error reports, please try again later" },
});

// Project attachments (up to 20 MB each) - on top of the per-company storage
// quota (project_attachment.service.ts), a cap on how fast it can be used up.
export const attachmentUploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 60, // 60 uploads per company per hour
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `company:${req.user.company_id}`,
  message: { message: "Too many uploads, please try again later" },
});
