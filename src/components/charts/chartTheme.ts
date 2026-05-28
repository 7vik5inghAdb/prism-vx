// Shared styling so Recharts visuals match PRISM's dark "prism" theme.

/** Per-variant series colors, drawn from the brand palette (tailwind.config.ts).
 *  Now restricted to magenta / cyan / green / red shades — yellow + harvest gone. */
export const CHART_COLORS = [
  "#E753FE", // magenta
  "#2CC5F7", // sky
  "#22C55E", // green-500
  "#EF4444", // red-500
  "#B240D8", // magenta-400
  "#1FA9DD", // sky-400
  "#15803D", // green-300 (dark)
  "#B91C1C", // red-300 (dark)
];

export const AXIS_TICK_COLOR = "#7986A8"; // ink-low
export const GRID_COLOR = "rgba(255,255,255,0.06)"; // line

export const tooltipStyle = {
  contentStyle: {
    background: "#0A1838", // bg-raised
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 8,
    fontSize: 11,
    padding: "6px 10px",
  },
  labelStyle: { color: "#B5C0DD", fontWeight: 600 },
  itemStyle: { color: "#F0F4FF", padding: 0 },
};
