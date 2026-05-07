"use client";

import { useEffect, useState } from "react";
import { X, FolderOpen, Trash2, Calendar, ChevronRight, Clock, FileCheck } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { listRuns, loadRun, deleteRun, type SavedRunMeta } from "@/lib/runs";
import { cn } from "@/lib/utils";

export function SavedRunsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [runs, setRuns] = useState<SavedRunMeta[]>([]);
  const { loadRunSnapshot, currentRunId } = useAppStore();

  useEffect(() => {
    if (open) setRuns(listRuns());
  }, [open]);

  function handleLoad(id: string) {
    const run = loadRun(id);
    if (!run) return;
    loadRunSnapshot({
      id: run.id,
      name: run.name,
      currentStep: run.currentStep,
      stepStatuses: run.stepStatuses,
      context: run.context,
      interpretation: run.interpretation,
      personas: run.personas,
      selectedMethod: run.selectedMethod,
      instrument: run.instrument,
      panelResults: run.panelResults,
      report: run.report,
      surveyPanelSize: run.surveyPanelSize,
      interviewPanelSize: run.interviewPanelSize,
    });
    onClose();
  }

  function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Delete this saved run? This cannot be undone.")) return;
    deleteRun(id);
    setRuns(listRuns());
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[80vh] neu-card rounded-2xl overflow-hidden animate-slide-in flex flex-col glow-magenta-soft"
      >
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-line">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-magenta/15 flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-magenta" />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink-high">Saved Runs</h2>
              <p className="text-[11px] text-ink-low">
                {runs.length} saved {runs.length === 1 ? "run" : "runs"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-bg-elevated transition-colors"
          >
            <X className="w-4 h-4 text-ink-low" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {runs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl neu-inset flex items-center justify-center mb-4">
                <FolderOpen className="w-6 h-6 text-ink-dim" />
              </div>
              <p className="text-sm font-semibold text-ink-mid mb-1">
                No saved runs yet
              </p>
              <p className="text-[11px] text-ink-low max-w-[260px] leading-relaxed">
                Click &ldquo;Save Run&rdquo; in the top bar to capture the current research session and reload it later.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {runs.map((run) => (
                <button
                  key={run.id}
                  onClick={() => handleLoad(run.id)}
                  className={cn(
                    "group w-full text-left p-3 rounded-xl transition-all",
                    "neu-card-sm hover:shadow-glow-magenta hover:border-magenta/40",
                    currentRunId === run.id && "border-magenta/60 shadow-glow-magenta"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-ink-high truncate">
                          {run.name}
                        </span>
                        {currentRunId === run.id && (
                          <span className="text-[9px] font-bold bg-magenta/15 text-magenta px-1.5 py-0.5 rounded border border-magenta/40 flex-shrink-0">
                            CURRENT
                          </span>
                        )}
                        {run.reportReady && (
                          <span className="text-[9px] font-bold bg-sky/15 text-sky px-1.5 py-0.5 rounded border border-sky/30 flex-shrink-0 inline-flex items-center gap-0.5">
                            <FileCheck className="w-2.5 h-2.5" />
                            REPORT
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-ink-low leading-relaxed mb-2 line-clamp-2">
                        {run.hypothesisPreview}
                      </p>
                      <div className="flex items-center gap-3 text-[10px] text-ink-dim">
                        <span className="inline-flex items-center gap-0.5">
                          <Calendar className="w-2.5 h-2.5" />
                          {new Date(run.updatedAt).toLocaleDateString()}
                        </span>
                        <span className="inline-flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {new Date(run.updatedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span className="neu-pill px-1.5 py-0.5 rounded text-ink-mid">
                          Step {run.currentStep}/5
                        </span>
                        <span className="neu-pill px-1.5 py-0.5 rounded text-ink-mid">
                          {run.methodLabel}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={(e) => handleDelete(run.id, e)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-scarlet/15 text-ink-low hover:text-scarlet"
                        title="Delete run"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-ink-dim group-hover:text-magenta transition-colors" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-shrink-0 px-6 py-3 border-t border-line bg-bg-deep/40">
          <p className="text-[10px] text-ink-dim text-center">
            Runs are saved locally in your browser. Clearing site data will remove them.
          </p>
        </div>
      </div>
    </div>
  );
}
