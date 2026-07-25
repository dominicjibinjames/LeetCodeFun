"use client";

import { useCallback, useState } from "react";
import { BuildingListWithDebug } from "@/components/map/BuildingListWithDebug";
import { DistrictMapWithDebug } from "@/components/map/DistrictMapWithDebug";
import type { BuildingProblem } from "@/components/map/DistrictMap";
import type { BuildingSlot } from "@/data/districts";

type Props = {
  districtId: string;
  image: string;
  districtName: string;
  buildings: BuildingSlot[];
  problems: BuildingProblem[];
};

export function DistrictView(props: Props) {
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);

  const onHoverSlot = useCallback((slot: string | null) => {
    setHoveredSlot(slot);
  }, []);

  return (
    <>
      <DistrictMapWithDebug
        districtId={props.districtId}
        image={props.image}
        districtName={props.districtName}
        buildings={props.buildings}
        problems={props.problems}
        hoveredSlot={hoveredSlot}
        onHoverSlot={onHoverSlot}
      />

      <div className="panel">
        <h2 className="font-display text-lg mb-3">Buildings</h2>
        <BuildingListWithDebug
          districtId={props.districtId}
          problems={props.problems}
          hoveredSlot={hoveredSlot}
          onHoverSlot={onHoverSlot}
        />
      </div>
    </>
  );
}
