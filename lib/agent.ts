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
   * MEMORY FORMAT — grouped by key for clarity
   */
  let memoryContext = "No saved memories yet.";

  if (memories.length > 0) {
    memoryContext = memories
      .map((m) => `• ${m.key}: ${m.value}`)
      .join("\n");
  }

  /**
   * SYSTEM PROMPT
   */
  const systemPrompt = `You are a smart, helpful, and friendly AI assistant with persistent memory.

=== USER'S PERSONAL MEMORY ===
${memoryContext}
=== END MEMORY ===

CRITICAL MEMORY RULES:
1. You MUST use the memory above to personalize every response when relevant.
2. If the user asks "who am I?", "what's my name?", "what do you know about me?", "my bio", or anything about themselves — ALWAYS answer from the memory above.
3. NEVER say "I don't know who you are" or "I don't have access to your info" if memory exists above.
4. If memory has their name, greet them by name naturally.
5. If memory is empty ("No saved memories yet"), then politely say you don't know yet and ask them to tell you.
6. Treat the memory as things you genuinely know about the user from previous conversations.

CONVERSATION RULES:
- Be natural, conversational, and helpful
- Give thorough but concise answers
- Use markdown formatting when helpful (bold, lists, code blocks)
${
  webSearchEnabled
    ? `
WEB SEARCH:
- If you need real-time or current information to answer, respond ONLY with:
SEARCH: your search query
- Only use SEARCH when absolutely necessary for real-time data`
    : `
- Web search is currently disabled
- Never use the SEARCH command`
}
`;

  /**
   * FIRST LLM CALL
   */
  const completion = await groq.chat.completions.create({
    model,
    temperature: 0.3,
    max_completion_tokens: 800,
    messages: [
      {
        role: "system",
        content: systemPrompt,
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
      searchResult = cachedResult;
    } else {
      searchResult = await tavilySearch(query);
      searchCache.set(query, searchResult);
    }

    /**
     * FINAL ANSWER — combining memory + search + chat
     */
    const secondCompletion = await groq.chat.completions.create({
      model,
      temperature: 0.3,
      max_completion_tokens: 800,
      messages: [
        {
          role: "system",
          content: `You are a helpful AI assistant with persistent memory about the user.

USER'S MEMORY:
${memoryContext}

Use BOTH the user's memory AND the search results below to give the best possible answer.
Be natural and personalized.`,
        },
        {
          role: "user",
          content: `SEARCH RESULT:
${searchResult.slice(0, 5000)}

CONVERSATION:
${sanitizedMessages.map((m) => `${m.role}: ${m.content}`).join("\n")}

Now answer the user's question using the search results and your knowledge about them.`,
        },
      ],
    });

    return secondCompletion.choices[0].message.content || "No response";
  }

  return response;
}
