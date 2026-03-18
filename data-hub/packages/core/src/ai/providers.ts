import type { SummaryProvider } from "@data-hub/contracts";

export interface SummaryRequestContext {
  provider: SummaryProvider;
  prompt: string;
  env: NodeJS.ProcessEnv;
  fetch: typeof fetch;
}

function resolveApiKey(provider: SummaryProvider, env: NodeJS.ProcessEnv) {
  if (!provider.apiKeyEnv) {
    return null;
  }

  return env[provider.apiKeyEnv] ?? null;
}

async function requestJson<T>(fetchFn: typeof fetch, url: string, init: RequestInit) {
  const response = await fetchFn(url, init);
  if (!response.ok) {
    throw new Error(`AI request failed with ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

export async function summarizeWithProvider({ provider, prompt, env, fetch: fetchFn }: SummaryRequestContext) {
  const apiKey = resolveApiKey(provider, env);
  const baseUrl = provider.baseUrl ?? "";

  if (provider.providerType === "ollama") {
    const payload = await requestJson<{ response?: string }>(fetchFn, `${baseUrl.replace(/\/$/, "")}/api/generate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: provider.model,
        prompt,
        stream: false,
      }),
    });

    return payload.response?.trim() ?? "";
  }

  if (provider.providerType === "openai" || provider.providerType === "custom") {
    const payload = await requestJson<{ choices?: Array<{ message?: { content?: string } }> }>(fetchFn, `${baseUrl.replace(/\/$/, "")}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: provider.model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: "You are a concise private-news assistant. Summarize the provided material faithfully and do not add recommendations.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    return payload.choices?.[0]?.message?.content?.trim() ?? "";
  }

  if (provider.providerType === "anthropic") {
    const payload = await requestJson<{ content?: Array<{ text?: string }> }>(fetchFn, `${baseUrl.replace(/\/$/, "")}/v1/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(apiKey ? { "x-api-key": apiKey } : {}),
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: provider.model,
        max_tokens: 500,
        temperature: 0.2,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    return payload.content?.map((part) => part.text ?? "").join("\n").trim() ?? "";
  }

  throw new Error(`Unsupported summary provider type "${provider.providerType}".`);
}
