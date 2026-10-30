import { createHash } from "crypto";
import { ErrorSource } from "./error_log.types";

// Column sizes from 011_add_error_groups.sql, plus a cap on what a stack or a
// message can weigh - a browser report is user input.
export const MAX_NAME_LENGTH = 255;
export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_STACK_LENGTH = 10000;
export const MAX_LOCATION_LENGTH = 500;

export const truncate = (value: string, max: number): string =>
  value.length > max ? value.slice(0, max) : value;

// Ids, amounts, line numbers... change from one occurrence of the same bug to
// the next ("Client 12 not found", "Client 47 not found") - replaced so they
// still group together.
export const normalizeMessage = (message: string): string =>
  message.replace(/\d+/g, "<n>").replace(/\s+/g, " ").trim();

// The first stack frame in our own code - where the bug actually is, not
// where a library happened to throw it: its function and file, without the
// line and column (an edit higher up in the file would otherwise split one
// open bug into a new "new" error on the next deploy), path kept from src/ or
// dist/ on (the absolute path differs between a dev machine and the server).
export const firstAppFrame = (stack: string | null): string | null => {
  if (!stack) {
    return null;
  }
  const frame = stack
    .split("\n")
    .map(line => line.trim())
    .find(line => line.startsWith("at ") && !line.includes("node_modules") && !line.includes("node:"));
  if (!frame) {
    return null;
  }
  return frame
    .replace(/\\/g, "/")
    .replace(/(^at |\()[^()]*?\/((?:src|dist)\/)/, "$1$2")
    .replace(/(:\d+)+(\)?)$/, "$2");
};

// What makes two occurrences "the same error". A browser's stack can't be
// part of it: the production bundle is minified and its file names change on
// every deploy, so a frontend error groups on its type and message alone.
export const buildFingerprint = (source: ErrorSource, name: string, message: string, stack: string | null): string => {
  const parts = [source, name, normalizeMessage(message)];
  if (source === "BACKEND") {
    parts.push(firstAppFrame(stack) ?? "");
  }
  return createHash("sha256").update(parts.join("|")).digest("hex");
};
