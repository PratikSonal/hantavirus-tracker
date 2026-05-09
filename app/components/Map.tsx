"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";

const COUNTRIES = [
  {
    name: "Netherlands",
    lat: 52.3,
    lng: 5.3,
    confirmed: 3,
    suspected: 1,
    deaths: 2,
    monitoring: 0,
  },
  {
    name: "Germany",
    lat: 51.2,
    lng: 10.4,
    confirmed: 1,
    suspected: 0,
    deaths: 1,
    monitoring: 0,
  },
  {
    name: "Switzerland",
    lat: 46.8,
    lng: 8.2,
    confirmed: 1,
    suspected: 0,
    deaths: 0,
    monitoring: 0,
  },
  {
    name: "United Kingdom",
    lat: 55.3,
    lng: -3.4,
    confirmed: 1,
    suspected: 1,
    deaths: 0,
    monitoring: 0,
  },
  {
    name: "South Africa",
    lat: -30.5,
    lng: 22.9,
    confirmed: 1,
    suspected: 0,
    deaths: 0,
    monitoring: 1,
  },
  {
    name: "Argentina",
    lat: -38.4,
    lng: -63.6,
    confirmed: 0,
    suspected: 0,
    deaths: 0,
    monitoring: 0,
  },
  {
    name: "Singapore",
    lat: 1.3,
    lng: 103.8,
    confirmed: 0,
    suspected: 1,
    deaths: 0,
    monitoring: 1,
  },
  {
    name: "USA",
    lat: 37.1,
    lng: -95.7,
    confirmed: 0,
    suspected: 0,
    deaths: 0,
    monitoring: 7,
  },
  {
    name: "Canada",
    lat: 56.1,
    lng: -106.3,
    confirmed: 0,
    suspected: 0,
    deaths: 0,
    monitoring: 2,
  },
];

interface CountryData {
  name: string;
  lat: number;
  lng: number;
  confirmed: number;
  suspected: number;
  deaths: number;
  monitoring: number;
}

interface MapProps {
  onCountryClick: (country: CountryData) => void;
}

export default function Map({ onCountryClick }: MapProps) {
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require("leaflet");
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "/leaflet/marker-icon-2x.png",
      iconUrl: "/leaflet/marker-icon.png",
      shadowUrl: "/leaflet/marker-shadow.png",
    });
  }, []);

  const getRadius = (country: CountryData) => {
    const total = country.confirmed + country.suspected + country.monitoring;
    return Math.max(8, total * 4);
  };

  const getColor = (country: CountryData) => {
    if (country.deaths > 0) return "#dc2626";
    if (country.confirmed > 0) return "#ea580c";
    if (country.suspected > 0) return "#eab308";
    return "#3b82f6";
  };

  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {COUNTRIES.map((country) => (
        <CircleMarker
          key={country.name}
          center={[country.lat, country.lng]}
          radius={getRadius(country)}
          fillColor={getColor(country)}
          color="#fff"
          weight={2}
          fillOpacity={0.8}
          eventHandlers={{
            click: () => onCountryClick(country),
          }}
        >
          <Popup>{country.name}</Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
