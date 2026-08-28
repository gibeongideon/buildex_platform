"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { CountyDemand } from "@/lib/data";

/*
  Where the material went, on a map of Kenya.

  Counties are plotted at their real approximate centroids and drawn as
  proportional symbols. Deliberately not a choropleth: filling county polygons
  needs boundary data we do not have, and hand-drawing 47 borders would put
  invented geography on screen and call it Kenya. A centroid is a fact we can
  state; a boundary we sketched would not be.

  The trade is honest and it survives the cutover — the same lat/lng feed a real
  GIS layer later without the numbers underneath changing.

  It is decorative for assistive technology. Everything the map encodes is in
  the ranked table beside it, which is the precise, readable version; a screen
  reader gets that rather than 47 unlabelled circles.
*/

/** Approximate county centroids. Degrees, WGS84. */
const CENTROIDS: Record<string, [lat: number, lng: number]> = {
  Nairobi: [-1.29, 36.82],
  Kiambu: [-1.03, 36.86],
  Machakos: [-1.52, 37.26],
  Kajiado: [-2.1, 36.78],
  "Murang'a": [-0.72, 37.15],
  Nyeri: [-0.42, 36.95],
  Kirinyaga: [-0.5, 37.28],
  Nyandarua: [-0.18, 36.37],
  Mombasa: [-4.05, 39.66],
  Kilifi: [-3.51, 39.85],
  Kwale: [-4.18, 39.32],
  Lamu: [-2.27, 40.9],
  "Taita Taveta": [-3.4, 38.35],
  "Tana River": [-1.5, 39.6],
  Embu: [-0.53, 37.45],
  Kitui: [-1.37, 38.01],
  Makueni: [-1.8, 37.62],
  Meru: [0.05, 37.65],
  "Tharaka Nithi": [-0.3, 37.9],
  Isiolo: [0.35, 38.5],
  Marsabit: [2.33, 37.98],
  Garissa: [-0.45, 39.65],
  Wajir: [1.75, 40.06],
  Mandera: [3.55, 41.0],
  Kisumu: [-0.09, 34.77],
  Siaya: [0.06, 34.29],
  "Homa Bay": [-0.53, 34.46],
  Migori: [-1.06, 34.47],
  Kisii: [-0.68, 34.77],
  Nyamira: [-0.57, 34.94],
  Nakuru: [-0.3, 36.07],
  "Uasin Gishu": [0.52, 35.27],
  Kericho: [-0.37, 35.28],
  Bomet: [-0.78, 35.34],
  Nandi: [0.18, 35.1],
  Baringo: [0.47, 35.97],
  Laikipia: [0.2, 36.78],
  Narok: [-1.09, 35.87],
  "Trans Nzoia": [1.02, 34.95],
  "Elgeyo Marakwet": [0.8, 35.48],
  "West Pokot": [1.62, 35.2],
  Samburu: [1.22, 37.1],
  Turkana: [3.12, 35.6],
  Kakamega: [0.28, 34.75],
  Bungoma: [0.57, 34.56],
  Vihiga: [0.08, 34.72],
  Busia: [0.46, 34.11],
};

/** Kenya's bounding box, with a little air around it. */
const BOUNDS = { minLng: 33.8, maxLng: 41.9, minLat: -4.8, maxLat: 5.2 };

const VIEW = { width: 320, height: 380 };

function project(lat: number, lng: number) {
  const x =
    ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * VIEW.width;
  // Latitude increases north, y increases down.
  const y =
    ((BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * VIEW.height;
  return { x, y };
}

export function CountyMap({
  rows,
  onSelect,
  selected,
  className,
}: {
  rows: CountyDemand[];
  onSelect?: (county: string | null) => void;
  selected?: string | null;
  className?: string;
}) {
  const byCounty = new Map(rows.map((row) => [row.county, row]));
  const [hovered, setHovered] = React.useState<string | null>(null);
  const active = hovered ?? selected ?? null;
  const activeRow = active ? byCounty.get(active) : undefined;

  /*
    Every county is drawn, not just the ones with deliveries — the empty ones
    are the point. A supplier looking at this needs to see where they are
    absent as clearly as where they are strong.
  */
  const points = Object.entries(CENTROIDS).map(([county, [lat, lng]]) => {
    const row = byCounty.get(county);
    const intensity = row?.intensity ?? 0;
    return {
      county,
      row,
      intensity,
      ...project(lat, lng),
      // Area, not radius, tracks the value — a radius ramp overstates the top.
      radius: 3.5 + Math.sqrt(intensity) * 12,
    };
  });

  return (
    <div className={cn("relative", className)}>
      <svg
        viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
        className="w-full"
        role="presentation"
      >
        {points.map((point) => {
          const isActive = active === point.county;
          const hasDemand = point.intensity > 0;
          return (
            <g key={point.county}>
              <circle
                cx={point.x}
                cy={point.y}
                r={point.radius}
                className={cn(
                  "transition-opacity",
                  hasDemand ? "fill-brand" : "fill-border-strong",
                )}
                opacity={hasDemand ? 0.25 + point.intensity * 0.6 : 0.35}
              />
              {isActive ? (
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={point.radius + 3}
                  className="fill-none stroke-price"
                  strokeWidth="2"
                />
              ) : null}
              {/*
                A generous invisible target: the drawn circle for a quiet county
                is four pixels across, which nothing can hit with a mouse.
              */}
              <circle
                cx={point.x}
                cy={point.y}
                r={Math.max(point.radius, 9)}
                fill="transparent"
                className={onSelect ? "cursor-pointer" : undefined}
                onMouseEnter={() => setHovered(point.county)}
                onMouseLeave={() => setHovered(null)}
                onClick={() =>
                  onSelect?.(selected === point.county ? null : point.county)
                }
              />
            </g>
          );
        })}
      </svg>

      {/*
        The readout sits in flow rather than following the cursor: a tooltip
        pinned to a 4px circle is a fight, and the value is easier to compare
        when it always appears in the same place.
      */}
      <div className="mt-2 min-h-[2.75rem] rounded-md border border-border bg-surface-muted px-3 py-2">
        {activeRow ? (
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{activeRow.county}</span>
            <span className="mx-1.5" aria-hidden="true">
              ·
            </span>
            <span className="text-numeric text-price font-semibold">
              KSh {Math.round(activeRow.valueKsh).toLocaleString("en-KE")}
            </span>
            <span className="mx-1.5" aria-hidden="true">
              ·
            </span>
            <span className="text-numeric">{activeRow.deliveries}</span> deliveries into{" "}
            {activeRow.region}
          </p>
        ) : active ? (
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{active}</span> — nothing
            delivered here yet.
          </p>
        ) : (
          <p className="text-xs text-subtle-foreground">
            Hover a county for its figures. Circle area is delivered value.
          </p>
        )}
      </div>
    </div>
  );
}
