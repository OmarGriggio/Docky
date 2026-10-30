import { getErrorGroupsFromDB, recordErrorInDB, setErrorGroupResolvedInDB } from "./error_log.repository";
import {
  buildFingerprint, MAX_LOCATION_LENGTH, MAX_MESSAGE_LENGTH, MAX_NAME_LENGTH, MAX_STACK_LENGTH, truncate,
} from "./error_log.fingerprint";
import { ErrorGroupStatus, ErrorSource } from "./error_log.types";
import { buildErrorNotification } from "./error_log.notification";
import { AppError, NotFoundError } from "../../shared/types/errors";
import { notifyDiscord } from "../../shared/notifications/discord";

const LIST_LIMIT = 200;
const STATUSES: ErrorGroupStatus[] = ["open", "resolved", "all"];

interface ErrorContext {
  location: string | null;
  company_id: number | null;
  user_id: number | null;
}

const record = async (
  source: ErrorSource, name: string, message: string, stack: string | null, context: ErrorContext
): Promise<void> => {
  const safeName = truncate(name || "Error", MAX_NAME_LENGTH);
  const safeMessage = truncate(message || "(no message)", MAX_MESSAGE_LENGTH);
  const safeStack = stack ? truncate(stack, MAX_STACK_LENGTH) : null;
  const location = context.location ? truncate(context.location, MAX_LOCATION_LENGTH) : null;
  const kind = await recordErrorInDB({
    fingerprint: buildFingerprint(source, safeName, safeMessage, safeStack),
    source,
    name: safeName,
    message: safeMessage,
    stack: safeStack,
    location,
    company_id: context.company_id,
    user_id: context.user_id,
  });
  // Only a new error or one back after being resolved - see
  // error_log.notification.ts for what the message holds (and doesn't).
  const notification = buildErrorNotification({ kind, source, name: safeName, location }, process.env.APP_URL);
  if (notification) {
    notifyDiscord(notification);
  }
};

// Called by app.ts's error middleware for anything that ends up a 500.
// Best-effort and never throws: recording must not turn one error into two
// (the database being down is the very error it would be trying to record).
export const recordServerErrorServ = async (err: unknown, context: ErrorContext): Promise<void> => {
  try {
    const error = err instanceof Error ? err : new Error(String(err));
    await record("BACKEND", error.name, error.message, error.stack ?? null, context);
  } catch (recordErr) {
    console.error("error_log : " + recordErr);
  }
};

// What a browser reports (POST /error-log/client) - user input, so checked
// and truncated like any other body.
export const recordClientErrorServ = async (body: unknown, context: ErrorContext): Promise<void> => {
  const report = (body ?? {}) as Record<string, unknown>;
  const optionalString = (value: unknown) => (typeof value === "string" && value ? value : null);
  if (typeof report.name !== "string" || typeof report.message !== "string") {
    throw new AppError("An error report needs a name and a message", 400);
  }
  await record("FRONTEND", report.name, report.message, optionalString(report.stack), {
    ...context,
    location: optionalString(report.location),
  });
};

export const getErrorGroupsServ = async (status: string | undefined) => {
  const safeStatus = (status ?? "open") as ErrorGroupStatus;
  if (!STATUSES.includes(safeStatus)) {
    throw new AppError("status must be open, resolved or all", 400);
  }
  return await getErrorGroupsFromDB(safeStatus, LIST_LIMIT);
};

export const setErrorGroupResolvedServ = async (id: number, resolved: boolean): Promise<void> => {
  if (!Number.isInteger(id) || id <= 0 || !(await setErrorGroupResolvedInDB(id, resolved))) {
    throw new NotFoundError("Error not found");
  }
};
