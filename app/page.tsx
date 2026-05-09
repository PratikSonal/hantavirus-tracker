"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useRef } from "react";

const Map = dynamic(() => import("./components/Map"), { ssr: false });

interface OutbreakData {
  cases_confirmed: number;
  cases_suspected: number;
  deaths: number;
  as_of: string;
  source: string;
  cases_total: number;
}

interface CaseData {
  id: number;
  role: string;
  status: string;
  outcome: string;
  currentLocation: string;
  onsetDate: string;
  notes: string;
}

interface LocationData {
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
  cases: CaseData[];
}

interface NewsItem {
  title: string;
  outlet: string;
  url: string;
  publishedAt: string | null;
  snippet: string;
}

function StatCard({
  label,
  value,
  color,
  sub,
}: {
  label: string;
  value: string | number;
  color: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col justify-center px-6 py-2 bg-zinc-950 border-r border-zinc-800/60 last:border-r-0 hover:bg-zinc-900/50 transition-colors duration-200">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-0.5">
        {label}
      </span>
      <span className={`text-2xl font-bold tabular-nums ${color}`}>
        {value}
      </span>
      {sub && <span className="text-[10px] text-zinc-600 mt-0.5">{sub}</span>}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="flex flex-col gap-2 p-3 bg-zinc-900 rounded-lg">
      <div className="skeleton h-3 w-24" />
      <div className="skeleton h-4 w-full" />
      <div className="skeleton h-3 w-16" />
    </div>
  );
}

function OutcomeTag({ outcome }: { outcome: string }) {
  const styles: Record<string, string> = {
    deceased: "bg-red-950 text-red-400 border border-red-900/50",
    critical: "bg-orange-950 text-orange-400 border border-orange-900/50",
    hospitalized: "bg-blue-950 text-blue-400 border border-blue-900/50",
    stable: "bg-green-950 text-green-400 border border-green-900/50",
  };
  return (
    <span
      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${styles[outcome] ?? "bg-zinc-800 text-zinc-400"}`}
    >
      {outcome}
    </span>
  );
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

function NewsTicker({ items }: { items: NewsItem[] }) {
  const tickerRef = useRef<HTMLDivElement>(null);

  if (items.length === 0) return null;

  // Duplicate items for seamless loop
  const doubled = [...items, ...items];

  return (
    <div className="bg-black border-b border-zinc-800/60 flex items-center overflow-hidden shrink-0 h-8">
      {/* Label */}
      <div className="shrink-0 flex items-center gap-2 px-3 bg-red-600 h-full">
        <span className="text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">
          Breaking
        </span>
      </div>
      {/* Scrolling content */}
      <div className="overflow-hidden flex-1 relative">
        <div
          ref={tickerRef}
          className="flex items-center gap-0 whitespace-nowrap"
          style={{
            animation: "ticker 60s linear infinite",
          }}
        >
          {doubled.map((item, i) => (
            <a
              key={i}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-6 hover:text-white transition-colors group"
            >
              <span className="text-[10px] font-bold text-red-500 uppercase tracking-wide shrink-0">
                {item.outlet}
              </span>
              <span className="text-[11px] text-zinc-400 group-hover:text-zinc-200 transition-colors">
                {item.title}
              </span>
              <span className="text-zinc-700 mx-2">·</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(
    null,
  );
  const [outbreak, setOutbreak] = useState<OutbreakData | null>(null);
  const [byLocation, setByLocation] = useState<LocationData[]>([]);
  const [responseCountries, setResponseCountries] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [countryNews, setCountryNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [tickerNews, setTickerNews] = useState<NewsItem[]>([]);

  useEffect(() => {
    fetch("/api/outbreak")
      .then((r) => r.json())
      .then((data) => {
        setOutbreak(data.outbreak);
        setByLocation(data.byLocation ?? []);
        setResponseCountries(data.responseCountries ?? []);
        setLoading(false);
      });

    // Fetch general news for ticker
    fetch("/api/news")
      .then((r) => r.json())
      .then((data) => setTickerNews(data.items?.slice(0, 10) ?? []));
  }, []);

  const handleLocationClick = async (loc: LocationData) => {
    setSelectedLocation(loc);
    setCountryNews([]);
    setNewsLoading(true);
    try {
      const res = await fetch(
        `/api/news?country=${encodeURIComponent(loc.location)}`,
      );
      const data = await res.json();
      setCountryNews(data.items ?? []);
    } catch {
      setCountryNews([]);
    } finally {
      setNewsLoading(false);
    }
  };

  const cfr = outbreak
    ? Math.round((outbreak.deaths / outbreak.cases_total) * 100)
    : null;

  return (
    <div className="flex flex-col h-screen bg-black text-white overflow-hidden">
      {/* ── Header ── */}
      <header className="px-6 py-2.5 bg-zinc-950/90 border-b border-zinc-800/60 flex items-center justify-between backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 rounded-full px-2.5 py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-bold tracking-widest text-red-400 uppercase">
              Live
            </span>
          </div>
          <div className="w-px h-4 bg-zinc-800" />
          <h1 className="text-sm font-semibold tracking-tight text-zinc-100">
            Hantavirus Tracker
          </h1>
          <span className="text-xs text-zinc-600 hidden sm:block">
            MV Hondius · Andes Virus · 2026
          </span>
        </div>
        <div className="flex items-center gap-4">
          {outbreak?.as_of && (
            <span className="text-[11px] text-zinc-500">
              WHO data as of{" "}
              <span className="text-zinc-400 font-medium">
                {outbreak.as_of}
              </span>
            </span>
          )}
          <span className="text-[11px] text-zinc-600 hidden md:block">
            WHO · Google News
          </span>
        </div>
      </header>

      {/* ── Stats bar ── */}
      <div className="grid grid-cols-4 border-b border-zinc-800/60 shrink-0">
        <StatCard
          label="Confirmed"
          value={outbreak?.cases_confirmed ?? "—"}
          color="text-orange-400"
          sub="Lab confirmed Andes virus"
        />
        <StatCard
          label="Probable"
          value={outbreak?.cases_suspected ?? "—"}
          color="text-yellow-400"
          sub="Awaiting confirmation"
        />
        <StatCard
          label="Deaths"
          value={outbreak?.deaths ?? "—"}
          color="text-red-500"
          sub={cfr !== null ? `${cfr}% case fatality rate` : undefined}
        />
        <StatCard
          label="Countries"
          value={responseCountries.length || "—"}
          color="text-blue-400"
          sub="In WHO response"
        />
      </div>

      {/* ── News ticker ── */}
      <NewsTicker items={tickerNews} />

      {/* ── Main content ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Map */}
        <div className="flex-1 relative">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-10 gap-3">
              <div className="w-8 h-8 border-2 border-zinc-700 border-t-orange-500 rounded-full animate-spin" />
              <span className="text-xs text-zinc-600 tracking-wide">
                Loading WHO data...
              </span>
            </div>
          )}
          <Map byLocation={byLocation} onLocationClick={handleLocationClick} />

          {/* Floating legend */}
          {!selectedLocation && (
            <div className="absolute bottom-4 left-4 z-[1000] bg-black/80 backdrop-blur-sm border border-zinc-800/60 rounded-xl px-4 py-3 flex flex-col gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                Pin legend
              </span>
              <div className="flex flex-col gap-1.5">
                {[
                  { color: "#dc2626", label: "Deaths reported" },
                  { color: "#ea580c", label: "Critical cases" },
                  { color: "#f97316", label: "Confirmed cases" },
                  { color: "#eab308", label: "Probable cases" },
                  { color: "#4b5563", label: "Response only" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-[11px] text-zinc-400">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
              <span className="text-[10px] text-zinc-600 mt-1 border-t border-zinc-800 pt-2">
                Pin size = case count · Click for details
              </span>
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        {selectedLocation && (
          <div className="w-80 bg-zinc-950 border-l border-zinc-800/60 flex flex-col overflow-hidden sidebar-animate">
            {/* Sidebar header */}
            <div className="px-5 py-4 border-b border-zinc-800/60 shrink-0">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-base font-bold text-zinc-100 leading-tight">
                    {selectedLocation.location}
                  </h2>
                  {responseCountries.includes(selectedLocation.location) && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                      Active WHO response
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setSelectedLocation(null)}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all text-sm leading-none mt-0.5"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Case stats */}
            {selectedLocation.total > 0 && (
              <div className="px-5 py-4 border-b border-zinc-800/60 shrink-0">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      label: "Confirmed",
                      value: selectedLocation.confirmed,
                      color: "text-orange-400",
                    },
                    {
                      label: "Probable",
                      value: selectedLocation.probable,
                      color: "text-yellow-400",
                    },
                    {
                      label: "Deaths",
                      value: selectedLocation.deaths,
                      color: "text-red-500",
                    },
                    {
                      label: "Critical",
                      value: selectedLocation.critical,
                      color: "text-red-400",
                    },
                    {
                      label: "Hospitalized",
                      value: selectedLocation.hospitalized,
                      color: "text-blue-400",
                    },
                    {
                      label: "Total",
                      value: selectedLocation.total,
                      color: "text-zinc-100",
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="bg-zinc-900/80 rounded-lg p-2.5 border border-zinc-800/40"
                    >
                      <div
                        className={`text-xl font-bold tabular-nums ${stat.color}`}
                      >
                        {stat.value}
                      </div>
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wide mt-0.5">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedLocation.total === 0 && (
              <div className="px-5 py-3 border-b border-zinc-800/60 shrink-0">
                <p className="text-xs text-zinc-500 leading-relaxed">
                  No confirmed cases — part of WHO coordinated international
                  response.
                </p>
              </div>
            )}

            {/* WHO case details */}
            {selectedLocation.cases && selectedLocation.cases.length > 0 && (
              <div className="border-b border-zinc-800/60 shrink-0">
                <div className="px-5 pt-4 pb-2">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                    WHO Case Details
                  </span>
                </div>
                <div className="px-5 pb-4 flex flex-col gap-2 max-h-56 overflow-y-auto sidebar-scroll">
                  {selectedLocation.cases.map((c) => (
                    <div
                      key={c.id}
                      className={`rounded-lg p-3 border-l-2 bg-zinc-900/60 border border-zinc-800/40 ${
                        c.outcome === "deceased"
                          ? "border-l-red-700"
                          : c.outcome === "critical"
                            ? "border-l-orange-600"
                            : c.outcome === "hospitalized"
                              ? "border-l-blue-600"
                              : "border-l-zinc-600"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-zinc-300">
                          Case {c.id}
                          <span className="text-zinc-600 font-normal">
                            {" "}
                            · {c.role}
                          </span>
                        </span>
                        <OutcomeTag outcome={c.outcome} />
                      </div>
                      <p className="text-[11px] text-zinc-500 leading-relaxed">
                        {c.notes}
                      </p>
                      <p className="text-[10px] text-zinc-700 mt-1.5">
                        Onset {c.onsetDate}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* News feed */}
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="px-5 pt-4 pb-2 shrink-0">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                  Latest News
                </span>
              </div>
              <div className="px-5 pb-4 flex flex-col gap-2 flex-1 overflow-y-auto sidebar-scroll">
                {newsLoading ? (
                  <>
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                  </>
                ) : countryNews.length > 0 ? (
                  countryNews.map((item, i) => (
                    <a
                      key={i}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block rounded-lg p-3 bg-zinc-900/60 border border-zinc-800/40 hover:border-zinc-700 hover:bg-zinc-900 transition-all duration-150"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wide">
                          {item.outlet}
                        </span>
                        <span className="text-[10px] text-zinc-600">
                          {timeAgo(item.publishedAt)}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed group-hover:text-zinc-100 transition-colors">
                        {item.title}
                      </p>
                    </a>
                  ))
                ) : (
                  <p className="text-xs text-zinc-600 mt-2">
                    No recent news found for {selectedLocation.location}.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
