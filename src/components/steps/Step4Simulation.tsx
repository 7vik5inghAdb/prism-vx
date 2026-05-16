"use client";

import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/lib/store";
import {
  AlertCircleIcon,
  RefreshCwIcon,
  CheckCircleIcon,
  ArrowRight,
  Sparkles,
  Eye,
} from "lucide-react";
import { Message } from "@/components/conversation/Message";
import { PanelSizeSelector } from "@/components/conversation/PanelSizeSelector";
import { RespondentCard } from "@/components/conversation/RespondentCard";
import type {
  SurveyRespondent,
  InterviewRespondent,
  SimulationProgress,
  ResearchMethod,
} from "@/types";

const BATCH_SIZE = 5;

export function Step4Simulation() {
  const {
    context,
    selectedMethod,
    personas,
    instrument,
    panelResults,
    simulationProgress,
    surveyPanelSize,
    interviewPanelSize,
    streamingRespondents,
    isLoading,
    error,
    setLoading,
    setError,
    setPanelResults,
    setSimulationProgress,
    appendStreamingRespondents,
    resetStreamingRespondents,
    setSurveyPanelSize,
    setInterviewPanelSize,
    advanceToStep,
    retryCurrentStep,
  } = useAppStore();

  const hasStarted = useRef(false);
  const [stage, setStage] = useState<"configure" | "running" | "complete">(
    panelResults ? "complete" : "configure"
  );

  const panelSize =
    selectedMethod === "survey" ? surveyPanelSize : interviewPanelSize;

  function setPanelSize(v: number) {
    if (selectedMethod === "survey") setSurveyPanelSize(v);
    else setInterviewPanelSize(v);
  }

  function startSimulation() {
    hasStarted.current = true;
    setStage("running");
    resetStreamingRespondents();
    runSimulation();
  }

  async function runSimulation() {
    if (!selectedMethod || !personas || !instrument) return;
    setLoading(true, "Starting panel simulation...");

    if (selectedMethod === "survey") await runSurveySimulation();
    else await runInterviewSimulation();
  }

  async function runSurveySimulation() {
    const total = surveyPanelSize;
    const totalBatches = Math.ceil(total / BATCH_SIZE);
    const collected: SurveyRespondent[] = [];

    setSimulationProgress({
      current: 0,
      total,
      phase: "preparing",
    });

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const start = batchIndex * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, total);
      const label = `Simulating respondents ${start + 1}–${end} of ${total}`;

      setSimulationProgress({
        current: start,
        total,
        currentBatch: label,
        phase: "simulating",
      });

      // Try this batch, then retry once on failure before giving up on it
      let batchSucceeded = false;
      let lastErr: unknown = null;
      for (let attempt = 0; attempt < 2 && !batchSucceeded; attempt++) {
        try {
          const res = await fetch("/api/simulate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              method: "survey",
              personas,
              instrument,
              context, // includes per-variant image content for vision
              batchIndex,
              panelSize: total,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Batch failed");

          const newOnes = data.respondents as SurveyRespondent[];
          collected.push(...newOnes);
          appendStreamingRespondents(newOnes);
          // Persist partial progress as we go so a later crash doesn't lose it
          setPanelResults({ method: "survey", respondents: [...collected] });

          setSimulationProgress({
            current: Math.min(collected.length, total),
            total,
            currentBatch: label,
            phase: "simulating",
          });
          batchSucceeded = true;
        } catch (err) {
          lastErr = err;
          if (attempt === 0) {
            // wait then retry once
            await new Promise((r) => setTimeout(r, 2000));
          }
        }
      }

      if (!batchSucceeded) {
        // Surface partial-results UI: keep what we have, let the PM decide
        const partialMsg =
          lastErr instanceof Error
            ? `Batch ${batchIndex + 1} failed after retry: ${lastErr.message}`
            : `Batch ${batchIndex + 1} failed after retry`;
        if (collected.length > 0) {
          setError(
            `${partialMsg}. ${collected.length}/${total} respondents captured. Click retry to resume, or continue with partial results.`
          );
        } else {
          setError(partialMsg);
        }
        setLoading(false);
        return;
      }
    }

    setSimulationProgress({
      current: total,
      total,
      currentBatch: "Finalizing...",
      phase: "finalizing",
    });
    await new Promise((r) => setTimeout(r, 400));

    setPanelResults({ method: "survey", respondents: collected });
    setSimulationProgress({ current: total, total, phase: "complete" });
    setStage("complete");
    setLoading(false);
  }

  async function runInterviewSimulation() {
    const total = interviewPanelSize;
    const collected: InterviewRespondent[] = [];

    for (let i = 0; i < total; i++) {
      const personaName = personas![i % personas!.length].name;
      setSimulationProgress({
        current: i,
        total,
        currentBatch: `Interviewing ${personaName} (${i + 1}/${total})`,
        phase: "simulating",
      });

      try {
        const res = await fetch("/api/simulate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            method: "interview",
            personas,
            instrument,
            context,
            respondentIndex: i,
            panelSize: total,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Interview failed");

        const r = data.respondent as InterviewRespondent;
        collected.push(r);
        appendStreamingRespondents([r]);

        setSimulationProgress({
          current: i + 1,
          total,
          phase: "simulating",
        });
      } catch (err) {
        setError(
          err instanceof Error ? `Interview ${i + 1}: ${err.message}` : "Failed"
        );
        setLoading(false);
        return;
      }
    }

    await new Promise((r) => setTimeout(r, 400));
    setPanelResults({ method: "interview", respondents: collected });
    setSimulationProgress({ current: total, total, phase: "complete" });
    setStage("complete");
    setLoading(false);
  }

  return (
    <div className="space-y-1">
      <Message variant="orchestrator">
        Time to run the synthetic panel. How large should the panel be? I&rsquo;d
        recommend{" "}
        <span className="font-semibold">
          {selectedMethod === "survey" ? "100" : "3"}
        </span>{" "}
        based on your method, but you can adjust.
      </Message>

      {stage === "configure" && selectedMethod && (
        <Message
          variant="orchestrator"
          embed={
            <PanelSizeSelector
              method={selectedMethod}
              value={panelSize}
              onChange={setPanelSize}
              onConfirm={startSimulation}
              disabled={isLoading}
            />
          }
        />
      )}

      {(stage === "running" || stage === "complete") && (
        <>
          <Message variant="user" status="sent">
            Run with {panelSize} respondents.
          </Message>

          {stage === "running" && (
            <Message variant="orchestrator">
              Simulating now. Each respondent is grounded in a unique persona
              profile — watch them stream in below.
            </Message>
          )}

          {stage === "complete" && (
            <Message variant="orchestrator">
              All respondents are in. Click any card to drill into their full
              response set, or continue to synthesis.
            </Message>
          )}

          <Message
            variant="orchestrator"
            embed={
              <SimulationView
                progress={simulationProgress}
                method={selectedMethod}
                streamingRespondents={streamingRespondents}
                stage={stage}
              />
            }
          />

          {error && (
            <Message variant="orchestrator">
              <div className="flex items-start gap-2 text-scarlet">
                <AlertCircleIcon className="w-4 h-4 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold mb-1">
                    Simulation hit a snag.
                  </p>
                  <p className="text-xs mb-2">{error}</p>
                  {streamingRespondents.length > 0 && (
                    <div className="text-[11px] text-ink-mid mb-2 neu-pill px-2 py-1 rounded inline-block">
                      ✓ {streamingRespondents.length} respondents captured —
                      your progress is saved.
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    <button
                      onClick={() => {
                        retryCurrentStep();
                        hasStarted.current = false;
                        setPanelResults(null);
                        setSimulationProgress(null);
                        resetStreamingRespondents();
                        setStage("configure");
                      }}
                      className="text-xs text-white bg-scarlet hover:bg-scarlet/80 px-3 py-1 rounded flex items-center gap-1"
                    >
                      <RefreshCwIcon className="w-3 h-3" />
                      Restart from configure
                    </button>
                    {streamingRespondents.length > 0 && (
                      <button
                        onClick={() => {
                          // Proceed with whatever we have
                          setPanelResults({
                            method: "survey",
                            respondents:
                              streamingRespondents as SurveyRespondent[],
                          });
                          setSimulationProgress({
                            current: streamingRespondents.length,
                            total: streamingRespondents.length,
                            phase: "complete",
                          });
                          setStage("complete");
                          setError(null);
                        }}
                        className="text-xs neu-button-primary px-3 py-1 rounded flex items-center gap-1"
                      >
                        Continue with {streamingRespondents.length} respondents →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </Message>
          )}

          {stage === "complete" && (
            <Message
              variant="orchestrator"
              embed={
                <button
                  onClick={() => advanceToStep(5)}
                  className="w-full py-2.5 px-4 text-sm font-semibold neu-button-primary rounded-lg flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Synthesize insights
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              }
            />
          )}
        </>
      )}
    </div>
  );
}

function SimulationView({
  progress,
  method,
  streamingRespondents,
  stage,
}: {
  progress: SimulationProgress | null;
  method: ResearchMethod | null;
  streamingRespondents: (SurveyRespondent | InterviewRespondent)[];
  stage: "configure" | "running" | "complete";
}) {
  const pct = progress && progress.total > 0
    ? (progress.current / progress.total) * 100
    : 0;

  return (
    <div className="neu-card-sm rounded-xl overflow-hidden">
      {/* Progress header */}
      {progress && stage === "running" && (
        <div className="px-4 py-3 border-b border-line bg-gradient-to-r from-prism-50 to-white">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-ink-mid">
              {progress.currentBatch ?? "Starting..."}
            </span>
            <span className="text-xs font-bold text-magenta">
              {progress.current}/{progress.total}
            </span>
          </div>
          <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-prism-500 to-prism-400 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Summary bar (after complete) */}
      {stage === "complete" && progress && (
        <div className="px-4 py-3 border-b border-line bg-sky/10/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="w-4 h-4 text-sky" />
            <span className="text-xs font-bold text-sky">
              {progress.total} respondents simulated
            </span>
          </div>
          <span className="text-[10px] text-ink-low flex items-center gap-1">
            <Eye className="w-3 h-3" />
            Click any card to expand
          </span>
        </div>
      )}

      {/* Respondent cards (streamed in) */}
      <div className="px-3 py-3 max-h-96 overflow-y-auto">
        {streamingRespondents.length === 0 ? (
          <div className="py-8 text-center">
            <div className="inline-flex items-center gap-1.5 text-xs text-ink-low">
              <div className="w-3 h-3 border-2 border-magenta/40 border-t-prism-600 rounded-full animate-spin" />
              Waiting for first batch...
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {streamingRespondents.map((r, i) => (
              <RespondentCard key={r.respondentId + i} respondent={r} index={i} />
            ))}
          </div>
        )}
      </div>

      {stage === "running" && method === "survey" && streamingRespondents.length > 0 && (
        <div className="px-4 py-2 border-t border-line bg-bg-raised/60">
          <p className="text-[10px] text-ink-low text-center italic">
            More respondents streaming in...
          </p>
        </div>
      )}
    </div>
  );
}
