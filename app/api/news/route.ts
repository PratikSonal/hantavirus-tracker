import { NextResponse } from "next/server";
import RSSParser from "rss-parser";

const parser = new RSSParser();
const GOOGLE_NEWS_URL =
  "https://news.google.com/rss/search?q=hantavirus&hl=en-US&gl=US&ceid=US:en";

async function scrapeNews() {
  try {
    const feed = await parser.parseURL(GOOGLE_NEWS_URL);

    const items = feed.items.slice(0, 20).map((item) => {
      // Google News titles end with " - Source Name", split it off
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

    return items;
  } catch (err) {
    console.error("News scrape failed:", err);
    return [];
  }
}

export async function GET() {
  const items = await scrapeNews();
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    count: items.length,
    items,
  });
}
