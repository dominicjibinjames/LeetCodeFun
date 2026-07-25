"use client";

import { useMemo, useState } from "react";
import { DISTRICTS } from "@/data/districts";
import {
  KINGDOM_POLYGONS,
  polygonToSvgPoints,
  type Point,
} from "@/data/districts/kingdom-polygons";

/**
 * Dev helper: click the map to retrace district polygons along painted borders.
 * Visit /map-calibrate while logged in.
 */
export default function MapCalibratePage() {
  const districtIds = DISTRICTS.map((d) => d.id);
  const [activeId, setActiveId] = useState(districtIds[0]);
  const [drafts, setDrafts] = useState<Record<string, Point[]>>(() =>
    Object.fromEntries(
      Object.entries(KINGDOM_POLYGONS).map(([id, pts]) => [id, [...pts]]),
    ),
  );

  const activePoints = drafts[activeId] ?? [];
  const exportJson = useMemo(() => {
    const lines = Object.entries(drafts).map(([id, pts]) => {
      const body = pts.map(([x, y]) => `    [${x}, ${y}]`).join(",\n");
      return `  ${id}: [\n${body},\n  ]`;
    });
    return `export const KINGDOM_POLYGONS: Record<string, Point[]> = {\n${lines.join(",\n")},\n};\n`;
  }, [drafts]);

  function onMapClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Number((((e.clientX - rect.left) / rect.width) * 100).toFixed(1));
    const y = Number((((e.clientY - rect.top) / rect.height) * 100).toFixed(1));
    setDrafts((prev) => ({
      ...prev,
      [activeId]: [...(prev[activeId] ?? []), [x, y]],
    }));
  }

  function undo() {
    setDrafts((prev) => ({
      ...prev,
      [activeId]: (prev[activeId] ?? []).slice(0, -1),
    }));
  }

  function clearActive() {
    setDrafts((prev) => ({ ...prev, [activeId]: [] }));
  }

  function resetActive() {
    setDrafts((prev) => ({
      ...prev,
      [activeId]: [...(KINGDOM_POLYGONS[activeId] ?? [])],
    }));
  }

  async function copyExport() {
    await navigator.clipboard.writeText(exportJson);
    alert("Copied polygon TypeScript to clipboard — paste into kingdom-polygons.ts");
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-display">Map calibrate</h1>
        <p className="text-sm text-[var(--ink-muted)] mt-1 max-w-2xl">
          Select a district, then click along its painted white border. Undo/clear as needed.
          Copy the export into <code>data/districts/kingdom-polygons.ts</code>.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {DISTRICTS.map((d) => (
          <button
            key={d.id}
            type="button"
            className={`btn-ghost text-xs ${activeId === d.id ? "ring-2 ring-[var(--ember)]" : ""}`}
            onClick={() => setActiveId(d.id)}
          >
            {d.name} ({(drafts[d.id] ?? []).length})
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-ghost" onClick={undo}>
          Undo point
        </button>
        <button type="button" className="btn-ghost" onClick={clearActive}>
          Clear district
        </button>
        <button type="button" className="btn-ghost" onClick={resetActive}>
          Reset district
        </button>
        <button type="button" className="btn-primary" onClick={copyExport}>
          Copy all polygons
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
          src="/art/kingdom/kingdom-map.png"
          alt="Calibrate kingdom map"
          className="block w-full h-auto pointer-events-none"
          draggable={false}
        />
        <svg
          className="absolute inset-0 h-full w-full pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {Object.entries(drafts).map(([id, pts]) => {
            if (pts.length < 2) return null;
            const isActive = id === activeId;
            return (
              <polygon
                key={id}
                points={polygonToSvgPoints(pts)}
                fill={isActive ? "rgba(212,168,75,0.35)" : "rgba(100,100,100,0.08)"}
                stroke={isActive ? "rgba(255,220,140,0.95)" : "rgba(255,255,255,0.25)"}
                strokeWidth={isActive ? 0.5 : 0.2}
              />
            );
          })}
          {activePoints.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={0.7} fill="#c45c26" />
          ))}
        </svg>
      </div>

      <p className="text-xs text-[var(--ink-muted)]">
        Active: <strong>{activeId}</strong> — {activePoints.length} points. Right-click = undo.
      </p>
    </div>
  );
}
