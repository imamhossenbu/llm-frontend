/* eslint-disable @typescript-eslint/no-explicit-any */

import { prisma } from "@/lib/prisma";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * Get all memories for a user
 */
export async function getUserMemories(userId: string) {
  return prisma.memory.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Upsert a memory — update if same key exists, otherwise create
 */
export async function upsertMemory(
  userId: string,
  key: string,
  value: string,
) {
  const existing = await prisma.memory.findFirst({
    where: { userId, key },
  });

  if (existing) {
    return prisma.memory.update({
      where: { id: existing.id },
      data: { value },
    });
  }

  return prisma.memory.create({
    data: { userId, key, value },
  });
}

/**
 * Use a fast LLM call to extract memorable facts from the user's message.
 * Returns an array of { key, value } pairs, or empty array if nothing to save.
 */
export async function extractMemories(
  userMessage: string,
  assistantResponse: string,
): Promise<{ key: string; value: string }[]> {
  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0,
      max_completion_tokens: 300,
      messages: [
        {
          role: "system",
          content: `You are a memory extraction engine. Analyze the user message and extract personal facts worth remembering for future conversations.

Extract facts like: name, age, location, profession, hobbies, preferences, bio, education, skills, relationships, goals, favorites, etc.

RULES:
- Only extract FACTS the user explicitly states about themselves
- Use short, consistent keys (lowercase, e.g. "name", "age", "location", "profession", "hobby", "bio", "education", "favorite_color", "goal")
- Values should be concise but complete
- If NO personal facts are found, return empty array
- Do NOT extract questions, opinions about others, or general knowledge
- Do NOT extract facts from the assistant's response, only from the user's message

Respond ONLY with a valid JSON array. Examples:
[{"key": "name", "value": "John"}, {"key": "profession", "value": "Software Engineer"}]
[]`,
        },
        {
          role: "user",
          content: `USER MESSAGE: ${userMessage}\nASSISTANT RESPONSE: ${assistantResponse}`,
        },
      ],
    });

    const raw = completion.choices[0].message.content?.trim() || "[]";

    // Parse the JSON array — handle potential markdown code blocks
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const parsed = JSON.parse(cleaned);

    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item: any) =>
          item &&
          typeof item.key === "string" &&
          typeof item.value === "string" &&
          item.key.length > 0 &&
          item.value.length > 0,
      );
    }

    return [];
  } catch (error) {
    console.error("Memory extraction error:", error);
    return [];
  }
}
