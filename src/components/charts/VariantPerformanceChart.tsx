"use client";

import {
  Bar,
  BarChart,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { VariantPerformance } from "@/types";
import { AXIS_TICK_COLOR, CHART_COLORS } from "./chartTheme";

interface Row {
  label: string;
  fullText: string;
  rating: number;
  intent: number;
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}

function VariantTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: Row }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;
  return (
    <div
      style={{
        background: "#0A1838",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 8,
        padding: "6px 10px",
        maxWidth: 240,
      }}
    >
      <p
        style={{
          color: "#B5C0DD",
          fontWeight: 600,
          fontSize: 11,
          marginBottom: 3,
        }}
      >
        {row.fullText}
      </p>
      <p style={{ color: "#F0F4FF", fontSize: 11 }}>
        Avg rating <strong>{row.rating.toFixed(2)}</strong> / 5 ·{" "}
        <strong>{Math.round(row.intent)}%</strong> intent
      </p>
    </div>
  );
}

export default function VariantPerformanceChart({
  variants,
}: {
  variants: VariantPerformance[];
}) {
  const data: Row[] = [...variants]
    .sort((a, b) => b.averageRating - a.averageRating)
    .map((v) => ({
      label: truncate(v.variantText, 24),
      fullText: v.variantText,
      rating: Number.isFinite(v.averageRating) ? v.averageRating : 0,
      intent: Number.isFinite(v.interestPercent) ? v.interestPercent : 0,
    }));

  const height = data.length * 40 + 24;

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer
        width="100%"
        height="100%"
        initialDimension={{ width: 500, height }}
      >
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 40, bottom: 4, left: 4 }}
        >
          <XAxis type="number" domain={[0, 5]} hide />
          <YAxis
            type="category"
            dataKey="label"
            width={112}
            tick={{ fill: AXIS_TICK_COLOR, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={<VariantTooltip />}
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
          />
          <Bar
            dataKey="rating"
            fill={CHART_COLORS[0]}
            radius={[0, 4, 4, 0]}
            maxBarSize={20}
          >
            <LabelList
              dataKey="rating"
              position="right"
              formatter={(v) => Number(v).toFixed(2)}
              fill="#F0F4FF"
              fontSize={10}
              fontWeight={700}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
