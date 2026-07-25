"use client";

import Lottie from "lottie-react";
import { useEffect, useState } from "react";

const cache: Record<string, object> = {};

function useLottieJson(src: string) {
  const [data, setData] = useState<object | null>(cache[src] ?? null);

  useEffect(() => {
    let cancelled = false;
    if (cache[src]) {
      setData(cache[src]);
      return;
    }
    fetch(src)
      .then((r) => r.json())
      .then((json: object) => {
        cache[src] = json;
        if (!cancelled) setData(json);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [src]);

  return data;
}

type Props = {
  src: string;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
};

/** Plays a local Lottie JSON (Noto Animated Emoji pack). */
export function MapLottie({ src, className, style, title }: Props) {
  const data = useLottieJson(src);
  if (!data) {
    return <div className={className} style={style} aria-hidden />;
  }
  return (
    <div className={className} style={style} title={title} aria-hidden>
      <Lottie animationData={data} loop autoplay className="h-full w-full" />
    </div>
  );
}

export const FIRE_LOTTIE = "/lottie/fire.json";
export const RUBBLE_LOTTIE = "/lottie/rubble.json";
