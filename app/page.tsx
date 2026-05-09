"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";

const Map = dynamic(() => import("./components/Map"), { ssr: false });

interface CountryData {
  name: string;
  lat: number;
  lng: number;
  confirmed: number;
  suspected: number;
  deaths: number;
  monitoring: number;
}

interface OutbreakData {
  cases_confirmed: number;
  cases_suspected: number;
  deaths: number;
  as_of: string;
  source: string;
}

interface NewsItem {
  title: string;
  outlet: string;
  url: string;
  publishedAt: string;
  snippet: string;
}

export default function Home() {
  const [selectedCountry, setSelectedCountry] = useState<CountryData | null>(
    null,
  );
  const [outbreak, setOutbreak] = useState<OutbreakData | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  useEffect(() => {
    fetch("/api/outbreak")
      .then((r) => r.json())
      .then((data) => {
        setOutbreak(data.outbreak);
        setLastUpdated(data.generatedAt);
      });

    fetch("/api/news")
      .then((r) => r.json())
      .then((data) => setNews(data.items.slice(0, 20)));
  }, []);

  const monitoring = 17;

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="px-6 py-3 bg-gray-900 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <h1 className="text-lg font-bold tracking-tight">
            Hantavirus Tracker
          </h1>
          <span className="text-xs text-gray-400">
            MV Hondius · Andes Virus · 2026
          </span>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-gray-500">
              Updated {new Date(lastUpdated).toUTCString()}
            </span>
          )}
          <span className="text-xs text-gray-500">Source: WHO DON599</span>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 border-b border-gray-800">
        {[
          {
            label: "Confirmed",
            value: outbreak?.cases_confirmed ?? "—",
            color: "text-orange-400",
          },
          {
            label: "Suspected",
            value: outbreak?.cases_suspected ?? "—",
            color: "text-yellow-400",
          },
          {
            label: "Deaths",
            value: outbreak?.deaths ?? "—",
            color: "text-red-500",
          },
          {
            label: "Monitoring",
            value: `${monitoring}+`,
            color: "text-blue-400",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="px-6 py-3 bg-gray-900 border-r border-gray-800 last:border-r-0"
          >
            <div className={`text-2xl font-bold ${stat.color}`}>
              {stat.value}
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Map */}
        <div className="flex-1 relative">
          <Map onCountryClick={setSelectedCountry} />
        </div>

        {/* Sidebar */}
        {selectedCountry && (
          <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col overflow-hidden">
            {/* Country header */}
            <div className="p-5 border-b border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">{selectedCountry.name}</h2>
                <button
                  onClick={() => setSelectedCountry(null)}
                  className="text-gray-500 hover:text-white text-xl leading-none"
                >
                  ×
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    label: "Confirmed",
                    value: selectedCountry.confirmed,
                    color: "text-orange-400",
                  },
                  {
                    label: "Suspected",
                    value: selectedCountry.suspected,
                    color: "text-yellow-400",
                  },
                  {
                    label: "Deaths",
                    value: selectedCountry.deaths,
                    color: "text-red-500",
                  },
                  {
                    label: "Monitoring",
                    value: selectedCountry.monitoring,
                    color: "text-blue-400",
                  },
                ].map((stat) => (
                  <div key={stat.label} className="bg-gray-800 rounded-lg p-3">
                    <div className={`text-xl font-bold ${stat.color}`}>
                      {stat.value}
                    </div>
                    <div className="text-xs text-gray-500 uppercase">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* News feed */}
            <div className="p-5 flex-1 overflow-y-auto">
              <h3 className="text-xs uppercase text-gray-500 tracking-wide mb-3">
                Latest News
              </h3>
              <div className="flex flex-col gap-3">
                {news
                  .filter(
                    (item) =>
                      item.title
                        .toLowerCase()
                        .includes(selectedCountry.name.toLowerCase()) ||
                      item.snippet
                        ?.toLowerCase()
                        .includes(selectedCountry.name.toLowerCase()),
                  )
                  .slice(0, 5)
                  .map((item, i) => (
                    <a
                      key={i}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-gray-800 rounded-lg p-3 hover:bg-gray-700 transition-colors"
                    >
                      <div className="text-xs text-blue-400 mb-1">
                        {item.outlet}
                      </div>
                      <div className="text-sm text-gray-200 leading-snug">
                        {item.title}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {item.publishedAt
                          ? new Date(item.publishedAt).toLocaleDateString()
                          : ""}
                      </div>
                    </a>
                  ))}
                {news.filter((item) =>
                  item.title
                    .toLowerCase()
                    .includes(selectedCountry.name.toLowerCase()),
                ).length === 0 && (
                  <p className="text-xs text-gray-600">
                    No specific news for this country.
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
