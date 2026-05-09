/* eslint-disable @typescript-eslint/no-explicit-any */

import Groq from "groq-sdk";
import { tavilySearch } from "./tavily";
import { searchCache } from "./cache";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

function cleanMessages(messages: any[]) {
  return messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));
}

export async function runAgent(
  messages: any[],
  memories: any[] = [],
  tools: string[] = [],
  model = "llama-3.3-70b-versatile",
) {
  const sanitizedMessages = cleanMessages(messages);

  const webSearchEnabled = tools.includes("tavily_search");

  /**
   * MEMORY CONTEXT
   */

  const memoryContext =
    memories.length > 0
      ? memories.map((m) => `${m.key}: ${m.value}`).join("\n")
      : "No saved memories.";

  /**
   * FIRST AI CALL
   */

  const completion = await groq.chat.completions.create({
    model,

    temperature: 0,

    max_completion_tokens: 400,

    messages: [
      {
        role: "system",

        content: `
You are a helpful AI assistant.

USER MEMORIES:
${memoryContext}

IMPORTANT:

- Use memories naturally.
- If user asks "who am I", "what is my name", etc use memory.
- Never hallucinate memory.
- If web search needed return ONLY:
SEARCH: query

Web Search Enabled: ${webSearchEnabled}
`,
      },

      ...sanitizedMessages,
    ],
  });

  const response = completion.choices[0].message.content?.trim() || "";

  /**
   * SEARCH FLOW
   */

  if (webSearchEnabled && response.startsWith("SEARCH:")) {
    const query = response.replace("SEARCH:", "").trim();

    let searchResult = "";

    const cachedResult = searchCache.get<string>(query);

    if (cachedResult) {
      console.log("CACHE HIT");

      searchResult = cachedResult;
    } else {
      console.log("CACHE MISS");

      searchResult = await tavilySearch(query);

      searchCache.set(query, searchResult);
    }

    /**
     * FINAL AI RESPONSE
     */

    const secondCompletion = await groq.chat.completions.create({
      model,

      temperature: 0,

      max_completion_tokens: 700,

      messages: [
        {
          role: "system",

          content: `
You are a helpful AI assistant.

USER MEMORIES:
${memoryContext}

Use search results + memories naturally.
`,
        },

        ...sanitizedMessages,

        {
          role: "user",

          content: `
Search Results:

${searchResult.slice(0, 5000)}

Now answer clearly.
`,
        },
      ],
    });

    return secondCompletion.choices[0].message.content || "No response";
  }

  return response;
}
