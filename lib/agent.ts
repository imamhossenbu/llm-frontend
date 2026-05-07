/* eslint-disable @typescript-eslint/no-explicit-any */
import Groq from "groq-sdk";
import { tavilySearch } from "./tavily";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function runAgent(messages: any[]) {
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",

    messages: [
      {
        role: "system",
        content: `
You are a helpful AI assistant.

RULES:
1. If web search needed respond ONLY:
SEARCH: query

2. No explanation before SEARCH.
        `,
      },

      ...messages,
    ],
  });

  const response = completion.choices[0].message.content || "";

  /**
   * SEARCH FLOW
   */
  if (response.startsWith("SEARCH:")) {
    const query = response.replace("SEARCH:", "").trim();

    const searchResult = await tavilySearch(query);

    const secondCompletion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",

      messages: [
        ...messages,

        {
          role: "assistant",
          content: response,
        },

        {
          role: "user",
          content: `
Web Search Result:
${searchResult}

Now answer properly.
          `,
        },
      ],
    });

    return secondCompletion.choices[0].message.content;
  }

  return response;
}
