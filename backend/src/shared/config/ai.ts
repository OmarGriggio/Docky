// Infomaniak's AI Tools - an OpenAI-compatible chat completions endpoint,
// scoped to this account's own "product" (see README's Environment
// variables table). Swiss-hosted, matching this project's own hosting - see
// zz_docs/Decisions.md for why this over another LLM provider.
export const INFOMANIAK_AI_BASE_URL = `https://api.infomaniak.com/2/ai/${process.env.INFOMANIAK_AI_PRODUCT_ID}/openai/v1`;

export const INFOMANIAK_AI_API_TOKEN = process.env.INFOMANIAK_AI_API_TOKEN;
