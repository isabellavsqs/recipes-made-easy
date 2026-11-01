"use client";

import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CuisineCount } from "@/lib/cuisine-count";

// Same values as the theme in globals.css (Recharts needs plain colors).
const BAR = "#2f6b4f";
const TEXT = "#2b2b2b";
const MUTED = "#6b6560";
const HOVER = "#e6dfd5";

const ROW = 36; // px per cuisine: a 20px bar plus air

// One series, so no legend: the heading says what's plotted. Every bar is
// labeled at its tip, so the x-axis is left out.
export function CuisineChart({ data }: { data: CuisineCount[] }) {
  return (
    <div style={{ height: data.length * ROW + 8 }} aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 32, bottom: 4, left: 0 }}>
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="cuisine"
            width={112}
            tickLine={false}
            axisLine={false}
            tick={{ fill: MUTED, fontSize: 13 }}
          />
          <Tooltip
            cursor={{ fill: HOVER, opacity: 0.5 }}
            isAnimationActive={false}
            content={({ active, payload }) => {
              const row = payload?.[0]?.payload as CuisineCount | undefined;
              if (!active || !row) return null;
              return (
                <div className="rounded-lg border border-line bg-white px-3 py-2 text-sm shadow-sm">
                  <span className="font-medium" style={{ color: TEXT }}>
                    {row.cuisine}
                  </span>
                  <span style={{ color: MUTED }}>
                    {" "}
                    · {row.count} {row.count === 1 ? "recipe" : "recipes"}
                  </span>
                </div>
              );
            }}
          />
          <Bar dataKey="count" fill={BAR} barSize={20} radius={[0, 4, 4, 0]} isAnimationActive={false}>
            <LabelList dataKey="count" position="right" fill={TEXT} fontSize={13} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
