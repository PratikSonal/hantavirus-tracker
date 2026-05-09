"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";

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
}

interface MapProps {
  byLocation: LocationData[];
  onLocationClick: (location: LocationData) => void;
}

export default function Map({ byLocation, onLocationClick }: MapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Fix Leaflet default icon paths in Next.js
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require("leaflet");
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "/leaflet/marker-icon-2x.png",
      iconUrl: "/leaflet/marker-icon.png",
      shadowUrl: "/leaflet/marker-shadow.png",
    });
    setMounted(true);
  }, []);

  const getRadius = (loc: LocationData): number => {
    if (loc.total === 0) return 6;
    return Math.max(10, loc.total * 10);
  };

  const getColor = (loc: LocationData): string => {
    if (loc.total === 0) return "#4b5563";
    if (loc.deaths > 0) return "#dc2626";
    if (loc.critical > 0) return "#ea580c";
    if (loc.confirmed > 0) return "#f97316";
    return "#eab308";
  };

  const getPopup = (loc: LocationData): string => {
    if (loc.total === 0) return `${loc.location} — WHO response country`;
    return `${loc.location} — ${loc.total} case${loc.total !== 1 ? "s" : ""}`;
  };

  const plottable = byLocation.filter((l) => l.lat !== null && l.lng !== null);

  if (!mounted) return null;

  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      style={{ height: "100%", width: "100%" }}
      zoomControl={false}
      scrollWheelZoom={true}
      worldCopyJump={false}
      minZoom={2}
      maxZoom={8}
      maxBounds={[[-85, -180], [85, 180]]}
      maxBoundsViscosity={1.0}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxNativeZoom={19}
        keepBuffer={4}
      />
      {plottable.map((loc) => (
        <CircleMarker
          key={loc.location}
          center={[loc.lat!, loc.lng!]}
          radius={getRadius(loc)}
          fillColor={getColor(loc)}
          color="#fff"
          weight={2}
          fillOpacity={0.8}
          eventHandlers={{
            click: () => onLocationClick(loc),
          }}
        >
          <Tooltip>{getPopup(loc)}</Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
