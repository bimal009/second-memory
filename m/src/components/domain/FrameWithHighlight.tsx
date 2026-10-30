import React from "react";
import Svg, { Defs, LinearGradient, Rect, Circle, Polygon, Stop } from "react-native-svg";
import { chartColors, mediaColors } from "@/theme/tokens";
import type { Point } from "@/types";

/**
 * Deterministic generated frame placeholder ("thumbnail") — a gradient from
 * the chart palette rotated by seed + soft seeded circles. No remote images.
 */
export function GradientFrame({
  seed,
  aspect = 4 / 3,
  corners = 10,
}: {
  seed: number;
  aspect?: number;
  corners?: number;
}) {
  const W = 100;
  const H = 100 / aspect;
  const palette = chartColors;
  const a = palette[seed % palette.length]!;
  const b = palette[(seed + 2) % palette.length]!;
  const x1 = seed % 2 === 0 ? 0 : 0;
  const y1 = seed % 2 === 0 ? 0 : 1;
  const x2 = 1;
  const y2 = seed % 2 === 0 ? 1 : 0;

  const cx = 20 + (seed % 50);
  const cy = 15 + (seed % 40);

  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}>
      <Defs>
        <LinearGradient id={`grad-${seed}`} x1={x1} y1={y1} x2={x2} y2={y2}>
          <Stop offset="0" stopColor={a} />
          <Stop offset="1" stopColor={b} />
        </LinearGradient>
      </Defs>
      <Rect width={W} height={H} rx={corners} fill={`url(#grad-${seed})`} />
      <Circle cx={W - cx} cy={H - cy} r={18 + (seed % 12)} fill={mediaColors.decoLight} />
      <Circle cx={cx} cy={cy} r={10 + (seed % 8)} fill={mediaColors.decoDark} />
    </Svg>
  );
}

/**
 * Semi-transparent lime mask polygon overlay.
 * `mask` points are 0..1 relative to the frame, so the overlay scales
 * with any frame size.
 */
export function HighlightPolygon({
  mask,
  aspect = 4 / 3,
  stroke,
  fill,
}: {
  mask: Point[];
  aspect?: number;
  stroke: string;
  fill: string;
}) {
  const W = 100;
  const H = 100 / aspect;
  const pts = mask.map((p) => `${p.x * W},${p.y * H}`).join(" ");

  if (mask.length < 3) return null;

  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} pointerEvents="none">
      <Polygon
        points={pts}
        fill={fill}
        stroke={stroke}
        strokeWidth={1.2}
        strokeDasharray="4 3"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
