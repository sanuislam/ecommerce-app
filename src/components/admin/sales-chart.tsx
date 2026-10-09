"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Point = { day: string; orders: number; sales: number };

const money = (n: number) => `৳${Math.round(n).toLocaleString("en-IN")}`;
const short = (n: number) =>
  n >= 100_000 ? `৳${(n / 100_000).toFixed(n >= 1_000_000 ? 0 : 1)}L` : n >= 1000 ? `৳${Math.round(n / 1000)}k` : `৳${n}`;
const dayLabel = (d: string, withYear = false) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  });

/** Clean axis ticks: 0 and three round steps up to the max. */
function ticks(max: number) {
  if (max <= 0) return [0];
  const raw = max / 3;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw;
  return [0, step, step * 2, step * 3];
}

/**
 * Sales per day as columns (one series: no legend; the heading names it).
 * Hover or tap a day for its sales and orders.
 */
export function SalesChart({ points }: { points: Point[] }) {
  const [hover, setHover] = useState<number | null>(null);
  // Drawn at the real width so text stays readable on phones.
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(720);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = W < 500 ? 200 : 220;
  const PAD = { l: 48, r: 8, t: 12, b: 26 };
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  const max = Math.max(0, ...points.map((p) => p.sales));
  const tk = useMemo(() => ticks(max), [max]);
  const top = tk[tk.length - 1] || 1;
  const band = plotW / Math.max(1, points.length);
  const barW = Math.max(1, Math.min(24, band - 2));
  const y = (v: number) => PAD.t + plotH - (v / top) * plotH;
  // Label about six days on the axis.
  const every = Math.max(1, Math.ceil(points.length / (W < 500 ? 4 : 6)));
  const h = hover != null ? points[hover] : null;

  if (!points.length) return null;
  return (
    <div ref={box} className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        className="block max-w-full select-none"
        role="img"
        aria-label={`Sales per day from ${dayLabel(points[0].day, true)} to ${dayLabel(points[points.length - 1].day, true)}`}
        onMouseLeave={() => setHover(null)}
      >
        {tk.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} className="stroke-border" strokeWidth={1} />
            <text x={PAD.l - 6} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[10px]">
              {short(t)}
            </text>
          </g>
        ))}
        {points.map((p, i) => {
          const x = PAD.l + i * band + (band - barW) / 2;
          const bh = Math.max(0, PAD.t + plotH - y(p.sales));
          const r = Math.min(4, barW / 2, bh);
          const yTop = PAD.t + plotH - bh;
          return (
            <g key={p.day}>
              {bh > 0 ? (
                <path
                  d={`M${x},${yTop + bh} V${yTop + r} Q${x},${yTop} ${x + r},${yTop} H${x + barW - r} Q${x + barW},${yTop} ${x + barW},${yTop + r} V${yTop + bh} Z`}
                  className={
                    hover === null || hover === i
                      ? "fill-[#2a78d6] dark:fill-[#3987e5]"
                      : "fill-[#2a78d6]/45 dark:fill-[#3987e5]/45"
                  }
                />
              ) : null}
              {/* Hit target: the whole day column. */}
              <rect
                x={PAD.l + i * band}
                y={PAD.t}
                width={band}
                height={plotH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onClick={() => setHover(i)}
              />
              {i % every === 0 ? (
                <text
                  x={PAD.l + i * band + band / 2}
                  y={H - 8}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[10px]"
                >
                  {dayLabel(p.day)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      {h ? (
        <div
          className="pointer-events-none absolute top-0 rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md"
          style={{
            left: `${((PAD.l + (hover! + 0.5) * band) / W) * 100}%`,
            transform: `translateX(${hover! > points.length / 2 ? "-105%" : "5%"})`,
          }}
        >
          <div className="font-medium">{dayLabel(h.day, true)}</div>
          <div className="tabular-nums">{money(h.sales)}</div>
          <div className="text-muted-foreground tabular-nums">
            {h.orders} order{h.orders === 1 ? "" : "s"}
          </div>
        </div>
      ) : null}
    </div>
  );
}
