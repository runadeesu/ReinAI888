import { tool } from "ai";
import { z } from "zod";

interface WikipediaSearchResult {
  title: string;
  snippet: string;
}

interface WikipediaSearchResponse {
  query?: { search?: WikipediaSearchResult[] };
}

interface WikipediaExtractPage {
  title: string;
  extract?: string;
}

interface WikipediaExtractResponse {
  query?: { pages?: Record<string, WikipediaExtractPage> };
}

// Wikipedia's public API needs no key and has no per-app rate limit for
// reasonable use, which makes it the one "web search" backend we can wire up
// without a paid search API — real grounding data, just scoped to
// encyclopedic topics rather than the general web.
export const wikipediaSearchTool = tool({
  description:
    "Wikipediaで検索して事実確認を行う。日付・統計・固有名詞・専門用語など、モデル自身の知識だけでは不確かな、または古い可能性がある情報を調べるときに使う。",
  inputSchema: z.object({
    query: z.string().min(1).max(200).describe("検索キーワード"),
    lang: z.enum(["ja", "en"]).optional().describe("検索対象の言語。指定がなければ日本語版を使う"),
  }),
  execute: async ({ query, lang }) => {
    const language = lang ?? "ja";
    const base = `https://${language}.wikipedia.org/w/api.php`;

    try {
      const searchUrl = `${base}?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=3`;
      const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(10000) });
      if (!searchRes.ok) return { error: "Wikipedia検索に失敗しました" };

      const searchData = (await searchRes.json()) as WikipediaSearchResponse;
      const results = searchData.query?.search ?? [];
      if (results.length === 0) {
        return { articles: [], note: "該当する記事が見つかりませんでした" };
      }

      const titles = results.map((r) => r.title);
      const extractUrl = `${base}?action=query&prop=extracts&exintro=true&explaintext=true&titles=${encodeURIComponent(titles.join("|"))}&format=json`;
      const extractRes = await fetch(extractUrl, { signal: AbortSignal.timeout(10000) });
      const extractData = (await extractRes.json()) as WikipediaExtractResponse;
      const pages = Object.values(extractData.query?.pages ?? {});

      const articles = titles.map((title) => {
        const page = pages.find((p) => p.title === title);
        return {
          title,
          summary: (page?.extract ?? "").slice(0, 1200),
          url: `https://${language}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
        };
      });

      return { articles };
    } catch {
      return { error: "Wikipedia検索がタイムアウトしました" };
    }
  },
});
