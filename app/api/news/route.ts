import { NextResponse } from "next/server";
import RSSParser from "rss-parser";

const parser = new RSSParser();

// Fetch news for a specific country or general hantavirus news
async function fetchNews(country?: string) {
  const query = country
    ? `hantavirus ${country}`
    : "hantavirus";
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;

  try {
    const feed = await parser.parseURL(url);

    return feed.items.slice(0, 20).map((item) => {
      let title = item.title ?? "";
      let outlet = "";
      if (title.includes(" - ")) {
        const lastDash = title.lastIndexOf(" - ");
        outlet = title.substring(lastDash + 3);
        title = title.substring(0, lastDash);
      }

      return {
        title,
        outlet,
        url: item.link ?? "",
        publishedAt: item.pubDate ?? null,
        snippet: item.contentSnippet ?? "",
      };
    });
  } catch (err) {
    console.error("News fetch failed:", err);
    return [];
  }
}

// GET /api/news          → general hantavirus news
// GET /api/news?country= → news filtered for a specific country
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get("country") ?? undefined;

  const items = await fetchNews(country);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    country: country ?? null,
    count: items.length,
    items,
  });
}
