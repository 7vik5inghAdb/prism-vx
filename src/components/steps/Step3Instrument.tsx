"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  CheckCircleIcon,
  AlertCircleIcon,
  RefreshCwIcon,
  ArrowRight,
  Plus,
  X,
} from "lucide-react";
import { Message } from "@/components/conversation/Message";
import { EditableText } from "@/components/conversation/EditableText";
import { MethodsCatalog } from "@/components/conversation/MethodsCatalog";
import type { ResearchMethod, Question } from "@/types";

function QuestionRow({
  question,
  index,
  onUpdate,
  onDelete,
  variantsLabel,
}: {
  question: Question;
  index: number;
  onUpdate: (q: Question) => void;
  onDelete: () => void;
  variantsLabel?: string;
}) {
  const styles = {
    likert: { bg: "bg-sky/10", text: "text-sky", label: "LIKERT" },
    rating: { bg: "bg-sky/10", text: "text-sky", label: "RATING" },
    open_ended: { bg: "bg-harvest/10", text: "text-harvest", label: "OPEN" },
  };
  const style = styles[question.type];

  return (
    <div className="group flex items-start gap-2 px-3 py-2.5 border-b border-line last:border-0 hover:bg-bg-elevated/40 transition-colors">
      <span className="text-[10px] text-ink-low font-bold w-5 flex-shrink-0 mt-1">
        {index + 1}.
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          <span
            className={cn(
              "text-[8px] font-bold px-1.5 py-0.5 rounded",
              style.bg,
              style.text
            )}
          >
            {style.label}
          </span>
          {variantsLabel && (
            <button
              onClick={() =>
                onUpdate({
                  ...question,
                  perVariant: !question.perVariant,
                } as Question)
              }
              className={cn(
                "text-[8px] font-bold px-1.5 py-0.5 rounded transition-all hover:scale-105",
                question.perVariant
                  ? "bg-magenta/15 text-magenta border border-magenta/40"
                  : "neu-pill text-ink-low"
              )}
              title={
                question.perVariant
                  ? `Asked once per ${variantsLabel.toLowerCase()} — click to make cross-${variantsLabel.toLowerCase()}`
                  : `Asked once total — click to make per-${variantsLabel.toLowerCase()}`
              }
            >
              {question.perVariant
                ? `PER-${variantsLabel.toUpperCase()}`
                : `CROSS-${variantsLabel.toUpperCase()}`}
            </button>
          )}
          {question.type === "rating" && (
            <span className="text-[9px] text-ink-low">
              {question.min}–{question.max}
            </span>
          )}
        </div>
        <EditableText
          value={question.text}
          onSave={(v) => onUpdate({ ...question, text: v })}
          multiline
          textClassName="text-[12px] text-ink-high leading-relaxed"
        />
      </div>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-ink-low hover:text-scarlet"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

function QuestionCountGuardrail({
  instrument,
}: {
  instrument: import("@/types").ResearchInstrument;
}) {
  const perVariantCount = instrument.questions.filter((q) => q.perVariant).length;
  const crossCount = instrument.questions.length - perVariantCount;
  const variantCount = instrument.variants?.items.length ?? 1;
  const totalAsked = perVariantCount * variantCount + crossCount;
  const SOFT_CAP = 30;
  const overCap = totalAsked > SOFT_CAP;

  if (!instrument.variants) {
    // Non-variant studies — just show count
    return (
      <div className="bg-bg-deep/40 border-b border-line px-4 py-1.5 text-[10px] text-ink-low">
        {instrument.questions.length} total questions per respondent
      </div>
    );
  }

  return (
    <div
      className={cn(
        "px-4 py-2 border-b border-line text-[11px] flex items-start gap-2",
        overCap
          ? "bg-yellow/10 border-yellow/30 text-yellow"
          : "bg-bg-deep/40 text-ink-mid"
      )}
    >
      {overCap && <span className="text-yellow flex-shrink-0">⚠</span>}
      <div className="flex-1">
        <span className="font-semibold">
          {perVariantCount} per-{instrument.variants.label.toLowerCase()} × {variantCount} {instrument.variants.label.toLowerCase()}s
          {crossCount > 0 ? ` + ${crossCount} cross-${instrument.variants.label.toLowerCase()}` : ""}
          {" = "}
          <span className={overCap ? "text-yellow" : "text-magenta"}>
            {totalAsked} questions per respondent
          </span>
        </span>
        {overCap && (
          <p className="text-[10px] mt-0.5 leading-snug opacity-90">
            Above the recommended max of {SOFT_CAP}. Long instruments slow simulation and risk batch timeouts. Consider moving a per-{instrument.variants.label.toLowerCase()} question to cross-{instrument.variants.label.toLowerCase()}, or deleting one.
          </p>
        )}
      </div>
    </div>
  );
}

export function Step3Instrument() {
  const {
    context,
    interpretation,
    personas,
    selectedMethod,
    instrument,
    isLoading,
    error,
    setLoading,
    setError,
    setSelectedMethod,
    setInstrument,
    advanceToStep,
    retryCurrentStep,
  } = useAppStore();

  const [pendingMethod, setPendingMethod] = useState<ResearchMethod | null>(
    selectedMethod
  );

  async function handleGenerateInstrument(method: ResearchMethod) {
    if (!context || !interpretation || !personas) return;
    setSelectedMethod(method);
    setLoading(true, "Designing your research instrument...");
    try {
      const res = await fetch("/api/instrument", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context,
          interpretation,
          personas,
          method,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setInstrument(data.instrument);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong designing the instrument."
      );
    } finally {
      setLoading(false);
    }
  }

  function selectMethod(m: ResearchMethod) {
    setPendingMethod(m);
  }

  function confirmMethodAndGenerate() {
    if (pendingMethod) handleGenerateInstrument(pendingMethod);
  }

  function updateQuestion(idx: number, updated: Question) {
    if (!instrument) return;
    const qs = [...instrument.questions];
    qs[idx] = updated;
    setInstrument({ ...instrument, questions: qs });
  }

  function deleteQuestion(idx: number) {
    if (!instrument) return;
    setInstrument({
      ...instrument,
      questions: instrument.questions.filter((_, i) => i !== idx),
    });
  }

  function addQuestion(type: Question["type"]) {
    if (!instrument) return;
    const newId = `q_${Date.now()}`;
    let newQ: Question;
    if (type === "likert") {
      newQ = {
        id: newId,
        type: "likert",
        text: "New question — click to edit",
        scale: [
          "Strongly Disagree",
          "Disagree",
          "Neutral",
          "Agree",
          "Strongly Agree",
        ],
      };
    } else if (type === "rating") {
      newQ = {
        id: newId,
        type: "rating",
        text: "New rating question — click to edit",
        min: 1,
        max: 5,
        minLabel: "Low",
        maxLabel: "High",
      };
    } else {
      newQ = {
        id: newId,
        type: "open_ended",
        text: "New open-ended question — click to edit",
      };
    }
    setInstrument({ ...instrument, questions: [...instrument.questions, newQ] });
  }

  return (
    <div className="space-y-1">
      <Message variant="orchestrator">
        Now let&rsquo;s pick your research method. The two MVP methods on the
        right are available now — the rest are on our roadmap. Hover any
        method to see what it does and when to use it.
      </Message>

      {!instrument && (
        <Message
          variant="orchestrator"
          embed={
            <MethodsCatalog
              selectedMethod={pendingMethod}
              onSelect={selectMethod}
            />
          }
        />
      )}

      {!instrument && pendingMethod && (
        <>
          <Message variant="user" status="sent">
            I&rsquo;ll go with{" "}
            <span className="font-semibold capitalize">{pendingMethod}</span>.
          </Message>
          <Message
            variant="orchestrator"
            embed={
              <button
                onClick={confirmMethodAndGenerate}
                disabled={isLoading}
                className="w-full py-2.5 px-4 text-sm font-semibold neu-button-primary rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Designing your instrument...
                  </>
                ) : (
                  <>
                    Generate {pendingMethod} questions
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            }
          />
        </>
      )}

      {isLoading && !instrument && (
        <Message variant="orchestrator" status="thinking" />
      )}

      {error && !instrument && (
        <Message variant="orchestrator">
          <div className="flex items-start gap-2 text-scarlet">
            <AlertCircleIcon className="w-4 h-4 mt-0.5" />
            <div>
              <p className="text-sm font-semibold mb-1">
                I had trouble designing the instrument.
              </p>
              <p className="text-xs">{error}</p>
              <button
                onClick={() => {
                  retryCurrentStep();
                  if (pendingMethod) handleGenerateInstrument(pendingMethod);
                }}
                className="text-[11px] mt-1.5 underline flex items-center gap-1"
              >
                <RefreshCwIcon className="w-3 h-3" />
                Retry
              </button>
            </div>
          </div>
        </Message>
      )}

      {instrument && (
        <>
          <Message variant="orchestrator">
            Here&rsquo;s your {selectedMethod} instrument. Click any question
            to edit it inline, delete with the × icon, or add new questions
            below. When it looks right, we&rsquo;ll move to panel simulation.
          </Message>

          <Message
            variant="orchestrator"
            embed={
              <div className="neu-card-sm rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-line bg-bg-raised">
                  <EditableText
                    value={instrument.title}
                    onSave={(v) => setInstrument({ ...instrument, title: v })}
                    textClassName="text-sm font-bold text-ink-high"
                  />
                  <EditableText
                    value={instrument.description}
                    onSave={(v) =>
                      setInstrument({ ...instrument, description: v })
                    }
                    multiline
                    textClassName="text-[11px] text-ink-low mt-0.5"
                  />
                  {instrument.variants && (
                    <div className="mt-2 flex items-center gap-1 flex-wrap">
                      <span className="text-[9px] text-ink-low font-semibold uppercase tracking-wider">
                        {instrument.variants.label}s ({instrument.variants.items.length}):
                      </span>
                      {instrument.variants.items.map((v) => (
                        <span
                          key={v.id}
                          className="text-[10px] bg-yellow/10 text-yellow px-1.5 py-0.5 rounded border border-yellow/30"
                          title={v.text}
                        >
                          {v.text.length > 25
                            ? v.text.slice(0, 23) + "…"
                            : v.text}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-magenta/10 border-b border-magenta/30 px-4 py-2">
                  <p className="text-[11px] text-magenta leading-relaxed">
                    <span className="font-semibold">Rationale: </span>
                    {instrument.rationale}
                  </p>
                </div>

                <QuestionCountGuardrail instrument={instrument} />


                <div className="max-h-72 overflow-y-auto">
                  {instrument.questions.map((q, i) => (
                    <QuestionRow
                      key={q.id}
                      question={q}
                      index={i}
                      onUpdate={(u) => updateQuestion(i, u)}
                      onDelete={() => deleteQuestion(i)}
                      variantsLabel={instrument.variants?.label}
                    />
                  ))}
                </div>

                <div className="px-3 py-2 border-t border-line bg-bg-raised flex gap-1.5 flex-wrap">
                  <span className="text-[10px] text-ink-low self-center mr-1">
                    Add:
                  </span>
                  <button
                    onClick={() => addQuestion("likert")}
                    className="text-[10px] text-sky bg-sky/10 hover:bg-sky/15 px-2 py-1 rounded font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-2.5 h-2.5" /> Likert
                  </button>
                  <button
                    onClick={() => addQuestion("rating")}
                    className="text-[10px] text-sky bg-sky/10 hover:bg-sky/15 px-2 py-1 rounded font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-2.5 h-2.5" /> Rating
                  </button>
                  <button
                    onClick={() => addQuestion("open_ended")}
                    className="text-[10px] text-harvest bg-harvest/10 hover:bg-harvest/15 px-2 py-1 rounded font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-2.5 h-2.5" /> Open-ended
                  </button>
                </div>
              </div>
            }
          />

          <Message
            variant="orchestrator"
            embed={
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setInstrument(null);
                    setPendingMethod(null);
                    setSelectedMethod(null);
                  }}
                  className="flex-1 py-2 px-3 text-xs font-semibold text-ink-mid neu-button rounded-lg"
                >
                  Change method
                </button>
                <button
                  onClick={() =>
                    selectedMethod && handleGenerateInstrument(selectedMethod)
                  }
                  className="flex-1 py-2 px-3 text-xs font-semibold text-ink-mid neu-button rounded-lg flex items-center justify-center gap-1"
                >
                  <RefreshCwIcon className="w-3 h-3" />
                  Regenerate all
                </button>
                <button
                  onClick={() => advanceToStep(4)}
                  className="flex-[2] py-2 px-4 text-xs font-semibold neu-button-primary rounded-lg flex items-center justify-center gap-1.5"
                >
                  <CheckCircleIcon className="w-3.5 h-3.5" />
                  Confirm & set up panel
                </button>
              </div>
            }
          />
        </>
      )}
    </div>
  );
}
