"use client";

import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/lib/store";
import { cn, downloadText } from "@/lib/utils";
import {
  AlertCircleIcon,
  RefreshCwIcon,
  FileTextIcon,
  FileIcon,
  CheckCircleIcon,
  Info,
  Shield,
} from "lucide-react";
import { Message } from "@/components/conversation/Message";
import { EditableText } from "@/components/conversation/EditableText";
import { ConfidenceModal } from "@/components/conversation/ConfidenceModal";
import type {
  SurveyRespondent,
  InterviewRespondent,
  ResearchReport,
} from "@/types";

export function Step5Report() {
  const {
    context,
    interpretation,
    personas,
    selectedMethod,
    instrument,
    panelResults,
    report,
    isLoading,
    error,
    setLoading,
    setError,
    setReport,
    retryCurrentStep,
  } = useAppStore();

  const hasStarted = useRef(false);
  const [phase, setPhase] = useState<
    "synthesis" | "confidence" | "done"
  >(report ? "done" : "synthesis");
  const [isDownloading, setIsDownloading] = useState(false);
  const [confidenceOpen, setConfidenceOpen] = useState(false);

  useEffect(() => {
    if (!report && !hasStarted.current && !error) {
      hasStarted.current = true;
      runSynthesis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runSynthesis() {
    if (!selectedMethod || !panelResults || !instrument || !personas || !interpretation || !context) return;

    setLoading(true, "Running insight synthesis...");
    setPhase("synthesis");

    try {
      const respondents =
        panelResults.method === "survey"
          ? (panelResults.respondents as SurveyRespondent[])
          : (panelResults.respondents as InterviewRespondent[]);

      const synthRes = await fetch("/api/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: selectedMethod,
          respondents,
          instrument,
          personas,
          interpretation,
          context,
        }),
      });
      const synthData = await synthRes.json();
      if (!synthRes.ok) throw new Error(synthData.error || "Synthesis failed");

      setPhase("confidence");

      const confRes = await fetch("/api/confidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primaryFindings: synthData.synthesis,
          method: selectedMethod,
          panelSize: respondents.length,
          hypothesis: interpretation.restatedHypothesis,
        }),
      });
      const confData = await confRes.json();
      if (!confRes.ok) throw new Error(confData.error || "Confidence failed");

      setPhase("done");

      const s = synthData.synthesis;
      const finalReport: ResearchReport = {
        background: s.background ?? "",
        executiveSummary: s.executiveSummary,
        qualitativeOverview: s.qualitativeOverview ?? "",
        keyFindings: s.keyFindings,
        recommendations: s.recommendations,
        confidenceScore: confData.confidenceScore,
        methodologyNote: s.methodologyNote,
        generatedAt: new Date().toISOString(),
        panelSize: respondents.length,
        researchMethod: selectedMethod,
        participantProfile: s.participantProfile,
        variantPerformance: s.variantPerformance,
        crossThemes: s.crossThemes,
        strategicTakeaways: s.strategicTakeaways,
        adrsRecommendation: s.adrsRecommendation,
      };
      await new Promise((r) => setTimeout(r, 300));
      setReport(finalReport);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Synthesis failed. This is usually temporary."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadPDF() {
    if (!report || !context) return;
    setIsDownloading(true);
    try {
      const { generatePDF } = await import("@/lib/pdf");
      await generatePDF(report, context);
    } finally {
      setIsDownloading(false);
    }
  }

  function handleDownloadMarkdown() {
    if (!report || !context) return;
    import("@/lib/pdf").then(({ generateMarkdown }) => {
      const md = generateMarkdown(report, context);
      downloadText(md, `prism-report-${Date.now()}.md`, "text/markdown");
    });
  }

  function updateReport(patch: Partial<ResearchReport>) {
    if (!report) return;
    setReport({ ...report, ...patch });
  }

  return (
    <div className="space-y-1">
      <Message variant="orchestrator">
        Now I&rsquo;ll synthesize the panel data into a structured report. This
        runs two analyses: a primary synthesis pulling themes from your panel,
        then a secondary analyst that scores how confident we should be in the
        findings.
      </Message>

      {(isLoading || phase !== "done") && !report && !error && (
        <Message
          variant="orchestrator"
          embed={<SynthesisProgress phase={phase} />}
        />
      )}

      {error && (
        <Message variant="orchestrator">
          <div className="flex items-start gap-2 text-scarlet">
            <AlertCircleIcon className="w-4 h-4 mt-0.5" />
            <div>
              <p className="text-sm font-semibold mb-1">Synthesis failed</p>
              <p className="text-xs mb-2">{error}</p>
              <button
                onClick={() => {
                  retryCurrentStep();
                  hasStarted.current = false;
                  runSynthesis();
                }}
                className="text-xs text-white bg-scarlet hover:bg-scarlet/80 px-3 py-1 rounded flex items-center gap-1"
              >
                <RefreshCwIcon className="w-3 h-3" /> Retry
              </button>
            </div>
          </div>
        </Message>
      )}

      {report && (
        <>
          <Message variant="orchestrator">
            Done. Here&rsquo;s your report — the left panel shows the full
            interactive version. Sections below are inline-editable if you want
            to refine the language before downloading.
          </Message>

          <Message
            variant="orchestrator"
            embed={
              <ReportSummaryCard
                report={report}
                onUpdate={updateReport}
                onOpenConfidence={() => setConfidenceOpen(true)}
              />
            }
          />

          <Message
            variant="orchestrator"
            embed={
              <div className="bg-magenta/10 border border-magenta/40 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-magenta" />
                  <span className="text-sm font-semibold text-magenta">
                    Report ready to download
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleDownloadPDF}
                    disabled={isDownloading}
                    className="flex-1 py-2.5 text-xs font-semibold neu-button-primary rounded-lg disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isDownloading ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Building PDF...
                      </>
                    ) : (
                      <>
                        <FileTextIcon className="w-3.5 h-3.5" /> Download PDF
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleDownloadMarkdown}
                    className="flex-1 py-2.5 text-xs font-semibold text-magenta bg-bg-deep border border-magenta/40 rounded-lg hover:bg-magenta/10 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <FileIcon className="w-3.5 h-3.5" /> Download Markdown
                  </button>
                </div>
              </div>
            }
          />
        </>
      )}

      {report && (
        <ConfidenceModal
          open={confidenceOpen}
          onClose={() => setConfidenceOpen(false)}
          confidence={report.confidenceScore}
        />
      )}
    </div>
  );
}

function SynthesisProgress({
  phase,
}: {
  phase: "synthesis" | "confidence" | "done";
}) {
  const steps: Array<{ label: string; key: typeof phase }> = [
    { label: "Synthesizing themes", key: "synthesis" },
    { label: "Scoring confidence", key: "confidence" },
    { label: "Assembling report", key: "done" },
  ];

  return (
    <div className="neu-card-sm rounded-xl p-4 space-y-2">
      {steps.map(({ label, key }, i) => {
        const isDone =
          (phase === "confidence" && i === 0) ||
          (phase === "done" && i <= 1);
        const isActive =
          (phase === "synthesis" && i === 0) ||
          (phase === "confidence" && i === 1) ||
          (phase === "done" && i === 2);

        return (
          <div
            key={key}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all",
              isDone
                ? "bg-sky/10 border-sky/40"
                : isActive
                ? "bg-magenta/10 border-magenta/40"
                : "bg-bg-raised border-line"
            )}
          >
            <div
              className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
                isDone
                  ? "bg-sky/100"
                  : isActive
                  ? "bg-magenta/100"
                  : "bg-bg-elevated"
              )}
            >
              {isDone ? (
                <CheckCircleIcon className="w-3.5 h-3.5 text-white" />
              ) : isActive ? (
                <div className="w-2 h-2 bg-bg-deep rounded-full animate-pulse" />
              ) : (
                <div className="w-1.5 h-1.5 bg-ink-low rounded-full" />
              )}
            </div>
            <span
              className={cn(
                "text-xs font-medium",
                isDone
                  ? "text-sky"
                  : isActive
                  ? "text-magenta"
                  : "text-ink-low"
              )}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ReportSummaryCard({
  report,
  onUpdate,
  onOpenConfidence,
}: {
  report: ResearchReport;
  onUpdate: (patch: Partial<ResearchReport>) => void;
  onOpenConfidence: () => void;
}) {
  const cs = report.confidenceScore;
  const scoreColor =
    cs.score >= 70
      ? "text-sky"
      : cs.score >= 50
      ? "text-yellow"
      : "text-scarlet";

  return (
    <div className="neu-card-sm rounded-xl p-4 space-y-3">
      <div>
        <p className="text-[10px] font-bold text-ink-low uppercase tracking-widest mb-1">
          Executive Summary
        </p>
        <EditableText
          value={report.executiveSummary}
          onSave={(v) => onUpdate({ executiveSummary: v })}
          multiline
          rows={3}
          textClassName="text-xs text-ink-mid leading-relaxed"
        />
      </div>

      <div className="neu-inset rounded-lg p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className={cn("w-4 h-4", scoreColor)} />
          <div>
            <p className="text-[10px] font-bold text-ink-low uppercase tracking-widest">
              Confidence
            </p>
            <span className={cn("text-2xl font-black", scoreColor)}>
              {cs.score}
              <span className="text-sm text-ink-low font-semibold">/100</span>
            </span>
          </div>
        </div>
        <button
          onClick={onOpenConfidence}
          className="text-[11px] text-magenta hover:text-magenta-700 hover:underline flex items-center gap-1 font-semibold"
        >
          <Info className="w-3 h-3" />
          How was this scored?
        </button>
      </div>

      {report.adrsRecommendation && (
        <div className="bg-magenta/10 border-2 border-magenta/40 rounded-lg p-3">
          <p className="text-[10px] font-bold text-magenta uppercase tracking-widest mb-1.5">
            Recommendation
          </p>
          <p className="text-sm font-bold text-ink-high mb-1">
            &ldquo;{report.adrsRecommendation.taglineText}&rdquo;
          </p>
          <p className="text-[11px] text-ink-mid leading-relaxed">
            {report.adrsRecommendation.primaryRecommendation}
          </p>
        </div>
      )}

      <div>
        <p className="text-[10px] font-bold text-ink-low uppercase tracking-widest mb-1.5">
          Top Recommendations
        </p>
        <div className="space-y-1.5">
          {report.recommendations.slice(0, 3).map((rec, i) => (
            <div
              key={i}
              className="flex items-start gap-2 text-[11px] text-ink-mid neu-inset rounded p-2"
            >
              <span className="text-magenta font-bold flex-shrink-0">
                {i + 1}.
              </span>
              <EditableText
                value={rec}
                onSave={(v) => {
                  const newRecs = [...report.recommendations];
                  newRecs[i] = v;
                  onUpdate({ recommendations: newRecs });
                }}
                multiline
                textClassName="text-[11px]"
                className="flex-1"
              />
            </div>
          ))}
          {report.recommendations.length > 3 && (
            <p className="text-[10px] text-ink-low text-center">
              +{report.recommendations.length - 3} more in full report
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
