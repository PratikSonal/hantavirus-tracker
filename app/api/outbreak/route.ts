import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

const WHO_DON_URL =
  "https://www.who.int/emergencies/disease-outbreak-news/item/2026-DON600";

const WORD_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
};

const MONTHS: Record<string, string> = {
  January: "01", February: "02", March: "03", April: "04",
  May: "05", June: "06", July: "07", August: "08",
  September: "09", October: "10", November: "11", December: "12",
};

function toInt(s: string): number | null {
  s = s.trim().toLowerCase();
  if (/^\d+$/.test(s)) return parseInt(s);
  return WORD_NUMBERS[s] ?? null;
}

const FALLBACK = {
  cases_total: 8,
  cases_confirmed: 6,
  cases_suspected: 2,
  deaths: 3,
  critical: 1,
  as_of: "2026-05-08",
  source: "WHO DON600 (fallback)",
  source_url: WHO_DON_URL,
};

const CDC_SNAPSHOT = {
  as_of: "2023-12-31",
  total_cases_since_1993: 890,
  hps_cases: 859,
  case_fatality_rate_pct: 35,
  median_age: 38,
  pct_male: 62,
  pct_west_of_mississippi: 94,
  surveillance_start: 1993,
  source_url: "https://www.cdc.gov/hantavirus/data-research/cases/index.html",
};

// Coordinates for all countries/locations that appear in CASE_MANIFEST or RESPONSE_COUNTRIES
// Used to place pins on the map
const COUNTRY_COORDS: Record<string, [number, number]> = {
  "Netherlands": [52.3, 5.3],
  "South Africa": [-30.5, 22.9],
  "Switzerland": [46.8, 8.2],
  "United Kingdom": [55.3, -3.4],
  "Germany": [51.2, 10.4],
  "Argentina": [-38.4, -63.6],
  "Spain": [40.4, -3.7],
  "Cape Verde": [16.0, -24.0],
  "Chile": [-35.7, -71.5],
  "United States": [37.1, -95.7],
  "Singapore": [1.3, 103.8],
  "Canada": [56.1, -106.3],
};

// Sourced directly from WHO DON600 (8 May 2026)
// currentLocation = where the case is physically located/treated
// Update this when WHO publishes a new DON
const CASE_MANIFEST = [
  {
    id: 1,
    role: "Passenger",
    status: "probable",
    outcome: "deceased",
    currentLocation: "United Kingdom",
    onsetDate: "2026-04-06",
    notes: "Adult male. Died on board Apr 11. No microbiological tests performed. Body removed to Saint Helena (British Overseas Territory) on Apr 24.",
  },
  {
    id: 2,
    role: "Passenger",
    status: "confirmed",
    outcome: "deceased",
    currentLocation: "South Africa",
    onsetDate: "2026-04-24",
    notes: "Adult female, close contact of Case 1. Died Johannesburg Apr 26. PCR confirmed.",
  },
  {
    id: 3,
    role: "Passenger",
    status: "confirmed",
    outcome: "critical",
    currentLocation: "South Africa",
    onsetDate: "2026-04-24",
    notes: "Adult male. Evacuated from Ascension Island. In ICU Johannesburg. PCR + sequencing confirmed Andes.",
  },
  {
    id: 4,
    role: "Passenger",
    status: "confirmed",
    outcome: "deceased",
    currentLocation: "Netherlands",
    onsetDate: "2026-04-28",
    notes: "Adult female. Died on board May 2. Post-mortem sample confirmed Andes virus in Netherlands.",
  },
  {
    id: 5,
    role: "Ship Doctor",
    status: "confirmed",
    outcome: "hospitalized",
    currentLocation: "Netherlands",
    onsetDate: "2026-04-30",
    notes: "Adult male, ship doctor. Evacuated to Netherlands May 6. PCR confirmed Andes. Currently stable.",
  },
  {
    id: 6,
    role: "Ship Guide",
    status: "confirmed",
    outcome: "hospitalized",
    currentLocation: "Netherlands",
    onsetDate: "2026-04-27",
    notes: "Adult male, ship guide. Evacuated to Netherlands May 7. PCR confirmed Andes. Currently stable.",
  },
  {
    id: 7,
    role: "Passenger",
    status: "confirmed",
    outcome: "hospitalized",
    currentLocation: "Switzerland",
    onsetDate: "2026-05-01",
    notes: "Adult male. Disembarked St Helena Apr 22, flew to Switzerland. Self-isolated. PCR confirmed Andes May 5.",
  },
  {
    id: 8,
    role: "Passenger",
    status: "probable",
    outcome: "stable",
    currentLocation: "Unknown",
    onsetDate: "2026-04-28",
    notes: "Adult male. Disembarked Tristan da Cunha Apr 14. Probable case pending lab confirmation.",
  },
];

// All countries involved in WHO coordination per DON600
const RESPONSE_COUNTRIES = [
  "Argentina", "Cape Verde", "Chile", "Germany",
  "Netherlands", "South Africa", "Spain", "Switzerland", "United Kingdom",
];

function aggregateByLocation() {
  const byLocation: Record<string, {
    location: string;
    lat: number | null;
    lng: number | null;
    confirmed: number;
    probable: number;
    deaths: number;
    critical: number;
    hospitalized: number;
    stable: number;
    total: number;
    cases: typeof CASE_MANIFEST;
  }> = {};

  // Seed all response countries so they appear even with 0 cases
  for (const country of RESPONSE_COUNTRIES) {
    const coords = COUNTRY_COORDS[country] ?? null;
    byLocation[country] = {
      location: country,
      lat: coords ? coords[0] : null,
      lng: coords ? coords[1] : null,
      confirmed: 0,
      probable: 0,
      deaths: 0,
      critical: 0,
      hospitalized: 0,
      stable: 0,
      total: 0,
      cases: [],
    };
  }

  // Aggregate case manifest into locations
  for (const c of CASE_MANIFEST) {
    const key = c.currentLocation;
    // Skip "On board" and "Unknown" — no map pin for these
    if (key === "On board (died)" || key === "Unknown") continue;

    if (!byLocation[key]) {
      const coords = COUNTRY_COORDS[key] ?? null;
      byLocation[key] = {
        location: key,
        lat: coords ? coords[0] : null,
        lng: coords ? coords[1] : null,
        confirmed: 0,
        probable: 0,
        deaths: 0,
        critical: 0,
        hospitalized: 0,
        stable: 0,
        total: 0,
        cases: [],
      };
    }

    byLocation[key].total += 1;
    if (c.status === "confirmed") byLocation[key].confirmed += 1;
    if (c.status === "probable") byLocation[key].probable += 1;
    if (c.outcome === "deceased") byLocation[key].deaths += 1;
    if (c.outcome === "critical") byLocation[key].critical += 1;
    if (c.outcome === "hospitalized") byLocation[key].hospitalized += 1;
    if (c.outcome === "stable") byLocation[key].stable += 1;
    byLocation[key].cases.push(c);
  }

  // Only return locations we can place on the map
  return Object.values(byLocation)
    .filter((l) => l.lat !== null && l.lng !== null)
    .sort((a, b) => b.total - a.total);
}

async function scrapeWHO() {
  try {
    const res = await fetch(WHO_DON_URL, {
      headers: { "User-Agent": "Mozilla/5.0 hantavirus-tracker/1.0" },
      next: { revalidate: 1800 },
    });

    if (!res.ok) {
      return {
        summary: FALLBACK,
        byLocation: aggregateByLocation(),
        responseCountries: RESPONSE_COUNTRIES,
        caseManifest: CASE_MANIFEST,
      };
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const text = $("body").text().replace(/\s+/g, " ");

    const out = { ...FALLBACK };

    const totalMatch = text.match(/total of\s+(\w+)\s+cases/i);
    if (totalMatch) {
      const total = toInt(totalMatch[1]);
      if (total) out.cases_total = total;
    }

    const confirmedMatch = text.match(/\((\w+)\s+confirmed\s+and\s+(\w+)\s+probable/i);
    if (confirmedMatch) {
      const confirmed = toInt(confirmedMatch[1]);
      const probable = toInt(confirmedMatch[2]);
      if (confirmed) out.cases_confirmed = confirmed;
      if (probable) out.cases_suspected = probable;
    }

    const deathMatch =
      text.match(/(\w+)\s+deaths?\s*\(/i) ||
      text.match(/including\s+(\w+)\s+deaths?/i) ||
      text.match(/(\w+)\s+deaths?,\s+case\s+fatality/i);
    if (deathMatch) {
      const deaths = toInt(deathMatch[1]);
      if (deaths) out.deaths = deaths;
    }

    const dateMatch = text.match(
      /[Aa]s of (\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/
    );
    if (dateMatch) {
      out.as_of = `${dateMatch[3]}-${MONTHS[dateMatch[2]]}-${dateMatch[1].padStart(2, "0")}`;
    }

    out.source = "WHO DON600 (live)";

    return {
      summary: out,
      byLocation: aggregateByLocation(),
      responseCountries: RESPONSE_COUNTRIES,
      caseManifest: CASE_MANIFEST,
    };
  } catch (err) {
    console.error("WHO scrape failed:", err);
    return {
      summary: FALLBACK,
      byLocation: aggregateByLocation(),
      responseCountries: RESPONSE_COUNTRIES,
      caseManifest: CASE_MANIFEST,
    };
  }
}

export async function GET() {
  const { summary, byLocation, responseCountries, caseManifest } = await scrapeWHO();
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    outbreak: summary,
    byLocation,
    responseCountries,
    caseManifest,
    cdc: CDC_SNAPSHOT,
  });
}
