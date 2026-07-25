"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useDebug } from "@/components/debug/DebugProvider";
import type { DistrictDefinition } from "@/data/districts";
import { polygonCentroid, polygonToSvgPoints } from "@/data/districts/kingdom-polygons";
import { useDamageHoverSfx } from "@/hooks/useMapSfx";
import { unlockAudio, type DamageSfxKind } from "@/lib/map-sfx";

export type DistrictStats = {
  id: string;
  name: string;
  mastery: number;
  hasSmoke: boolean;
  hasRubble?: boolean;
  hasInvaders?: boolean;
  locked?: boolean;
  built: number;
  total: number;
};

type Props = {
  districts: DistrictDefinition[];
  stats: DistrictStats[];
  morale: number;
};

function masteryFill(mastery: number, hovered: boolean, locked: boolean): string {
  if (locked) return "rgba(40, 36, 32, 0.45)";
  if (hovered) return "rgba(212, 168, 75, 0.42)";
  if (mastery <= 0) return "rgba(25, 40, 28, 0.22)";
  if (mastery < 0.4) return "rgba(120, 80, 30, 0.12)";
  if (mastery < 0.8) return "rgba(180, 150, 70, 0.05)";
  return "rgba(80, 160, 100, 0.14)";
}

function masteryStroke(mastery: number, hovered: boolean, locked: boolean): string {
  if (locked) return "rgba(120, 110, 100, 0.35)";
  if (hovered) return "rgba(255, 224, 150, 0.98)";
  if (mastery <= 0) return "rgba(190, 180, 150, 0.2)";
  if (mastery >= 0.8) return "rgba(230, 200, 110, 0.6)";
  return "rgba(210, 185, 130, 0.3)";
}

export function KingdomMap({ districts, stats, morale }: Props) {
  const router = useRouter();
  const { districtOnFire, districtOnRubble } = useDebug();
  const byId = Object.fromEntries(stats.map((s) => [s.id, s]));
  const brightness = 0.65 + morale * 0.45;
  const saturate = 0.55 + morale * 0.55;
  const sepia = (1 - morale) * 0.35;
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const hoveredStats = hoveredId ? byId[hoveredId] ?? null : null;
  const hoveredDamageKind: DamageSfxKind | null = (() => {
    if (!hoveredId || !hoveredStats || hoveredStats.locked) return null;
    const onFire = districtOnFire(hoveredId, Boolean(hoveredStats.hasSmoke));
    const onRubble = districtOnRubble(hoveredId, Boolean(hoveredStats.hasRubble));
    if (onRubble) return "rubble";
    if (onFire) return "fire";
    if (hoveredStats.hasInvaders) return "battle";
    return null;
  })();
  useDamageHoverSfx(hoveredDamageKind);

  return (
    <div className="map-frame relative w-full">
      <div
        className="relative w-full"
        style={{
          filter: `brightness(${brightness}) saturate(${saturate}) sepia(${sepia})`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/art/kingdom/kingdom-map.png"
          alt="Kingdom of Patterngard"
          className="block w-full h-auto select-none"
          draggable={false}
        />

        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          role="group"
          aria-label="District territories"
        >
          <defs>
            <filter id="district-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="0.85" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {districts.map((d) => {
            const s = byId[d.id];
            const mastery = s?.mastery ?? 0;
            const locked = Boolean(s?.locked);
            const hovered = hoveredId === d.id;
            const points = polygonToSvgPoints(d.kingdomPolygon);
            const onFire = !locked && districtOnFire(d.id, Boolean(s?.hasSmoke));
            const onRubble = !locked && districtOnRubble(d.id, Boolean(s?.hasRubble));
            const label = locked
              ? `${d.name}, locked — complete previous patterns first`
              : `${d.name}, ${s ? Math.round(mastery * 100) : 0}% mastered${
                  onFire ? ", on fire" : s?.hasInvaders ? ", invaders" : ""
                }`;

            return (
              <g
                key={d.id}
                role={locked ? "img" : "link"}
                tabIndex={locked ? -1 : 0}
                aria-label={label}
                className={locked ? "cursor-not-allowed outline-none" : "cursor-pointer outline-none"}
                onMouseEnter={() => {
                  void unlockAudio();
                  setHoveredId(d.id);
                }}
                onMouseLeave={() => setHoveredId(null)}
                onFocus={() => setHoveredId(d.id)}
                onBlur={() => setHoveredId(null)}
                onClick={() => {
                  if (locked) return;
                  router.push(`/district/${d.id}`);
                }}
                onKeyDown={(e) => {
                  if (locked) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(`/district/${d.id}`);
                  }
                }}
              >
                <polygon
                  points={points}
                  fill={masteryFill(mastery, hovered, locked)}
                  stroke={masteryStroke(mastery, hovered, locked)}
                  strokeWidth={hovered && !locked ? 0.65 : 0.3}
                  strokeLinejoin="round"
                  filter={hovered && !locked ? "url(#district-glow)" : undefined}
                  className="transition-[fill,stroke-width] duration-200"
                  opacity={locked ? 0.55 : 1}
                />
              </g>
            );
          })}
        </svg>

        {districts.map((d) => {
          const s = byId[d.id];
          if (s?.locked) return null;
          const [cx, cy] = polygonCentroid(d.kingdomPolygon);
          const onFire = districtOnFire(d.id, Boolean(s?.hasSmoke));
          const onRubble = districtOnRubble(d.id, Boolean(s?.hasRubble));
          const onInvade = Boolean(s?.hasInvaders) && !onFire && !onRubble;
          if (!onFire && !onRubble && !onInvade) return null;
          return (
            <div
              key={`fx-${d.id}`}
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[80%]"
              style={{ left: `${cx}%`, top: `${cy}%` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  onFire
                    ? "/art/overlays/fire.png?v=parchment1"
                    : onInvade
                      ? "/art/overlays/battle.png?v=parchment2"
                      : "/art/overlays/rubble.png?v=parchment1"
                }
                alt=""
                draggable={false}
                className={`object-contain ${
                  onFire
                    ? "building-fire-sprite h-8 w-8 sm:h-9 sm:w-9"
                    : onInvade
                      ? "building-invaders-sprite h-8 w-8 sm:h-9 sm:w-9"
                      : "building-rubble-sprite h-7 w-7 opacity-95 sm:h-8 sm:w-8"
                }`}
              />
            </div>
          );
        })}

        {hoveredId &&
          (() => {
            const d = districts.find((x) => x.id === hoveredId);
            const s = byId[hoveredId];
            if (!d) return null;
            const [cx, cy] = polygonCentroid(d.kingdomPolygon);
            const locked = Boolean(s?.locked);
            const onFire = !locked && districtOnFire(d.id, Boolean(s?.hasSmoke));
            const onRubble = !locked && districtOnRubble(d.id, Boolean(s?.hasRubble));
            return (
              <div
                className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-[110%]"
                style={{ left: `${cx}%`, top: `${cy}%` }}
              >
                <div className="rounded bg-[#2a2118]/94 px-2.5 py-1.5 text-center shadow-lg ring-1 ring-[#c9a86a]/55">
                  <div className="font-display text-[11px] text-[#f3e6c8] whitespace-nowrap">
                    {d.name}
                  </div>
                  <div className="text-[10px] text-[#d4c4a0]">
                    {locked
                      ? "Complete previous pattern to unlock"
                      : `${s ? Math.round(s.mastery * 100) : 0}% mastered${
                          onFire
                            ? " · fire"
                            : onRubble
                              ? " · rubble"
                              : s?.hasInvaders
                                ? " · invaders"
                                : ""
                        }`}
                  </div>
                </div>
              </div>
            );
          })()}
      </div>
    </div>
  );
}
