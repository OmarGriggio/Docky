import { INFOMANIAK_AI_API_TOKEN, INFOMANIAK_AI_BASE_URL } from "../config/ai";
import { AppError } from "../types/errors";

export interface ChatMessage {
    role: "system" | "user";
    content: string;
}

// Swiss-hosted model, used across the app for now - see
// zz_docs/Decisions.md. A caller can still pass another one via `model`.
const DEFAULT_MODEL = "swiss-ai/Apertus-v1.5-70B";

// Thin wrapper around Infomaniak's OpenAI-compatible chat completions
// endpoint - returns just the assistant's text, nothing module-specific
// (prompt content, response parsing) belongs here.
export const chatCompletionServ = async (
    messages: ChatMessage[],
    options?: { model?: string; temperature?: number }
): Promise<string> => {
    const response = await fetch(`${INFOMANIAK_AI_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${INFOMANIAK_AI_API_TOKEN}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: options?.model ?? DEFAULT_MODEL,
            temperature: options?.temperature ?? 0,
            messages,
        }),
    });

    if (!response.ok) {
        // The upstream body is logged here, never sent back to the client -
        // it can carry account/quota details that are none of its business.
        const body = await response.text();
        console.error(`Infomaniak AI request failed (${response.status}): ${body}`);
        throw new AppError("The document scanner is unavailable right now", 502);
    }

    const data = await response.json();
    return data.choices[0].message.content;
};
