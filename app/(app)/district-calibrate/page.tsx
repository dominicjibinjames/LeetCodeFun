"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { DISTRICTS } from "@/data/districts";
import {
  DISTRICT_BUILDING_SILHOUETTES,
  type BuildingSilhouette,
} from "@/data/districts/building-silhouettes";
import { polygonToSvgPoints, type Point } from "@/data/districts/kingdom-polygons";

function CalibrateInner() {
  const search = useSearchParams();
  const initial = search.get("district") || DISTRICTS[0].id;
  const [districtId, setDistrictId] = useState(initial);
  const district = DISTRICTS.find((d) => d.id === districtId) ?? DISTRICTS[0];

  const [drafts, setDrafts] = useState<BuildingSilhouette[]>(() =>
    structuredClone(DISTRICT_BUILDING_SILHOUETTES[district.id] ?? []),
  );
  const [activeSlot, setActiveSlot] = useState(
    () => drafts[0]?.slot ?? district.buildings[0]?.slot ?? "slot_1",
  );

  // Reset drafts when switching district
  function selectDistrict(id: string) {
    setDistrictId(id);
    const next = structuredClone(DISTRICT_BUILDING_SILHOUETTES[id] ?? []);
    const d = DISTRICTS.find((x) => x.id === id);
    if (next.length === 0 && d) {
      // seed empty silhouettes from building slots
      const seeded = d.buildings.map((b, i) => ({
        slot: b.slot,
        landmark: `Building ${i + 1}`,
        silhouette: [] as Point[],
      }));
      setDrafts(seeded);
      setActiveSlot(seeded[0]?.slot ?? "");
    } else {
      setDrafts(next);
      setActiveSlot(next[0]?.slot ?? "");
    }
  }

  const active = drafts.find((d) => d.slot === activeSlot);

  const exportJson = useMemo(() => {
    const body = drafts
      .map((d) => {
        const pts = d.silhouette.map(([x, y]) => `        [${x}, ${y}]`).join(",\n");
        return `    {\n      slot: "${d.slot}",\n      landmark: "${d.landmark}",\n      silhouette: [\n${pts},\n      ],\n    }`;
      })
      .join(",\n");
    return `  ${districtId}: [\n${body},\n  ],`;
  }, [drafts, districtId]);

  function onMapClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Number((((e.clientX - rect.left) / rect.width) * 100).toFixed(1));
    const y = Number((((e.clientY - rect.top) / rect.height) * 100).toFixed(1));
    setDrafts((prev) =>
      prev.map((d) =>
        d.slot === activeSlot
          ? { ...d, silhouette: [...d.silhouette, [x, y] as Point] }
          : d,
      ),
    );
  }

  function undo() {
    setDrafts((prev) =>
      prev.map((d) =>
        d.slot === activeSlot
          ? { ...d, silhouette: d.silhouette.slice(0, -1) }
          : d,
      ),
    );
  }

  function clearActive() {
    setDrafts((prev) =>
      prev.map((d) => (d.slot === activeSlot ? { ...d, silhouette: [] } : d)),
    );
  }

  async function copyExport() {
    await navigator.clipboard.writeText(exportJson);
    alert("Copied — paste into DISTRICT_BUILDING_SILHOUETTES in building-silhouettes.ts");
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-display">District building calibrate</h1>
        <p className="text-sm text-[var(--ink-muted)] mt-1 max-w-2xl">
          Click around a building&apos;s outline (castle towers, roof edges, walls) so the
          highlight follows the real silhouette — not a box or oval.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {DISTRICTS.map((d) => (
          <button
            key={d.id}
            type="button"
            className={`btn-ghost text-xs ${districtId === d.id ? "ring-2 ring-[var(--ember)]" : ""}`}
            onClick={() => selectDistrict(d.id)}
          >
            {d.name}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {drafts.map((d) => (
          <button
            key={d.slot}
            type="button"
            className={`btn-ghost text-xs ${activeSlot === d.slot ? "ring-2 ring-[var(--gold)]" : ""}`}
            onClick={() => setActiveSlot(d.slot)}
          >
            {d.landmark || d.slot} ({d.silhouette.length})
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-ghost" onClick={undo}>
          Undo point
        </button>
        <button type="button" className="btn-ghost" onClick={clearActive}>
          Clear outline
        </button>
        <button type="button" className="btn-primary" onClick={copyExport}>
          Copy silhouettes
        </button>
      </div>

      <div
        className="map-frame relative w-full cursor-crosshair select-none"
        onClick={onMapClick}
        onContextMenu={(e) => {
          e.preventDefault();
          undo();
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={district.image}
          alt={district.name}
          className="block w-full h-auto pointer-events-none"
          draggable={false}
        />
        <svg
          className="absolute inset-0 h-full w-full pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {drafts.map((d) => {
            if (d.silhouette.length < 2) return null;
            const isActive = d.slot === activeSlot;
            return (
              <polygon
                key={d.slot}
                points={polygonToSvgPoints(d.silhouette)}
                fill={isActive ? "rgba(255,210,100,0.4)" : "rgba(100,180,120,0.12)"}
                stroke={isActive ? "rgba(255,230,150,0.95)" : "rgba(255,255,255,0.3)"}
                strokeWidth={isActive ? 0.45 : 0.2}
              />
            );
          })}
          {(active?.silhouette ?? []).map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={0.6} fill="#c45c26" />
          ))}
        </svg>
      </div>

      <p className="text-xs text-[var(--ink-muted)]">
        Tracing: <strong>{active?.landmark ?? activeSlot}</strong> —{" "}
        {active?.silhouette.length ?? 0} points. Right-click = undo.
      </p>
    </div>
  );
}

export default function DistrictCalibratePage() {
  return (
    <Suspense>
      <CalibrateInner />
    </Suspense>
  );
}
