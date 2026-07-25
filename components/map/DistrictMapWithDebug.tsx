"use client";

import { useMemo } from "react";
import { useDebug } from "@/components/debug/DebugProvider";
import { useDifficulty } from "@/components/difficulty/DifficultyProvider";
import { useTrack } from "@/components/track/TrackProvider";
import {
  DistrictMap,
  type BuildingProblem,
} from "@/components/map/DistrictMap";
import type { BuildingSlot } from "@/data/districts";
import { isQuestLocked } from "@/lib/quest-filters";

type Props = {
  districtId: string;
  image: string;
  districtName: string;
  buildings: BuildingSlot[];
  problems: BuildingProblem[];
  hoveredSlot?: string | null;
  onHoverSlot?: (slot: string | null) => void;
};

export function DistrictMapWithDebug(props: Props) {
  const { hoveredSlot, onHoverSlot, ...rest } = props;
  const { resolveState } = useDebug();
  const { mode: difficultyMode } = useDifficulty();
  const { mode: trackMode } = useTrack();
  const problems = useMemo(
    () =>
      props.problems.map((p) => ({
        ...p,
        state: resolveState(props.districtId, p.buildingSlot, p.state),
        locked: isQuestLocked(p, difficultyMode, trackMode),
      })),
    [props.problems, props.districtId, resolveState, difficultyMode, trackMode],
  );

  return (
    <DistrictMap
      {...rest}
      problems={problems}
      hoveredSlot={hoveredSlot}
      onHoverSlot={onHoverSlot}
    />
  );
}
