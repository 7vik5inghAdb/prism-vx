"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { VariantPerformance } from "@/types";
import {
  AXIS_TICK_COLOR,
  CHART_COLORS,
  GRID_COLOR,
  tooltipStyle,
} from "./chartTheme";

const CHART_HEIGHT = 220;

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}

export default function RatingDistributionChart({
  variants,
}: {
  variants: VariantPerformance[];
}) {
  // Union of every rating value present across variants (e.g. 1–5).
  const ratings = Array.from(
    new Set(variants.flatMap((v) => v.ratingDistribution.map((r) => r.rating)))
  ).sort((a, b) => a - b);

  // One row per rating value; each variant keyed by its (unique) variantId.
  const data = ratings.map((rating) => {
    const row: Record<string, number> = { rating };
    variants.forEach((v) => {
      const match = v.ratingDistribution.find((r) => r.rating === rating);
      row[v.variantId] = match ? Math.round(match.percent) : 0;
    });
    return row;
  });

  return (
    <div style={{ width: "100%", height: CHART_HEIGHT }}>
      <ResponsiveContainer
        width="100%"
        height="100%"
        initialDimension={{ width: 500, height: CHART_HEIGHT }}
      >
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRID_COLOR} vertical={false} />
          <XAxis
            dataKey="rating"
            tick={{ fill: AXIS_TICK_COLOR, fontSize: 10 }}
            axisLine={{ stroke: GRID_COLOR }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: AXIS_TICK_COLOR, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={40}
            tickFormatter={(v) => `${String(v)}%`}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            contentStyle={tooltipStyle.contentStyle}
            labelStyle={tooltipStyle.labelStyle}
            itemStyle={tooltipStyle.itemStyle}
            formatter={(value) => `${String(value)}%`}
            labelFormatter={(label) => `Rating ${String(label)}`}
          />
          <Legend
            wrapperStyle={{ fontSize: 9, paddingTop: 6 }}
            iconSize={8}
            iconType="circle"
          />
          {variants.map((v, i) => (
            <Bar
              key={v.variantId}
              dataKey={v.variantId}
              name={truncate(v.variantText, 22)}
              fill={CHART_COLORS[i % CHART_COLORS.length]}
              radius={[2, 2, 0, 0]}
              maxBarSize={26}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
