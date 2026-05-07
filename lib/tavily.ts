/* eslint-disable @typescript-eslint/no-explicit-any */
export async function tavilySearch(query: string) {
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
    },
    body: JSON.stringify({
      query,
      search_depth: "basic",
      include_answer: true,
    }),
  });

  const data = await response.json();

  return (
    data.answer ||
    data.results?.map((r: any) => r.content).join("\n") ||
    "No result found"
  );
}
