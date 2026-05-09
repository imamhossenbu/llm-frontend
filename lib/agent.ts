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
  tools: string[] = [],
  model = "llama-3.3-70b-versatile",
) {
  const sanitizedMessages = cleanMessages(messages);

  const webSearchEnabled = tools.includes("tavily_search");

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

        content: webSearchEnabled
          ? `
You are a helpful AI assistant.

IMPORTANT RULES:

1. If user asks about:
- weather
- news
- live data
- current information
- latest updates
- sports scores
- stock price
- internet facts

Then respond ONLY like this:

SEARCH: query

2. Do not explain before SEARCH.

3. If search is unnecessary answer normally.

Examples:

User: weather in dhaka
Assistant: SEARCH: current weather in dhaka

User: latest iphone news
Assistant: SEARCH: latest iphone news

User: who is messi
Assistant: Lionel Messi is a football player.
`
          : `
You are a helpful AI assistant.

Web search disabled.

Never use SEARCH.
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

      max_completion_tokens: 600,

      messages: [
        {
          role: "system",

          content: `
You are a helpful AI assistant.

Use the search results to answer naturally.
`,
        },

        ...sanitizedMessages,

        {
          role: "user",

          content: `
Search Results:

${searchResult.slice(0, 4000)}

Now answer the user clearly.
`,
        },
      ],
    });

    return secondCompletion.choices[0].message.content || "No response";
  }

  return response;
}
