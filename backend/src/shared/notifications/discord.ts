// Posts a message to a Discord channel through its webhook (Channel settings
// > Integrations > Webhooks) - the channel's members get it as a push
// notification. DISCORD_WEBHOOK_URL is a secret (anyone holding it can post
// there), set in backend/.env only; unset, nothing is sent (local dev).
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const TIMEOUT_MS = 5000;

// A bad deploy can raise dozens of new errors at once - past this many
// messages a minute, the rest are counted and summed up in one message when
// the minute is over. Discord itself allows about 5 every 2 seconds.
const MAX_PER_WINDOW = 5;
const WINDOW_MS = 60_000;

let windowStart = 0;
let sentInWindow = 0;
let held = 0;
let flushTimer: NodeJS.Timeout | undefined;

const post = async (content: string): Promise<void> => {
  try {
    const response = await fetch(WEBHOOK_URL!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // No @everyone/@here/role pings, whatever the content says.
      body: JSON.stringify({ content, allowed_mentions: { parse: [] } }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      console.error(`discord : webhook answered ${response.status}`);
    }
  } catch (err) {
    console.error("discord : " + err);
  }
};

const flushHeld = (): void => {
  flushTimer = undefined;
  const count = held;
  held = 0;
  windowStart = Date.now();
  sentInWindow = 1;
  void post(`➕ **${count} autre${count > 1 ? "s" : ""} notification${count > 1 ? "s" : ""}** retenue${count > 1 ? "s" : ""} pendant la dernière minute - voir la page des erreurs.`);
};

// Fire-and-forget: never awaited by the caller, never throws - a notification
// failing (Discord down, webhook deleted) must not affect what triggered it.
export const notifyDiscord = (content: string): void => {
  if (!WEBHOOK_URL) {
    return;
  }
  const now = Date.now();
  if (now - windowStart >= WINDOW_MS && !flushTimer) {
    windowStart = now;
    sentInWindow = 0;
  }
  if (sentInWindow < MAX_PER_WINDOW) {
    sentInWindow++;
    void post(content);
    return;
  }
  held++;
  flushTimer ??= setTimeout(flushHeld, Math.max(windowStart + WINDOW_MS - now, 0));
};
