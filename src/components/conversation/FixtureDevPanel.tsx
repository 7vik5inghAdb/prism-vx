"use client";

import { useState } from "react";
import { Beaker, X } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { FIXTURES, type FixtureSnapshot } from "@/lib/fixtures";
import { cn } from "@/lib/utils";

/**
 * Dev-only fixture loader. Renders nothing in production builds. Lets you
 * jump straight to Step 4 or Step 5 with pre-baked state so you can iterate
 * on simulation / synthesis prompts without rerunning the full pipeline.
 */
export function FixtureDevPanel() {
  const [open, setOpen] = useState(false);
  const { loadRunSnapshot, resetAll } = useAppStore();

  // Show only outside production
  if (process.env.NODE_ENV === "production") return null;

  function applyFixture(f: FixtureSnapshot) {
    if (
      !confirm(
        `Load fixture "${f.label}"? This will discard your current session.`
      )
    ) {
      return;
    }
    resetAll();
    // Use the existing loadRunSnapshot wiring to push everything into state
    // in one shot (handles autosave, currentRunName, etc.).
    loadRunSnapshot({
      id: `fixture_${f.id}`,
      name: `[Fixture] ${f.label}`,
      currentStep: f.currentStep,
      stepStatuses: f.stepStatuses,
      context: f.context,
      interpretation: f.interpretation,
      personas: f.personas,
      selectedMethod: f.selectedMethod,
      instrument: f.instrument,
      panelResults: f.panelResults,
      report: null,
      surveyPanelSize: 100,
      interviewPanelSize: 3,
    });
    setOpen(false);
  }

  return (
    <>
      {/* Floating button — bottom-left corner */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-4 left-4 z-30 neu-card-sm rounded-full px-3 py-2",
          "flex items-center gap-1.5 text-[10px] font-bold text-yellow",
          "hover:shadow-glow-yellow transition-shadow border border-yellow/40"
        )}
        title="Dev fixtures (skip to step)"
      >
        <Beaker className="w-3 h-3" />
        DEV
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md animate-fade-in"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg neu-card rounded-2xl overflow-hidden animate-slide-in glow-magenta-soft"
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-line">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-yellow/15 flex items-center justify-center">
                  <Beaker className="w-4 h-4 text-yellow" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-ink-high">
                    Dev Fixtures
                  </h2>
                  <p className="text-[10px] text-ink-low">
                    Skip to a step with pre-baked state — saves credits while
                    iterating on prompts.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-bg-elevated"
              >
                <X className="w-4 h-4 text-ink-low" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-2">
              {FIXTURES.map((f) => (
                <button
                  key={f.id}
                  onClick={() => applyFixture(f)}
                  className="w-full text-left neu-card-sm rounded-lg p-3 hover:shadow-glow-yellow hover:border-yellow/40 transition-all"
                >
                  <p className="text-sm font-bold text-ink-high">
                    {f.label}
                  </p>
                  <p className="text-[11px] text-ink-low mt-1 leading-relaxed">
                    {f.description}
                  </p>
                  <div className="flex gap-1.5 mt-2 text-[9px]">
                    <span className="neu-pill px-1.5 py-0.5 rounded text-ink-mid">
                      Step {f.currentStep}
                    </span>
                    {f.selectedMethod && (
                      <span className="neu-pill px-1.5 py-0.5 rounded text-magenta capitalize">
                        {f.selectedMethod}
                      </span>
                    )}
                    {f.panelResults && (
                      <span className="neu-pill px-1.5 py-0.5 rounded text-sky">
                        {f.panelResults.respondents.length} respondents
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="px-5 py-3 border-t border-line bg-bg-deep/40 text-[10px] text-ink-dim text-center">
              Dev panel hidden in production builds.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
