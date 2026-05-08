"use client";

import { useAppStore } from "@/lib/store";
import type { Step } from "@/types";
import { cn } from "@/lib/utils";
import {
  FileText,
  Users,
  ListChecks,
  BarChart2,
  Sparkles,
  Lock,
} from "lucide-react";
import { RespondentCard } from "@/components/conversation/RespondentCard";

const STEP_ICON: Record<Step, React.ElementType> = {
  1: FileText,
  2: Users,
  3: ListChecks,
  4: BarChart2,
  5: Sparkles,
};

export function StepRecapDetail({ step }: { step: Step }) {
  const Icon = STEP_ICON[step];
  return (
    <div className="neu-card-sm rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-line bg-bg-deep/40">
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-magenta" />
          <span className="text-[11px] font-bold text-ink-mid uppercase tracking-wider">
            Step {step} · Reference
          </span>
        </div>
        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-ink-low neu-pill px-1.5 py-0.5 rounded-full">
          <Lock className="w-2.5 h-2.5" />
          READ ONLY
        </span>
      </div>
      <div className="p-3 max-h-[60vh] overflow-y-auto">
        {step === 1 && <Step1Detail />}
        {step === 2 && <Step2Detail />}
        {step === 3 && <Step3Detail />}
        {step === 4 && <Step4Detail />}
        {step === 5 && <Step5Detail />}
      </div>
    </div>
  );
}

function LabelBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[9px] font-bold text-ink-low uppercase tracking-widest mb-1">
        {label}
      </p>
      <div className="text-xs text-ink-mid leading-relaxed">{children}</div>
    </div>
  );
}

function Step1Detail() {
  const { context, interpretation } = useAppStore();
  if (!interpretation) return <Empty />;
  return (
    <div className="space-y-3">
      <LabelBlock label="Summary">{interpretation.summary}</LabelBlock>
      <LabelBlock label="Hypothesis">
        {interpretation.restatedHypothesis}
      </LabelBlock>
      <LabelBlock label="Product / Feature">
        {interpretation.restatedProduct}
      </LabelBlock>
      <LabelBlock label="Audience">
        {interpretation.restatedAudience}
      </LabelBlock>
      <LabelBlock label="Research Focus">
        <span className="text-magenta font-medium">
          {interpretation.researchFocus}
        </span>
      </LabelBlock>
      <LabelBlock label="Objectives">
        <ul className="space-y-1">
          {interpretation.restatedObjectives.map((o, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <span className="text-magenta font-bold flex-shrink-0">
                {i + 1}.
              </span>
              <span>{o}</span>
            </li>
          ))}
        </ul>
      </LabelBlock>
      {interpretation.potentialChallenges?.length > 0 && (
        <LabelBlock label="Potential Challenges">
          <ul className="space-y-1">
            {interpretation.potentialChallenges.map((c, i) => (
              <li
                key={i}
                className="flex items-start gap-1.5 text-yellow/90"
              >
                <span className="text-yellow flex-shrink-0">⚠</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </LabelBlock>
      )}
      {interpretation.studyType === "concept_test" &&
        interpretation.variants && (
          <LabelBlock label={`Variants (${interpretation.variants.label})`}>
            <ul className="space-y-1">
              {interpretation.variants.items.map((v, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-magenta font-bold flex-shrink-0">
                    {i + 1}.
                  </span>
                  <span>&ldquo;{v}&rdquo;</span>
                </li>
              ))}
            </ul>
          </LabelBlock>
        )}
      {context?.attachments && context.attachments.length > 0 && (
        <LabelBlock label="Attachments">
          <ul className="space-y-1">
            {context.attachments.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-1.5 text-[11px]"
              >
                <span className="text-[8px] font-bold uppercase neu-pill px-1 py-0.5 rounded text-ink-low">
                  {a.kind}
                </span>
                <span className="truncate">{a.name}</span>
              </li>
            ))}
          </ul>
        </LabelBlock>
      )}
    </div>
  );
}

const CLUSTER_DOT_COLORS = [
  "bg-sky",
  "bg-magenta",
  "bg-yellow",
  "bg-harvest",
  "bg-scarlet",
];

function Step2Detail() {
  const { personas } = useAppStore();
  if (!personas) return <Empty />;
  return (
    <div className="space-y-3">
      <p className="text-[10px] text-ink-low">
        {personas.length} persona cluster{personas.length === 1 ? "" : "s"} ·
        sample sizes total{" "}
        {personas.reduce((acc, p) => acc + p.sampleSize, 0)}%
      </p>
      {personas.map((p, i) => (
        <div key={p.id} className="neu-inset rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={cn(
                  "w-2 h-2 rounded-full flex-shrink-0",
                  CLUSTER_DOT_COLORS[i % CLUSTER_DOT_COLORS.length]
                )}
              />
              <span className="text-sm font-bold text-ink-high truncate">
                {p.name}
              </span>
            </div>
            <span className="text-[10px] text-magenta font-bold neu-pill px-1.5 py-0.5 rounded flex-shrink-0">
              ~{p.sampleSize}%
            </span>
          </div>
          <p className="text-[11px] text-ink-mid leading-relaxed">
            {p.description}
          </p>
          <p className="text-[11px] text-ink-low italic leading-relaxed">
            {p.narrativeProfile}
          </p>
          <div className="space-y-1.5">
            {p.dimensions.map((d) => (
              <div key={d.name} className="bg-bg-elevated/50 rounded p-2">
                <p className="text-[10px] font-semibold text-ink-mid mb-0.5">
                  {d.name}
                </p>
                <p className="text-[10px] text-ink-low mb-1">
                  {d.description}
                </p>
                <div className="flex flex-wrap gap-1">
                  {d.values.map((v) => (
                    <span
                      key={v}
                      className="text-[9px] neu-pill px-1.5 py-0.5 rounded text-ink-mid"
                    >
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Step3Detail() {
  const { instrument, selectedMethod } = useAppStore();
  if (!instrument) return <Empty />;
  const counts = {
    likert: instrument.questions.filter((q) => q.type === "likert").length,
    rating: instrument.questions.filter((q) => q.type === "rating").length,
    open: instrument.questions.filter((q) => q.type === "open_ended").length,
  };
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-sm font-bold text-ink-high">{instrument.title}</p>
        <p className="text-[11px] text-ink-low leading-relaxed">
          {instrument.description}
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5 text-[10px]">
        <span className="neu-pill px-1.5 py-0.5 rounded text-ink-mid">
          Method:{" "}
          <span className="text-magenta font-bold capitalize">
            {selectedMethod}
          </span>
        </span>
        <span className="neu-pill px-1.5 py-0.5 rounded text-ink-mid">
          {instrument.questions.length} questions
        </span>
        {counts.likert > 0 && (
          <span className="neu-pill px-1.5 py-0.5 rounded text-sky">
            {counts.likert} Likert
          </span>
        )}
        {counts.rating > 0 && (
          <span className="neu-pill px-1.5 py-0.5 rounded text-sky">
            {counts.rating} Rating
          </span>
        )}
        {counts.open > 0 && (
          <span className="neu-pill px-1.5 py-0.5 rounded text-harvest">
            {counts.open} Open-ended
          </span>
        )}
      </div>
      <div className="bg-magenta/10 border border-magenta/30 rounded-lg p-2.5">
        <p className="text-[9px] font-bold text-magenta uppercase tracking-widest mb-1">
          Rationale
        </p>
        <p className="text-[11px] text-ink-mid leading-relaxed">
          {instrument.rationale}
        </p>
      </div>
      {instrument.variants && (
        <div className="bg-yellow/10 border border-yellow/30 rounded-lg p-2.5">
          <p className="text-[9px] font-bold text-yellow uppercase tracking-widest mb-1">
            Variants ({instrument.variants.items.length}{" "}
            {instrument.variants.label}s)
          </p>
          <ul className="space-y-0.5">
            {instrument.variants.items.map((v, i) => (
              <li key={v.id} className="text-[11px] text-yellow/90">
                <span className="font-bold">{i + 1}.</span> &ldquo;{v.text}&rdquo;
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="space-y-1.5">
        <p className="text-[9px] font-bold text-ink-low uppercase tracking-widest">
          Questions
        </p>
        {instrument.questions.map((q, i) => (
          <div
            key={q.id}
            className="bg-bg-elevated/40 rounded p-2 flex items-start gap-2"
          >
            <span className="text-[10px] text-ink-low font-bold flex-shrink-0 w-5 mt-0.5">
              {i + 1}.
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 flex-wrap mb-1">
                <span
                  className={cn(
                    "text-[8px] font-bold px-1 py-0.5 rounded",
                    q.type === "likert" && "bg-sky/15 text-sky",
                    q.type === "rating" && "bg-sky/15 text-sky",
                    q.type === "open_ended" && "bg-harvest/15 text-harvest"
                  )}
                >
                  {q.type === "likert"
                    ? "LIKERT"
                    : q.type === "rating"
                    ? "RATING"
                    : "OPEN"}
                </span>
                {q.perVariant && (
                  <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-magenta/15 text-magenta">
                    PER-VARIANT
                  </span>
                )}
                {q.type === "rating" && (
                  <span className="text-[9px] text-ink-low">
                    {q.min}–{q.max}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-ink-mid leading-relaxed">
                {q.text}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Step4Detail() {
  const { panelResults } = useAppStore();
  if (!panelResults) return <Empty />;
  const respondents = panelResults.respondents;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-ink-high">
          {respondents.length} respondents simulated
        </p>
        <span className="text-[10px] neu-pill px-2 py-0.5 rounded text-magenta capitalize font-bold">
          {panelResults.method}
        </span>
      </div>
      <p className="text-[10px] text-ink-low">
        Click any respondent to see their full response set.
      </p>
      <div className="space-y-1.5">
        {respondents.map((r, i) => (
          <RespondentCard key={r.respondentId + i} respondent={r} index={i} />
        ))}
      </div>
    </div>
  );
}

function Step5Detail() {
  const { report } = useAppStore();
  if (!report) return <Empty />;
  return (
    <div className="space-y-3">
      <LabelBlock label="Executive Summary">
        {report.executiveSummary}
      </LabelBlock>
      {report.qualitativeOverview && (
        <LabelBlock label="Qualitative Overview">
          {report.qualitativeOverview}
        </LabelBlock>
      )}
      {report.adrsRecommendation && (
        <div className="bg-magenta/10 border border-magenta/40 rounded-lg p-3">
          <p className="text-[9px] font-bold text-magenta uppercase tracking-widest mb-1">
            Recommendation
          </p>
          <p className="text-sm font-bold text-ink-high mb-1">
            &ldquo;{report.adrsRecommendation.taglineText}&rdquo;
          </p>
          <p className="text-[11px] text-ink-mid">
            {report.adrsRecommendation.primaryRecommendation}
          </p>
        </div>
      )}
      <LabelBlock label={`Recommendations (${report.recommendations.length})`}>
        <ul className="space-y-1">
          {report.recommendations.map((r, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <span className="text-magenta font-bold flex-shrink-0">
                {i + 1}.
              </span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </LabelBlock>
    </div>
  );
}

function Empty() {
  return (
    <p className="text-[11px] text-ink-dim italic text-center py-4">
      No data captured for this step yet.
    </p>
  );
}
