import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

const WHO_DON_URL =
  "https://www.who.int/emergencies/disease-outbreak-news/item/2026-DON599";

const WORD_NUMBERS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
};

function toInt(s: string): number | null {
  s = s.trim().toLowerCase();
  if (/^\d+$/.test(s)) return parseInt(s);
  return WORD_NUMBERS[s] ?? null;
}

// Fallback if WHO scrape fails
const FALLBACK = {
  cases_total: 0,
  cases_confirmed: 0,
  cases_suspected: 0,
  deaths: 0,
  critical: 0,
  as_of: "2026-05-04",
  source: "WHO DON599 (fallback)",
  source_url: WHO_DON_URL,
};

async function scrapeWHO() {
  try {
    const res = await fetch(WHO_DON_URL, {
      headers: { "User-Agent": "Mozilla/5.0 hantavirus-tracker/1.0" },
      next: { revalidate: 1800 }, // cache for 30 minutes
    });

    if (!res.ok) return FALLBACK;

    const html = await res.text();
    const $ = cheerio.load(html);
    const text = $("body").text().replace(/\s+/g, " ");

    const out = { ...FALLBACK };

    // Extract total, confirmed, suspected
    const caseMatch = text.match(
      /(\w+)\s+cases?\s*\(\s*(\w+)\s+laboratory\s+confirmed\s+cases?\s+of\s+hantavirus\s+and\s+(\w+)\s+suspected/i,
    );
    if (caseMatch) {
      const total = toInt(caseMatch[1]);
      const confirmed = toInt(caseMatch[2]);
      const suspected = toInt(caseMatch[3]);
      if (total) out.cases_total = total;
      if (confirmed) out.cases_confirmed = confirmed;
      if (suspected) out.cases_suspected = suspected;
    }

    // Extract deaths
    const deathMatch = text.match(/including\s+(\w+)\s+deaths?/i);
    if (deathMatch) {
      const deaths = toInt(deathMatch[1]);
      if (deaths) out.deaths = deaths;
    }

    // Extract "as of" date
    const dateMatch = text.match(
      /[Aa]s of (\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/,
    );
    if (dateMatch) {
      const MONTHS: Record<string, string> = {
        January: "01",
        February: "02",
        March: "03",
        April: "04",
        May: "05",
        June: "06",
        July: "07",
        August: "08",
        September: "09",
        October: "10",
        November: "11",
        December: "12",
      };
      out.as_of = `${dateMatch[3]}-${MONTHS[dateMatch[2]]}-${dateMatch[1].padStart(2, "0")}`;
    }

    out.source = "WHO DON599 (live)";
    return out;
  } catch (err) {
    console.error("WHO scrape failed:", err);
    return FALLBACK;
  }
}

export async function GET() {
  const data = await scrapeWHO();
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    outbreak: data,
  });
}
