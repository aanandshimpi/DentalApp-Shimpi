"use client";

import { useEffect, useRef } from "react";
import { paintTooth } from "@/lib/tooth-mesh";

export function ToothModel({ tooth, angle = -22, large = false }: {
  tooth: string; angle?: number; large?: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const context = canvas.current?.getContext("2d");
    if (context) paintTooth(context, tooth, angle, large);
  }, [tooth, angle, large]);
  return <canvas ref={canvas} className={large ? "tooth-model-large" : "tooth-model"} aria-hidden="true"
    width={large ? 380 : 84} height={large ? 300 : 120} />;
}
