"use client";

import { useEffect, useState } from "react";
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
import { getQuestionScope } from "@/types";
import type { ResearchMethod, Question, QuestionScope } from "@/types";

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
  const styles: Record<
    Question["type"],
    { bg: string; text: string; label: string }
  > = {
    // Question-type badge palette: navy-adjacent for closed/structured items
    // (sky), green for open/qualitative items (replaces the old harvest), and
    // magenta for advanced/structured trade-offs.
    likert: { bg: "bg-sky/10", text: "text-sky", label: "LIKERT" },
    rating: { bg: "bg-sky/10", text: "text-sky", label: "RATING" },
    open_ended: { bg: "bg-green-500/15", text: "text-green-500", label: "OPEN" },
    forced_ranking: {
      bg: "bg-magenta/10",
      text: "text-magenta",
      label: "RANKING",
    },
    allocation: {
      bg: "bg-magenta/10",
      text: "text-magenta",
      label: "ALLOCATION",
    },
    semantic_differential: {
      bg: "bg-magenta/10",
      text: "text-magenta",
      label: "SEM DIFF",
    },
    multiple_choice: { bg: "bg-sky/10", text: "text-sky", label: "MC" },
    matrix: { bg: "bg-sky/10", text: "text-sky", label: "MATRIX" },
    sentence_completion: {
      bg: "bg-green-500/15",
      text: "text-green-500",
      label: "SENTENCE",
    },
    word_association: {
      bg: "bg-green-500/15",
      text: "text-green-500",
      label: "WORD ASSOC",
    },
    scenario: { bg: "bg-green-500/15", text: "text-green-500", label: "SCENARIO" },
    yes_no_why: { bg: "bg-green-500/15", text: "text-green-500", label: "Y/N+WHY" },
    nps: { bg: "bg-sky/10", text: "text-sky", label: "NPS" },
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
            <ScopeButton
              question={question}
              variantsLabel={variantsLabel}
              onUpdate={onUpdate}
            />
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
        {/* Answer options / scale — so the reviewer sees the full question */}
        {question.type === "multiple_choice" && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {question.options.map((opt, i) => (
              <span
                key={i}
                className="text-[9px] text-ink-mid bg-bg-inset border border-line rounded px-1.5 py-0.5"
              >
                {opt}
              </span>
            ))}
            {question.multiSelect && (
              <span className="text-[9px] text-ink-dim italic self-center">
                · select all that apply
              </span>
            )}
          </div>
        )}
        {question.type === "likert" && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {question.scale.map((s, i) => (
              <span
                key={i}
                className="text-[9px] text-ink-mid bg-bg-inset border border-line rounded px-1.5 py-0.5"
              >
                {s}
              </span>
            ))}
          </div>
        )}
        {question.type === "rating" && (
          <p className="mt-1.5 text-[9px] text-ink-low">
            Scale {question.min}–{question.max}
            {question.minLabel ? ` · ${question.min} = ${question.minLabel}` : ""}
            {question.maxLabel ? ` · ${question.max} = ${question.maxLabel}` : ""}
          </p>
        )}
        {(question.type === "forced_ranking" ||
          question.type === "allocation") && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {question.items.map((it, i) => (
              <span
                key={i}
                className="text-[9px] text-ink-mid bg-bg-inset border border-line rounded px-1.5 py-0.5"
              >
                {it}
              </span>
            ))}
          </div>
        )}
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

function ScopeButton({
  question,
  variantsLabel,
  onUpdate,
}: {
  question: Question;
  variantsLabel: string;
  onUpdate: (q: Question) => void;
}) {
  const currentScope = getQuestionScope(question);
  const nextScope: Record<QuestionScope, QuestionScope> = {
    per_variant: "cross_variant",
    cross_variant: "general",
    general: "per_variant",
  };
  const labels: Record<QuestionScope, string> = {
    per_variant: `PER-${variantsLabel.toUpperCase()}`,
    cross_variant: `CROSS-${variantsLabel.toUpperCase()}`,
    general: "GENERAL",
  };
  const titles: Record<QuestionScope, string> = {
    per_variant: `Asked once per ${variantsLabel.toLowerCase()} — click to cycle`,
    cross_variant: `Asked once after all ${variantsLabel.toLowerCase()}s seen — click to cycle`,
    general: `Independent of ${variantsLabel.toLowerCase()}s — click to cycle`,
  };
  const cls: Record<QuestionScope, string> = {
    per_variant: "bg-magenta/15 text-magenta border border-magenta/40",
    cross_variant: "neu-pill text-ink-mid",
    general: "bg-sky/10 text-sky border border-sky/30",
  };
  return (
    <button
      onClick={() =>
        onUpdate({
          ...question,
          scope: nextScope[currentScope],
          // clear the legacy field so it doesn't disagree with `scope`
          perVariant: undefined,
        } as Question)
      }
      className={cn(
        "text-[8px] font-bold px-1.5 py-0.5 rounded transition-all hover:scale-105",
        cls[currentScope]
      )}
      title={titles[currentScope]}
    >
      {labels[currentScope]}
    </button>
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
          ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
          : "bg-bg-deep/40 text-ink-mid"
      )}
    >
      {overCap && <span className="text-amber-500 flex-shrink-0">!</span>}
      <div className="flex-1">
        <span className="font-semibold">
          {perVariantCount} per-{instrument.variants.label.toLowerCase()} × {variantCount} {instrument.variants.label.toLowerCase()}s
          {crossCount > 0 ? ` + ${crossCount} cross-${instrument.variants.label.toLowerCase()}` : ""}
          {" = "}
          <span className={overCap ? "text-amber-500" : "text-magenta"}>
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

  const autoRunEnabled = useAppStore((s) => s.autoRunEnabled);

  // Auto-run: on mount, pick a method from interpretation.studyType and
  // generate the instrument. Variant-comparison / concept-test studies use
  // the concept_test method (which fires the concept-test battery); other
  // studies default to survey. Off when the user has disabled auto-run —
  // they'll pick a method themselves from the methods catalog.
  useEffect(() => {
    if (!autoRunEnabled) return;
    if (instrument || isLoading || error) return;
    if (pendingMethod || selectedMethod) return; // already picked
    if (!context || !interpretation || !personas) return;
    const studyType = interpretation.studyType;
    const inferredMethod: ResearchMethod =
      studyType === "concept_test" ||
      studyType === "variant_comparison" ||
      studyType === "positioning_test"
        ? "concept_test"
        : "survey";
    setPendingMethod(inferredMethod);
    handleGenerateInstrument(inferredMethod);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRunEnabled]);

  // Auto-run: once the instrument lands, advance to Step 4.
  useEffect(() => {
    if (!autoRunEnabled) return;
    if (instrument && !isLoading) {
      advanceToStep(4);
    }
  }, [instrument, isLoading, advanceToStep, autoRunEnabled]);

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
    const baseScope: QuestionScope = instrument.variants
      ? "cross_variant"
      : "general";
    let newQ: Question;
    switch (type) {
      case "likert":
        newQ = {
          id: newId,
          type,
          scope: baseScope,
          text: "New Likert question — click to edit",
          scale: [
            "Strongly Disagree",
            "Disagree",
            "Neutral",
            "Agree",
            "Strongly Agree",
          ],
        };
        break;
      case "rating":
        newQ = {
          id: newId,
          type,
          scope: baseScope,
          text: "New rating question — click to edit",
          min: 1,
          max: 5,
          minLabel: "Low",
          maxLabel: "High",
        };
        break;
      case "open_ended":
        newQ = {
          id: newId,
          type,
          scope: baseScope,
          text: "New open-ended question — click to edit",
        };
        break;
      case "forced_ranking":
        newQ = {
          id: newId,
          type,
          scope: baseScope,
          text: "Rank these items from most to least important",
          items: ["Option A", "Option B", "Option C"],
        };
        break;
      case "allocation":
        newQ = {
          id: newId,
          type,
          scope: baseScope,
          text: "Distribute 100 points across these items by importance",
          items: ["Option A", "Option B", "Option C"],
          totalPoints: 100,
        };
        break;
      case "semantic_differential":
        newQ = {
          id: newId,
          type,
          scope: baseScope,
          text: "Where does this land on each dimension?",
          pairs: [
            { left: "Simple", right: "Complex" },
            { left: "Friendly", right: "Cold" },
          ],
          steps: 7,
        };
        break;
      case "multiple_choice":
        newQ = {
          id: newId,
          type,
          scope: baseScope,
          text: "Which best describes your primary use case?",
          options: ["Option A", "Option B", "Option C", "Option D"],
          multiSelect: false,
        };
        break;
      case "matrix":
        newQ = {
          id: newId,
          type,
          scope: baseScope,
          text: "Rate each item on each dimension",
          items: ["Feature 1", "Feature 2", "Feature 3"],
          dimensions: ["Usefulness", "Ease of use", "Likelihood to use"],
          scale: 5,
        };
        break;
      case "sentence_completion":
        newQ = {
          id: newId,
          type,
          scope: baseScope,
          text: "Complete each sentence",
          stems: [
            "When I think of this product, the first word is ___.",
            "I would use this when ___.",
          ],
        };
        break;
      case "word_association":
        newQ = {
          id: newId,
          type,
          scope: baseScope,
          text: "What three words come to mind for each prompt?",
          stimuli: ["This product"],
          wordCount: 3,
        };
        break;
      case "scenario":
        newQ = {
          id: newId,
          type,
          scope: baseScope,
          text: "What would you do in this scenario?",
          scenarioText: "Describe a concrete situation here…",
          followUp: "What do you do?",
        };
        break;
      case "yes_no_why":
        newQ = {
          id: newId,
          type,
          scope: baseScope,
          text: "Would you use this?",
          requireWhy: true,
        };
        break;
      case "nps":
        newQ = {
          id: newId,
          type,
          scope: baseScope,
          text: "How likely are you to recommend this to a colleague (0-10)?",
        };
        break;
    }
    setInstrument({
      ...instrument,
      questions: [...instrument.questions, newQ],
    });
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
                          className="text-[10px] bg-magenta/10 text-magenta px-1.5 py-0.5 rounded border border-magenta/30"
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

                <div className="px-3 py-2 border-b border-line bg-bg-raised flex gap-1 flex-wrap items-center">
                  <span className="text-[10px] text-ink-low self-center mr-1 font-semibold">
                    + Add:
                  </span>
                  <button
                    onClick={() => addQuestion("likert")}
                    className="text-[10px] text-sky bg-sky/10 hover:bg-sky/15 px-1.5 py-0.5 rounded font-semibold"
                  >
                    Likert
                  </button>
                  <button
                    onClick={() => addQuestion("rating")}
                    className="text-[10px] text-sky bg-sky/10 hover:bg-sky/15 px-1.5 py-0.5 rounded font-semibold"
                  >
                    Rating
                  </button>
                  <button
                    onClick={() => addQuestion("open_ended")}
                    className="text-[10px] text-green-500 bg-green-500/15 hover:bg-green-500/20 px-1.5 py-0.5 rounded font-semibold"
                  >
                    Open-ended
                  </button>
                  <button
                    onClick={() => addQuestion("forced_ranking")}
                    className="text-[10px] text-magenta bg-magenta/10 hover:bg-magenta/15 px-1.5 py-0.5 rounded font-semibold"
                  >
                    Ranking
                  </button>
                  <button
                    onClick={() => addQuestion("allocation")}
                    className="text-[10px] text-magenta bg-magenta/10 hover:bg-magenta/15 px-1.5 py-0.5 rounded font-semibold"
                  >
                    Allocation
                  </button>
                  <button
                    onClick={() => addQuestion("semantic_differential")}
                    className="text-[10px] text-magenta bg-magenta/10 hover:bg-magenta/15 px-1.5 py-0.5 rounded font-semibold"
                  >
                    Sem Diff
                  </button>
                  <button
                    onClick={() => addQuestion("multiple_choice")}
                    className="text-[10px] text-sky bg-sky/10 hover:bg-sky/15 px-1.5 py-0.5 rounded font-semibold"
                  >
                    MC
                  </button>
                  <button
                    onClick={() => addQuestion("matrix")}
                    className="text-[10px] text-sky bg-sky/10 hover:bg-sky/15 px-1.5 py-0.5 rounded font-semibold"
                  >
                    Matrix
                  </button>
                  <button
                    onClick={() => addQuestion("sentence_completion")}
                    className="text-[10px] text-green-500 bg-green-500/15 hover:bg-green-500/20 px-1.5 py-0.5 rounded font-semibold"
                  >
                    Sentence
                  </button>
                  <button
                    onClick={() => addQuestion("word_association")}
                    className="text-[10px] text-green-500 bg-green-500/15 hover:bg-green-500/20 px-1.5 py-0.5 rounded font-semibold"
                  >
                    Word Assoc
                  </button>
                  <button
                    onClick={() => addQuestion("scenario")}
                    className="text-[10px] text-green-500 bg-green-500/15 hover:bg-green-500/20 px-1.5 py-0.5 rounded font-semibold"
                  >
                    Scenario
                  </button>
                  <button
                    onClick={() => addQuestion("yes_no_why")}
                    className="text-[10px] text-green-500 bg-green-500/15 hover:bg-green-500/20 px-1.5 py-0.5 rounded font-semibold"
                  >
                    Y/N+Why
                  </button>
                  <button
                    onClick={() => addQuestion("nps")}
                    className="text-[10px] text-sky bg-sky/10 hover:bg-sky/15 px-1.5 py-0.5 rounded font-semibold"
                  >
                    NPS
                  </button>
                </div>

                <div className="max-h-96 overflow-y-auto">
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
