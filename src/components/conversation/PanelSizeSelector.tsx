"use client";

import { Minus, Plus, Users } from "lucide-react";
import type { ResearchMethod } from "@/types";

export function PanelSizeSelector({
  method,
  value,
  onChange,
  onConfirm,
  disabled,
}: {
  method: ResearchMethod;
  value: number;
  onChange: (v: number) => void;
  onConfirm: () => void;
  disabled?: boolean;
}) {
  const isSurvey = method === "survey";
  const min = isSurvey ? 20 : 1;
  const max = isSurvey ? 500 : 10;
  const defaultRecommended = isSurvey ? 100 : 3;
  const step = isSurvey ? 10 : 1;

  return (
    <div className="neu-card-sm rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-magenta" />
        <span className="text-sm font-semibold text-ink-high">
          Panel Size
        </span>
      </div>

      <p className="text-xs text-ink-low leading-relaxed">
        {isSurvey
          ? "Larger panels give more robust quantitative data and better cohort coverage. Smaller panels run faster and use fewer tokens."
          : "More interviews give richer qualitative coverage. Fewer interviews are faster and produce focused, deeper transcripts."}
      </p>

      <div className="flex items-center justify-center gap-3 py-3">
        <button
          onClick={() => onChange(Math.max(min, value - step))}
          disabled={disabled || value <= min}
          className="w-9 h-9 rounded-lg neu-button disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
        >
          <Minus className="w-4 h-4 text-ink-mid" />
        </button>
        <div className="flex flex-col items-center min-w-[80px]">
          <input
            type="number"
            value={value}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
            }}
            min={min}
            max={max}
            disabled={disabled}
            className="text-3xl font-black text-ink-high text-center w-20 bg-transparent border-0 focus:ring-0 focus:outline-none"
          />
          <span className="text-[10px] text-ink-low uppercase tracking-wider">
            respondents
          </span>
        </div>
        <button
          onClick={() => onChange(Math.min(max, value + step))}
          disabled={disabled || value >= max}
          className="w-9 h-9 rounded-lg neu-button disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
        >
          <Plus className="w-4 h-4 text-ink-mid" />
        </button>
      </div>

      <div className="flex justify-center gap-2">
        {[
          isSurvey ? 50 : 1,
          defaultRecommended,
          isSurvey ? 200 : 5,
        ].map((preset) => (
          <button
            key={preset}
            onClick={() => onChange(preset)}
            disabled={disabled}
            className={
              value === preset
                ? "px-3 py-1 text-[10px] font-bold rounded-full bg-magenta/15 text-magenta border border-magenta/60 shadow-glow-magenta"
                : "px-3 py-1 text-[10px] font-medium rounded-full neu-pill text-ink-mid hover:text-ink-high"
            }
          >
            {preset === defaultRecommended ? `${preset} (recommended)` : preset}
          </button>
        ))}
      </div>

      <div className="flex justify-between items-center pt-2 border-t border-line">
        <span className="text-[10px] text-ink-low">
          Range: {min}–{max}
        </span>
        <button
          onClick={onConfirm}
          disabled={disabled}
          className="px-4 py-1.5 text-xs font-semibold text-white neu-button-primary rounded-lg transition-colors disabled:opacity-50"
        >
          Run with {value} respondents →
        </button>
      </div>
    </div>
  );
}
