"use client";

import { X, Shield, TrendingUp, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import type { ConfidenceScore } from "@/types";
import { cn } from "@/lib/utils";

export function ConfidenceModal({
  open,
  onClose,
  confidence,
}: {
  open: boolean;
  onClose: () => void;
  confidence: ConfidenceScore;
}) {
  if (!open) return null;

  const color =
    confidence.score >= 70
      ? "text-sky"
      : confidence.score >= 50
      ? "text-yellow"
      : "text-scarlet";
  const ringColor =
    confidence.score >= 70
      ? "ring-green-200"
      : confidence.score >= 50
      ? "ring-amber-200"
      : "ring-red-200";
  const dotColor =
    confidence.score >= 70
      ? "bg-sky/100"
      : confidence.score >= 50
      ? "bg-yellow/100"
      : "bg-scarlet";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[85vh] neu-card rounded-2xl overflow-hidden animate-slide-in flex flex-col glow-magenta-soft"
      >
        <div className="flex-shrink-0 flex items-start justify-between px-6 py-4 border-b border-line">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-12 h-12 rounded-full bg-bg-deep border-2 flex items-center justify-center ring-4",
                ringColor,
                confidence.score >= 70
                  ? "border-sky"
                  : confidence.score >= 50
                  ? "border-yellow"
                  : "border-scarlet"
              )}
            >
              <Shield className={cn("w-6 h-6", color)} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-ink-low uppercase tracking-widest">
                Confidence Score
              </p>
              <div className="flex items-baseline gap-2">
                <span className={cn("text-3xl font-black", color)}>
                  {confidence.score}
                </span>
                <span className="text-sm text-ink-low font-semibold">/ 100</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-bg-elevated transition-colors"
          >
            <X className="w-4 h-4 text-ink-low" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Reasoning */}
          <div>
            <h3 className="text-xs font-bold text-ink-mid uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span className={cn("w-1.5 h-1.5 rounded-full", dotColor)} />
              How this score was derived
            </h3>
            <p className="text-sm text-ink-mid leading-relaxed neu-inset rounded-lg p-3">
              {confidence.reasoning}
            </p>
          </div>

          {/* Secondary validation summary */}
          <div>
            <h3 className="text-xs font-bold text-ink-mid uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-magenta" />
              Secondary Analysis: Market Alignment
            </h3>
            <p className="text-sm text-ink-mid leading-relaxed bg-magenta/10 border border-magenta/30 rounded-lg p-3">
              {confidence.alignmentNotes}
            </p>
            <p className="text-[10px] text-ink-low mt-1.5 italic">
              A secondary LLM analyst reviewed primary findings against general market knowledge to flag inconsistencies and identify alignment.
            </p>
          </div>

          {/* Strengths */}
          {confidence.strengthFactors.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-ink-mid uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-sky" />
                What contributes to confidence
              </h3>
              <div className="space-y-1.5">
                {confidence.strengthFactors.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 bg-sky/10 border border-sky/30 rounded-lg p-2.5"
                  >
                    <span className="text-sky font-bold text-xs leading-none mt-0.5">+</span>
                    <span className="text-xs text-sky leading-relaxed">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Limitations */}
          {confidence.limitationFactors.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-ink-mid uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5 text-scarlet" />
                What limits confidence
              </h3>
              <div className="space-y-1.5">
                {confidence.limitationFactors.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 bg-scarlet/10 border border-scarlet/30 rounded-lg p-2.5"
                  >
                    <span className="text-scarlet font-bold text-xs leading-none mt-0.5">−</span>
                    <span className="text-xs text-scarlet leading-relaxed">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bias flags */}
          {confidence.biasFlags.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-ink-mid uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-yellow" />
                Detected Bias Risks
              </h3>
              <div className="space-y-1.5">
                {confidence.biasFlags.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 bg-yellow/10 border border-yellow/30 rounded-lg p-2.5"
                  >
                    <span className="text-yellow font-bold text-xs leading-none mt-0.5">⚠</span>
                    <span className="text-xs text-yellow leading-relaxed">{f}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-ink-low mt-2 italic">
                These are biases the system actively flagged. They don&rsquo;t invalidate findings — they signal where to apply extra scrutiny or follow up with real research.
              </p>
            </div>
          )}

          {/* Scoring rubric */}
          <div className="neu-inset rounded-lg p-3">
            <h3 className="text-[10px] font-bold text-ink-low uppercase tracking-widest mb-2">
              Scoring Rubric
            </h3>
            <div className="space-y-1 text-[11px] text-ink-mid">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky/100 flex-shrink-0" />
                <span>
                  <span className="font-bold">80–100:</span> Strong, consistent findings, well-grounded
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow/100 flex-shrink-0" />
                <span>
                  <span className="font-bold">60–79:</span> Solid with some gaps or minor inconsistencies
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow/50 flex-shrink-0" />
                <span>
                  <span className="font-bold">40–59:</span> Directionally useful, requires validation
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-scarlet flex-shrink-0" />
                <span>
                  <span className="font-bold">0–39:</span> Significant issues; not reliable on its own
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 px-6 py-3 border-t border-line bg-bg-raised">
          <p className="text-[10px] text-ink-low text-center">
            Synthetic research insights · Validate with real users before major decisions
          </p>
        </div>
      </div>
    </div>
  );
}
