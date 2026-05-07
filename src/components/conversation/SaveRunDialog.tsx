"use client";

import { useEffect, useState } from "react";
import { X, Save, CheckCircle } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { saveRun, deriveAutoName } from "@/lib/runs";

export function SaveRunDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const {
    currentRunId,
    currentRunName,
    currentStep,
    stepStatuses,
    context,
    interpretation,
    personas,
    selectedMethod,
    instrument,
    panelResults,
    report,
    surveyPanelSize,
    interviewPanelSize,
    setCurrentRun,
  } = useAppStore();

  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      setName(currentRunName ?? deriveAutoName(context));
      setSaved(false);
    }
  }, [open, currentRunName, context]);

  function handleSave() {
    const finalName = name.trim() || deriveAutoName(context);
    const saved = saveRun({
      id: currentRunId ?? undefined,
      name: finalName,
      currentStep,
      stepStatuses,
      context,
      interpretation,
      personas,
      selectedMethod,
      instrument,
      panelResults,
      report,
      surveyPanelSize,
      interviewPanelSize,
    });
    setCurrentRun(saved.id, saved.name);
    setSaved(true);
    setTimeout(onClose, 900);
  }

  if (!open) return null;

  const isUpdate = !!currentRunId;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md neu-card rounded-2xl overflow-hidden animate-slide-in glow-magenta-soft"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-line">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-magenta/15 flex items-center justify-center">
              <Save className="w-4 h-4 text-magenta" />
            </div>
            <h2 className="text-sm font-bold text-ink-high">
              {isUpdate ? "Update Saved Run" : "Save This Run"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-bg-elevated transition-colors"
          >
            <X className="w-4 h-4 text-ink-low" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          {saved ? (
            <div className="flex flex-col items-center py-6 text-center animate-fade-in">
              <div className="w-12 h-12 rounded-full bg-sky/15 border border-sky/40 flex items-center justify-center mb-3 shadow-glow-sky">
                <CheckCircle className="w-6 h-6 text-sky" />
              </div>
              <p className="text-sm font-semibold text-sky">
                {isUpdate ? "Run updated" : "Run saved"}
              </p>
              <p className="text-[11px] text-ink-low mt-1">
                Find it under &ldquo;Saved Runs&rdquo; in the top bar
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs text-ink-mid leading-relaxed">
                {isUpdate
                  ? "Update this saved run with the current state, or rename it."
                  : "Give this run a name so you can find it later. The full session — context, personas, instrument, panel data, and report — is captured."}
              </p>

              <div>
                <label className="block text-[10px] font-bold text-ink-low uppercase tracking-widest mb-1.5">
                  Run Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={deriveAutoName(context)}
                  autoFocus
                  className="w-full px-3 py-2 text-sm neu-inset rounded-md text-ink-high"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave();
                  }}
                />
              </div>

              <div className="neu-inset rounded-lg p-2.5 text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-ink-low">Step</span>
                  <span className="text-ink-mid font-semibold">{currentStep}/5</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-low">Method</span>
                  <span className="text-ink-mid font-semibold capitalize">
                    {selectedMethod ?? "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-low">Panel</span>
                  <span className="text-ink-mid font-semibold">
                    {panelResults
                      ? `${panelResults.respondents.length} respondents`
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-low">Report</span>
                  <span className="text-ink-mid font-semibold">
                    {report ? "✓ Ready" : "—"}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={onClose}
                  className="flex-1 py-2 text-xs font-semibold neu-button text-ink-mid rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex-[2] py-2 text-xs font-semibold neu-button-primary rounded-lg"
                >
                  {isUpdate ? "Update Run" : "Save Run"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
