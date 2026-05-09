"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";

const Map = dynamic(() => import("./components/Map"), { ssr: false });

interface OutbreakData {
  cases_confirmed: number;
  cases_suspected: number;
  deaths: number;
  as_of: string;
  source: string;
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

export default function Home() {
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [outbreak, setOutbreak] = useState<OutbreakData | null>(null);
  const [byLocation, setByLocation] = useState<LocationData[]>([]);
  const [responseCountries, setResponseCountries] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Per-country news — fetched on demand when a pin is clicked
  const [countryNews, setCountryNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);

  useEffect(() => {
    fetch("/api/outbreak")
      .then((r) => r.json())
      .then((data) => {
        setOutbreak(data.outbreak);
        setByLocation(data.byLocation ?? []);
        setResponseCountries(data.responseCountries ?? []);
        setLastUpdated(data.generatedAt);
        setLoading(false);
      });
  }, []);

  const handleLocationClick = async (loc: LocationData) => {
    setSelectedLocation(loc);
    setCountryNews([]);
    setNewsLoading(true);
    try {
      const res = await fetch(`/api/news?country=${encodeURIComponent(loc.location)}`);
      const data = await res.json();
      setCountryNews(data.items ?? []);
    } catch {
      setCountryNews([]);
    } finally {
      setNewsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white">
      {/* Header */}
      <div className="px-6 py-3 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <h1 className="text-lg font-bold tracking-tight">Hantavirus Tracker</h1>
          <span className="text-xs text-gray-400">MV Hondius · Andes Virus · 2026</span>
        </div>
        <div className="flex items-center gap-3">
          {outbreak?.as_of && (
            <span className="text-xs text-gray-500">
              WHO data as of {outbreak.as_of}
            </span>
          )}
          <span className="text-xs text-gray-500">Source: WHO DON600 + Google News</span>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 border-b border-zinc-800">
        {[
          { label: "Confirmed", value: outbreak?.cases_confirmed ?? "—", color: "text-orange-400" },
          { label: "Probable", value: outbreak?.cases_suspected ?? "—", color: "text-yellow-400" },
          { label: "Deaths", value: outbreak?.deaths ?? "—", color: "text-red-500" },
          { label: "Response Countries", value: responseCountries.length || "—", color: "text-blue-400" },
        ].map((stat) => (
          <div key={stat.label} className="px-6 py-3 bg-zinc-950 border-r border-zinc-800 last:border-r-0">
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Map */}
        <div className="flex-1 relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
              <div className="text-gray-500 text-sm">Loading WHO data...</div>
            </div>
          )}
          <Map byLocation={byLocation} onLocationClick={handleLocationClick} />
        </div>

        {/* Sidebar */}
        {selectedLocation && (
          <div className="w-80 bg-zinc-950 border-l border-zinc-800 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-zinc-800">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">{selectedLocation.location}</h2>
                <button
                  onClick={() => setSelectedLocation(null)}
                  className="text-gray-500 hover:text-white text-xl leading-none"
                >
                  ×
                </button>
              </div>

              {/* WHO case stats */}
              {selectedLocation.total > 0 ? (
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[
                    { label: "Confirmed", value: selectedLocation.confirmed, color: "text-orange-400" },
                    { label: "Probable", value: selectedLocation.probable, color: "text-yellow-400" },
                    { label: "Deaths", value: selectedLocation.deaths, color: "text-red-500" },
                    { label: "Critical", value: selectedLocation.critical, color: "text-red-400" },
                    { label: "Hospitalized", value: selectedLocation.hospitalized, color: "text-blue-400" },
                    { label: "Total", value: selectedLocation.total, color: "text-white" },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-zinc-900 rounded-lg p-2">
                      <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
                      <div className="text-xs text-gray-500 uppercase">{stat.label}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-zinc-900 rounded-lg p-3 mb-3 text-xs text-zinc-400">
                  No confirmed cases here — part of WHO coordinated response.
                </div>
              )}

              {/* WHO response badge */}
              {responseCountries.includes(selectedLocation.location) && (
                <div className="flex items-center gap-2 text-xs text-green-400 bg-green-400/10 rounded px-2 py-1">
                  <span>✓</span>
                  <span>Active WHO response country</span>
                </div>
              )}
            </div>

            {/* WHO case detail cards */}
            {selectedLocation.cases && selectedLocation.cases.length > 0 && (
              <div className="p-5 border-b border-zinc-800">
                <h3 className="text-xs uppercase text-gray-500 tracking-wide mb-3">
                  WHO Case Details
                </h3>
                <div className="flex flex-col gap-2">
                  {selectedLocation.cases.map((c) => (
                    <div key={c.id} className="bg-zinc-900 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-gray-300">
                          Case {c.id} · {c.role}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          c.outcome === "deceased" ? "bg-red-900 text-red-300" :
                          c.outcome === "critical" ? "bg-orange-900 text-orange-300" :
                          c.outcome === "hospitalized" ? "bg-blue-900 text-blue-300" :
                          "bg-gray-700 text-gray-300"
                        }`}>
                          {c.outcome}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 leading-snug">{c.notes}</div>
                      <div className="text-xs text-gray-600 mt-1">Onset: {c.onsetDate}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* News — fetched on demand */}
            <div className="p-5 flex-1 overflow-y-auto">
              <h3 className="text-xs uppercase text-gray-500 tracking-wide mb-3">
                Latest News
              </h3>
              {newsLoading ? (
                <div className="text-xs text-gray-600">Loading news...</div>
              ) : countryNews.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {countryNews.map((item, i) => (
                    <a
                      key={i}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-zinc-900 rounded-lg p-3 hover:bg-zinc-800 transition-colors"
                    >
                      <div className="text-xs text-blue-400 mb-1">{item.outlet}</div>
                      <div className="text-sm text-gray-200 leading-snug">{item.title}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {item.publishedAt
                          ? new Date(item.publishedAt).toLocaleDateString()
                          : ""}
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-gray-600">No news found for this country.</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="px-6 py-2 bg-zinc-950 border-t border-zinc-800 flex items-center gap-6">
        <span className="text-xs text-gray-500">Pin color (WHO data):</span>
        {[
          { color: "#dc2626", label: "Deaths" },
          { color: "#ea580c", label: "Critical" },
          { color: "#f97316", label: "Confirmed" },
          { color: "#eab308", label: "Probable" },
          { color: "#4b5563", label: "Response only" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-xs text-gray-400">{item.label}</span>
          </div>
        ))}
        <span className="text-xs text-gray-600 ml-auto">
          Pin size = case count · Click for details + live news
        </span>
      </div>
    </div>
  );
}
