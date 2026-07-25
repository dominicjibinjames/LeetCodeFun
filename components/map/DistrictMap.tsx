"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { BuildingSlot } from "@/data/districts";
import {
  silhouetteBounds,
  silhouettesForDistrict,
} from "@/data/districts/building-silhouettes";
import { polygonToSvgPoints } from "@/data/districts/kingdom-polygons";
import { useBuildingDamageHoverSfx } from "@/hooks/useMapSfx";
import { unlockAudio } from "@/lib/map-sfx";

const FIRE_SRC = "/art/overlays/fire.png";
const RUBBLE_SRC = "/art/overlays/rubble.png";
const BATTLE_SRC = "/art/overlays/battle.png";

export type BuildingProblem = {
  id: string;
  title: string;
  buildingSlot: string;
  state: string;
  difficulty: string;
  tracks?: string[];
  /** When true, shown but not enterable under current difficulty/track filters */
  locked?: boolean;
  /** Today's daily conquest — show invaders overlay while still unattempted */
  invaded?: boolean;
};

type Props = {
  districtId: string;
  image: string;
  districtName: string;
  buildings: BuildingSlot[];
  problems: BuildingProblem[];
  /** Shared hover with buildings list (controlled). */
  hoveredSlot?: string | null;
  onHoverSlot?: (slot: string | null) => void;
};

function stateColors(state: string, hovered: boolean, unlocked: boolean) {
  if (hovered && unlocked) {
    return {
      fill: "rgba(255, 210, 100, 0.35)",
      stroke: "rgba(255, 236, 170, 1)",
      strokeWidth: 0.5,
    };
  }
  const bright = unlocked ? 1 : 0.55;
  switch (state) {
    case "fire":
      return {
        fill: "rgba(196, 92, 38, 0.1)",
        stroke: `rgba(255, 150, 70, ${0.55 * bright + (unlocked ? 0.25 : 0)})`,
        strokeWidth: unlocked ? 0.36 : 0.22,
      };
    case "rubble":
      return {
        fill: "rgba(90, 85, 80, 0.12)",
        stroke: `rgba(180, 165, 140, ${0.55 * bright + (unlocked ? 0.2 : 0)})`,
        strokeWidth: unlocked ? 0.34 : 0.22,
      };
    case "built":
      return {
        fill: "rgba(80, 160, 100, 0.2)",
        stroke: `rgba(170, 230, 180, ${0.55 * bright + (unlocked ? 0.25 : 0)})`,
        strokeWidth: unlocked ? 0.36 : 0.22,
      };
    default:
      return {
        fill: unlocked ? "rgba(255, 248, 220, 0.08)" : "rgba(255, 255, 255, 0.02)",
        stroke: unlocked
          ? "rgba(232, 205, 130, 0.85)"
          : "rgba(255, 255, 255, 0.18)",
        strokeWidth: unlocked ? 0.34 : 0.2,
      };
  }
}

export function DistrictMap({
  districtId,
  image,
  districtName,
  buildings,
  problems,
  hoveredSlot: hoveredSlotProp,
  onHoverSlot,
}: Props) {
  const router = useRouter();
  const bySlot = useMemo(
    () => Object.fromEntries(problems.map((p) => [p.buildingSlot, p])),
    [problems],
  );
  const silhouettes = useMemo(() => silhouettesForDistrict(districtId), [districtId]);
  const silhouetteMap = useMemo(
    () => Object.fromEntries(silhouettes.map((s) => [s.slot, s])),
    [silhouettes],
  );
  const [localHoveredSlot, setLocalHoveredSlot] = useState<string | null>(null);
  const hoveredSlot = hoveredSlotProp !== undefined ? hoveredSlotProp : localHoveredSlot;
  const setHoveredSlot = onHoverSlot ?? setLocalHoveredSlot;

  const hoveredProblem = hoveredSlot ? bySlot[hoveredSlot] : null;
  const hoveredSil = hoveredSlot ? silhouetteMap[hoveredSlot] : null;
  useBuildingDamageHoverSfx(hoveredProblem);

  const damageFx = useMemo(() => {
    return buildings.flatMap((b) => {
      const problem = bySlot[b.slot];
      if (!problem) return [];
      const sil = silhouetteMap[b.slot];
      if (!sil || sil.silhouette.length < 3) return [];

      // Priority: rubble > fire > invaders
      let overlay: "rubble" | "fire" | "invaders" | null = null;
      if (problem.state === "rubble") overlay = "rubble";
      else if (problem.state === "fire") overlay = "fire";
      else if (problem.invaded && problem.state === "unattempted") overlay = "invaders";
      if (!overlay) return [];

      const bounds = silhouetteBounds(sil.silhouette);
      const scale = overlay === "fire" ? 0.55 : overlay === "rubble" ? 0.7 : 0.62;
      const dim = Math.max(bounds.w, bounds.h) * scale;
      return [
        {
          key: b.slot,
          state: overlay,
          left: bounds.cx,
          top:
            overlay === "fire"
              ? bounds.cy - bounds.h * 0.2
              : overlay === "invaders"
                ? bounds.cy - bounds.h * 0.15
                : bounds.cy + bounds.h * 0.05,
          dim,
        },
      ];
    });
  }, [buildings, bySlot, silhouetteMap]);

  return (
    <div className="map-frame relative w-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image}
        alt={districtName}
        className="block w-full h-auto select-none"
        draggable={false}
      />

      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        role="group"
        aria-label={`${districtName} buildings`}
      >
        <defs>
          <filter id="building-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.7" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {buildings.map((b) => {
          const problem = bySlot[b.slot];
          if (!problem) return null;

          const sil = silhouetteMap[b.slot];
          const hovered = hoveredSlot === b.slot;
          const locked = Boolean(problem.locked);
          const colors = locked
            ? {
                fill: "rgba(90, 85, 80, 0.12)",
                stroke: "rgba(140, 130, 120, 0.35)",
                strokeWidth: 0.22,
              }
            : stateColors(problem.state, hovered, true);

          const open = () => {
            if (locked) return;
            router.push(`/problem/${problem.id}`);
          };

          if (!sil || sil.silhouette.length < 3) {
            const cx = b.x + b.w / 2;
            const cy = b.y + b.h / 2;
            return (
              <g
                key={b.slot}
                role={locked ? "img" : "link"}
                tabIndex={locked ? -1 : 0}
                aria-label={`${problem.title}, ${problem.state}${locked ? ", locked by current filters" : ""}`}
                className={locked ? "cursor-not-allowed outline-none opacity-45" : "cursor-pointer outline-none"}
                onMouseEnter={() => {
                  void unlockAudio();
                  setHoveredSlot(b.slot);
                }}
                onMouseLeave={() => setHoveredSlot(null)}
                onClick={open}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    open();
                  }
                }}
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r={hovered && !locked ? 1.8 : 1.3}
                  fill={
                    locked
                      ? "rgba(120,110,100,0.35)"
                      : hovered
                        ? "rgba(255,210,100,0.85)"
                        : "rgba(255,248,220,0.55)"
                  }
                  stroke="rgba(42,33,24,0.7)"
                  strokeWidth={0.25}
                />
              </g>
            );
          }

          const points = polygonToSvgPoints(sil.silhouette);

          return (
            <g
              key={b.slot}
              role={locked ? "img" : "link"}
              tabIndex={locked ? -1 : 0}
                aria-label={`${problem.title} (${sil.landmark}), ${problem.state}${locked ? ", locked by current filters" : ""}`}
              className={locked ? "cursor-not-allowed outline-none opacity-45" : "cursor-pointer outline-none"}
              onMouseEnter={() => {
                void unlockAudio();
                setHoveredSlot(b.slot);
              }}
              onMouseLeave={() => setHoveredSlot(null)}
              onFocus={() => {
                void unlockAudio();
                setHoveredSlot(b.slot);
              }}
              onBlur={() => setHoveredSlot(null)}
              onClick={open}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  open();
                }
              }}
            >
              <polygon
                points={points}
                fill={colors.fill}
                stroke={colors.stroke}
                strokeWidth={colors.strokeWidth}
                strokeLinejoin="round"
                filter={hovered && !locked ? "url(#building-glow)" : undefined}
                className="transition-[fill,stroke-width] duration-150"
              />
            </g>
          );
        })}
      </svg>

      <div className="pointer-events-none absolute inset-0 z-10">
        {damageFx.map((fx) => {
          const src =
            fx.state === "fire"
              ? `${FIRE_SRC}?v=parchment1`
              : fx.state === "invaders"
                ? `${BATTLE_SRC}?v=parchment2`
                : `${RUBBLE_SRC}?v=parchment1`;
          const cls =
            fx.state === "fire"
              ? "building-fire-sprite"
              : fx.state === "invaders"
                ? "building-invaders-sprite"
                : "building-rubble-sprite";
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={fx.key}
              src={src}
              alt=""
              draggable={false}
              className={`absolute -translate-x-1/2 -translate-y-1/2 object-contain ${cls}`}
              style={{
                left: `${fx.left}%`,
                top: `${fx.top}%`,
                width: `${fx.dim}%`,
                height: `${fx.dim}%`,
              }}
            />
          );
        })}
      </div>

      {hoveredProblem && hoveredSil && (
        <div
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-[120%]"
          style={{
            left: `${silhouetteBounds(hoveredSil.silhouette).cx}%`,
            top: `${silhouetteBounds(hoveredSil.silhouette).cy}%`,
          }}
        >
          <div className="rounded bg-[#2a2118]/94 px-2.5 py-1.5 text-center shadow-lg ring-1 ring-[#c9a86a]/55">
            <div className="font-display text-[11px] text-[#f3e6c8] whitespace-nowrap">
              {hoveredProblem.title}
            </div>
            <div className="text-[10px] text-[#d4c4a0]">{hoveredSil.landmark}</div>
            <div className="text-[9px] uppercase tracking-wide text-[#c9a86a]/90 mt-0.5">
              {hoveredProblem.difficulty}
              {hoveredProblem.locked ? " · locked" : ""}
              {hoveredProblem.invaded && hoveredProblem.state === "unattempted"
                ? " · invaders — battle today"
                : ""}
            </div>
          </div>
        </div>
      )}

      {silhouettes.length === 0 && (
        <p className="absolute bottom-2 left-2 right-2 text-center text-[10px] text-[#f3e6c8]/90 bg-[#2a2118]/70 rounded px-2 py-1">
          Building outlines not traced yet — use{" "}
          <a className="underline" href={`/district-calibrate?district=${districtId}`}>
            /district-calibrate
          </a>
        </p>
      )}
    </div>
  );
}
