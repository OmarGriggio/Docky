import { ErrorSource } from "./error_log.types";

// What a recorded occurrence turned out to be - only the first two are worth
// a notification, a known open error happening again just bumps its counter.
export type OccurrenceKind = "new" | "reopened" | "repeat";

export interface ErrorNotificationInput {
  kind: OccurrenceKind;
  source: ErrorSource;
  name: string;
  location: string | null;
}

// Inside inline code, a backtick would close it early - and a browser report
// is user input, it must not be able to format (or forge) the message.
const inlineCode = (value: string): string => `\`${value.replace(/`/g, "'").slice(0, 200)}\``;

// Deliberately minimal: the error's type and where, never its message - a
// message can carry data (a database error quoting the email it choked on)
// and Discord is a third party. The details stay on /settings/errors, on our
// own server; the link leads there. null: nothing worth notifying.
export const buildErrorNotification = (input: ErrorNotificationInput, appUrl: string | undefined): string | null => {
  if (input.kind === "repeat") {
    return null;
  }
  const title = input.kind === "new"
    ? `🔴 **Nouvelle erreur ${input.source === "BACKEND" ? "serveur" : "navigateur"}**`
    : `🟠 **Erreur revenue** (elle était marquée résolue)`;
  const lines = [title, `${inlineCode(input.name)} sur ${inlineCode(input.location ?? "?")}`];
  if (appUrl) {
    lines.push(`Détails : ${appUrl.replace(/\/$/, "")}/settings/errors`);
  }
  return lines.join("\n");
};
