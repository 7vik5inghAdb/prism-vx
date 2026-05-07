"use client";

import { CheckIcon } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { STEP_INFO } from "@/types";
import { cn } from "@/lib/utils";

export function PipelineTracker() {
  const { stepStatuses } = useAppStore();
  const completedCount = Object.values(stepStatuses).filter(
    (s) => s === "completed"
  ).length;

  return (
    <aside className="flex flex-col h-full bg-bg-deep relative">
      {/* Header */}
      <div className="px-5 py-4 border-b border-line">
        <p className="text-[10px] font-bold text-ink-low uppercase tracking-widest">
          Pipeline
        </p>
        <p className="text-[10px] text-ink-dim mt-0.5">
          {Object.values(stepStatuses).filter((s) => s === "completed").length} of 5 complete
        </p>
      </div>

      {/* Pipeline steps */}
      <div className="flex-1 px-4 py-5 overflow-y-auto">
        <div className="relative">
          {STEP_INFO.map((step, index) => {
            const status = stepStatuses[step.number];
            const isCompleted = status === "completed";
            const isActive = status === "active";
            const isPending = status === "pending";
            const isError = status === "error";
            const isLast = index === STEP_INFO.length - 1;

            return (
              <div key={step.number} className="relative flex gap-3 pb-6 last:pb-0">
                {/* Connector line */}
                {!isLast && (
                  <div
                    className={cn(
                      "absolute left-[15px] top-8 w-0.5 h-[calc(100%-8px)] transition-all duration-700",
                      isCompleted
                        ? "bg-gradient-to-b from-magenta to-magenta-300"
                        : "bg-line-strong"
                    )}
                  />
                )}

                {/* Step indicator */}
                <div className="relative z-10 flex-shrink-0">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300",
                      isCompleted &&
                        "bg-magenta-gradient shadow-glow-magenta",
                      isActive &&
                        "bg-bg-raised shadow-neu-sm ring-2 ring-magenta animate-glow-pulse",
                      isPending && "bg-bg-inset shadow-neu-inset",
                      isError && "bg-scarlet/20 ring-2 ring-scarlet"
                    )}
                  >
                    {isCompleted ? (
                      <CheckIcon className="w-4 h-4 text-white" />
                    ) : isActive ? (
                      <div className="w-2.5 h-2.5 rounded-full bg-magenta animate-pulse" />
                    ) : isError ? (
                      <span className="text-xs text-scarlet font-bold">!</span>
                    ) : (
                      <span className="text-[11px] font-bold text-ink-dim">
                        {step.number}
                      </span>
                    )}
                  </div>
                </div>

                {/* Step content */}
                <div className="pt-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span
                      className={cn(
                        "text-[12px] font-bold leading-tight transition-colors",
                        isCompleted && "text-ink-mid",
                        isActive && "text-ink-high",
                        isPending && "text-ink-dim",
                        isError && "text-scarlet"
                      )}
                    >
                      {step.label}
                    </span>
                    {isActive && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold bg-magenta/15 text-magenta border border-magenta/30 tracking-wider">
                        ACTIVE
                      </span>
                    )}
                    {isCompleted && (
                      <CheckIcon className="w-3 h-3 text-magenta" />
                    )}
                  </div>
                  <p
                    className={cn(
                      "text-[10.5px] leading-snug transition-colors",
                      isCompleted && "text-ink-low",
                      isActive && "text-ink-mid",
                      isPending && "text-ink-dim"
                    )}
                  >
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 py-4 border-t border-line">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-ink-low font-bold uppercase tracking-wider">
            Progress
          </span>
          <span className="text-[10px] text-ink-mid font-bold">
            {completedCount}/5
          </span>
        </div>
        <div className="h-2 bg-bg-inset rounded-full overflow-hidden shadow-neu-inset">
          <div
            className="h-full bg-prism-gradient rounded-full transition-all duration-700 ease-out shadow-glow-magenta"
            style={{ width: `${(completedCount / 5) * 100}%` }}
          />
        </div>
        <p className="text-[9px] text-ink-dim text-center mt-3">
          Forward-only flow
        </p>
      </div>
    </aside>
  );
}
