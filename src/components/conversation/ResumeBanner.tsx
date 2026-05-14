"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { X, RotateCw, History } from "lucide-react";

/**
 * Lightweight resume notice. Zustand's persist middleware already restores
 * state automatically on app boot. This banner just *informs* the PM that
 * they're resuming, with a one-click escape hatch to start fresh.
 *
 * Shows when:
 *   - There's autosaved progress (currentStep > 1 OR meaningful state)
 *   - Less than 2 hours old
 *   - The banner has not been dismissed in this session
 */
export function ResumeBanner() {
  const {
    autosavedAt,
    currentStep,
    context,
    report,
    resetAll,
  } = useAppStore();

  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed) return;

    const hasProgress = currentStep > 1 || !!context || !!report;
    if (!hasProgress || !autosavedAt) {
      setVisible(false);
      return;
    }

    const ageMin = (Date.now() - new Date(autosavedAt).getTime()) / 60000;
    if (ageMin > 120) {
      setVisible(false);
      return;
    }

    setVisible(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible || dismissed) return null;

  const ageMin = Math.max(
    0,
    Math.round((Date.now() - new Date(autosavedAt!).getTime()) / 60000)
  );

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 neu-card rounded-xl px-4 py-3 max-w-md w-[92%] shadow-glow-magenta animate-slide-in">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-magenta/15 flex items-center justify-center flex-shrink-0">
          <History className="w-4 h-4 text-magenta" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-ink-high">
            Resumed your previous session
          </p>
          <p className="text-[11px] text-ink-low mt-0.5 leading-relaxed">
            Picked up{" "}
            <span className="text-magenta font-semibold">
              {ageMin === 0 ? "just now" : `${ageMin} min ago`}
            </span>
            {" — "}Step {currentStep} of 5. Your progress is autosaved as you go.
          </p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setDismissed(true)}
              className="text-[10px] text-ink-mid hover:text-ink-high neu-button rounded px-2 py-1 font-semibold"
            >
              Got it
            </button>
            <button
              onClick={() => {
                if (
                  confirm(
                    "Discard the resumed session and start fresh? This cannot be undone."
                  )
                ) {
                  resetAll();
                  setDismissed(true);
                }
              }}
              className="text-[10px] text-scarlet hover:text-scarlet/80 px-2 py-1 font-semibold flex items-center gap-1"
            >
              <RotateCw className="w-2.5 h-2.5" />
              Start fresh
            </button>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 text-ink-low hover:text-ink-high"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
