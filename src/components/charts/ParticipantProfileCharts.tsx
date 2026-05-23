"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import type { ParticipantProfile } from "@/types";
import { AXIS_TICK_COLOR, CHART_COLORS, GRID_COLOR } from "./chartTheme";

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}

/**
 * Charts for a non-variant survey's participant profile — a cohort
 * distribution bar and (when present) an age-distribution bar. Survey studies
 * have no `variantPerformance`, so the variant charts never render; these give
 * the report the visual breakdown an analyst expects.
 */
export default function ParticipantProfileCharts({
  profile,
}: {
  profile: ParticipantProfile;
}) {
  const cohortData = profile.cohorts.map((c) => ({
    label: truncate(c.name, 26),
    percent: c.percent,
  }));
  const ageData = (profile.ageDistribution ?? []).map((a) => ({
    band: a.band,
    percent: a.percent,
  }));
  const cohortH = cohortData.length * 32 + 14;

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[9px] text-ink-low uppercase tracking-wider mb-1">
          Cohort distribution
        </p>
        <div style={{ width: "100%", height: cohortH }}>
          <ResponsiveContainer
            width="100%"
            height="100%"
            initialDimension={{ width: 360, height: cohortH }}
          >
            <BarChart
              data={cohortData}
              layout="vertical"
              margin={{ top: 2, right: 36, bottom: 2, left: 4 }}
            >
              <XAxis type="number" domain={[0, "dataMax"]} hide />
              <YAxis
                type="category"
                dataKey="label"
                width={132}
                tick={{ fill: AXIS_TICK_COLOR, fontSize: 9 }}
                axisLine={false}
                tickLine={false}
              />
              <Bar dataKey="percent" radius={[0, 3, 3, 0]} maxBarSize={18}>
                {cohortData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
                <LabelList
                  dataKey="percent"
                  position="right"
                  formatter={(v) => `${String(v)}%`}
                  fill={AXIS_TICK_COLOR}
                  fontSize={9}
                  fontWeight={700}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {ageData.length > 0 && (
        <div>
          <p className="text-[9px] text-ink-low uppercase tracking-wider mb-1">
            Age distribution
          </p>
          <div style={{ width: "100%", height: 132 }}>
            <ResponsiveContainer
              width="100%"
              height="100%"
              initialDimension={{ width: 360, height: 132 }}
            >
              <BarChart
                data={ageData}
                margin={{ top: 14, right: 8, bottom: 2, left: 0 }}
              >
                <CartesianGrid stroke={GRID_COLOR} vertical={false} />
                <XAxis
                  dataKey="band"
                  tick={{ fill: AXIS_TICK_COLOR, fontSize: 9 }}
                  axisLine={{ stroke: GRID_COLOR }}
                  tickLine={false}
                />
                <YAxis hide domain={[0, "dataMax"]} />
                <Bar
                  dataKey="percent"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={44}
                  fill={CHART_COLORS[1]}
                >
                  <LabelList
                    dataKey="percent"
                    position="top"
                    formatter={(v) => `${String(v)}%`}
                    fill={AXIS_TICK_COLOR}
                    fontSize={9}
                    fontWeight={700}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
