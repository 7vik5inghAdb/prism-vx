"use client";

import { useState, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  XIcon,
  AlertCircleIcon,
  RefreshCwIcon,
  ImageIcon,
  RotateCcw,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import { Message } from "@/components/conversation/Message";
import { EditableText } from "@/components/conversation/EditableText";
import type { ResearchContext } from "@/types";

interface FormErrors {
  hypothesis?: string;
  productDescription?: string;
  targetAudience?: string;
  objectives?: string;
}

const DEMO_DEFAULTS: ResearchContext = {
  hypothesis:
    "Adobe Express India is exploring a variety of taglines to find what resonates the most with people who have light creative design needs. We want to identify the most effective messaging strategy that balances broad appeal, emotional resonance, and a compelling value proposition.",
  productDescription:
    "Adobe Express — a consumer-facing creative design tool for people with light creative needs. Competing primarily with Canva (92% adoption in target audience), Capcut (49%), and Adobe Photoshop (55%). Current Adobe Express adoption in target market is 25%.",
  targetAudience:
    "People in India who regularly use creative tools for light design needs. Four primary audience cohorts: (1) Massy Consumer/Personal (51%) — Salaried employees, homemakers, non-employed individuals; (2) Small Business/Solopreneurs (32%) — Freelancers, gig workers, small business owners; (3) Students (17%) — Full-time students, some with side freelance work; (4) Creators/Influencers (overlapping cohort) — Photographers, content writers, graphic designers. Demographics: Mean age 31.6 years, median 25-34. Languages: English (100%), Hindi (89%), Marathi (22%). Top content types: Videos/Reels (75%), Social Media Posts (73%), Edited Images (67%).",
  objectives:
    "Explore people's sentiments regarding five different taglines for Adobe Express India. Respondents should rate favorability and state their sentiments regarding each tagline. We want to understand both quantitative resonance and the qualitative drivers behind each tagline's performance.",
  variants: `Magic of design. In your hands.
Ek click mein design
Ab India karega design
Now anyone can design
Empowering Indians to design`,
  variantsLabel: "Tagline",
};

const EMPTY_FORM: ResearchContext = {
  hypothesis: "",
  productDescription: "",
  targetAudience: "",
  objectives: "",
  variants: "",
  variantsLabel: "",
};

function ContextForm({
  form,
  errors,
  setForm,
  setErrors,
  imagePreview,
  setImagePreview,
  fileRef,
  onSubmit,
  onClear,
  isLoading,
}: {
  form: ResearchContext;
  errors: FormErrors;
  setForm: (updater: (f: ResearchContext) => ResearchContext) => void;
  setErrors: (updater: (e: FormErrors) => FormErrors) => void;
  imagePreview: string | null;
  setImagePreview: (img: string | null) => void;
  fileRef: React.RefObject<HTMLInputElement>;
  onSubmit: () => void;
  onClear: () => void;
  isLoading: boolean;
}) {
  function field(
    key: "hypothesis" | "productDescription" | "targetAudience" | "objectives",
    label: string,
    hint: string,
    placeholder: string,
    rows = 3
  ) {
    return (
      <div>
        <label className="text-[11px] font-bold text-ink-mid mb-0.5 block">
          {label} <span className="text-scarlet/80">*</span>
        </label>
        <p className="text-[10px] text-ink-low mb-1.5 leading-snug">{hint}</p>
        <textarea
          value={form[key]}
          onChange={(e) => {
            const v = e.target.value;
            setForm((f) => ({ ...f, [key]: v }));
            if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
          }}
          placeholder={placeholder}
          rows={rows}
          className={cn(
            "w-full px-2.5 py-2 text-[13px] border rounded-md resize-none bg-bg-deep text-ink-high placeholder-ink-dim",
            errors[key] ? "border-scarlet/40" : "border-line"
          )}
        />
        {errors[key] && (
          <p className="text-[10px] text-scarlet mt-0.5">{errors[key]}</p>
        )}
      </div>
    );
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setImagePreview(dataUrl);
      setForm((f) => ({ ...f, imageAsset: dataUrl, imageAssetName: file.name }));
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="neu-card-sm rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold text-ink-mid">Research Brief</span>
        <button
          type="button"
          onClick={onClear}
          className="text-[10px] text-ink-low hover:text-ink-mid flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="w-2.5 h-2.5" />
          Start Fresh
        </button>
      </div>
      {field(
        "hypothesis",
        "Research Hypothesis",
        "The core assumption you're trying to validate",
        "What do you believe to be true that needs evidence?"
      )}
      {field(
        "productDescription",
        "Product / Feature Description",
        "What you're building or testing",
        "Concrete description of the product or feature"
      )}
      {field(
        "targetAudience",
        "Target Audience",
        "Who you're researching",
        "Demographics, role, context, geography, sophistication...",
        2
      )}
      {field(
        "objectives",
        "Research Objectives",
        "What questions this research must answer",
        "Specific outcomes and questions"
      )}

      <div>
        <label className="text-[11px] font-bold text-ink-mid mb-0.5 block">
          Concept Variants{" "}
          <span className="text-ink-low font-normal">(optional)</span>
        </label>
        <p className="text-[10px] text-ink-low mb-1.5 leading-snug">
          For concept tests — one variant per line. Leave blank for non-variant studies.
        </p>
        <div className="flex gap-1.5 mb-1.5">
          <input
            type="text"
            value={form.variantsLabel || ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, variantsLabel: e.target.value }))
            }
            placeholder="Label (Tagline, Concept, Pricing Option…)"
            className="flex-1 px-2 py-1 text-[11px] border border-line rounded bg-bg-deep"
          />
        </div>
        <textarea
          value={form.variants || ""}
          onChange={(e) =>
            setForm((f) => ({ ...f, variants: e.target.value }))
          }
          placeholder="One variant per line"
          rows={4}
          className="w-full px-2.5 py-2 text-[12px] border border-line rounded-md resize-none bg-bg-deep text-ink-high placeholder-ink-dim font-mono"
        />
      </div>

      <div>
        <label className="text-[11px] font-bold text-ink-mid mb-0.5 block">
          Creative Asset{" "}
          <span className="text-ink-low font-normal">(optional)</span>
        </label>
        <div
          onClick={() => fileRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-md p-2.5 cursor-pointer text-center transition-colors hover:border-magenta/50",
            imagePreview
              ? "border-magenta/50 bg-magenta/10/20"
              : "border-line"
          )}
        >
          {imagePreview ? (
            <div className="flex items-center gap-2">
              <img
                src={imagePreview}
                alt=""
                className="w-10 h-10 object-cover rounded"
              />
              <span className="text-[11px] text-ink-mid flex-1 text-left">
                {form.imageAssetName}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setImagePreview(null);
                  setForm((f) => ({
                    ...f,
                    imageAsset: undefined,
                    imageAssetName: undefined,
                  }));
                }}
                className="p-1"
              >
                <XIcon className="w-3 h-3 text-ink-low" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-1.5 py-1">
              <ImageIcon className="w-3.5 h-3.5 text-ink-dim" />
              <span className="text-[11px] text-ink-low">
                Upload PNG/JPG (optional reference)
              </span>
            </div>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          className="hidden"
          onChange={handleImageUpload}
        />
      </div>

      <button
        onClick={onSubmit}
        disabled={isLoading}
        className="w-full py-2.5 px-4 text-sm font-semibold neu-button-primary rounded-lg disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
      >
        {isLoading ? (
          <>
            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            Analyze My Research Context
            <ArrowRight className="w-3.5 h-3.5" />
          </>
        )}
      </button>
    </div>
  );
}

export function Step1Context() {
  const {
    isLoading,
    error,
    setLoading,
    setError,
    setContext,
    setInterpretation,
    advanceToStep,
    retryCurrentStep,
    interpretation,
    context: existingContext,
  } = useAppStore();

  const [form, setForm] = useState<ResearchContext>(
    existingContext || DEMO_DEFAULTS
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [imagePreview, setImagePreview] = useState<string | null>(
    existingContext?.imageAsset || null
  );
  const fileRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<"input" | "thinking" | "review">(
    interpretation ? "review" : "input"
  );

  function validate(): boolean {
    const newErrors: FormErrors = {};
    if (!form.hypothesis.trim()) newErrors.hypothesis = "Required";
    if (!form.productDescription.trim())
      newErrors.productDescription = "Required";
    if (!form.targetAudience.trim()) newErrors.targetAudience = "Required";
    if (!form.objectives.trim()) newErrors.objectives = "Required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;

    setStage("thinking");
    setLoading(true, "Analyzing your research context...");
    try {
      const res = await fetch("/api/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: form }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to interpret context");

      setContext(form);
      setInterpretation(data.interpretation);
      setStage("review");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Try again."
      );
      setStage("input");
    } finally {
      setLoading(false);
    }
  }

  function handleConfirm() {
    advanceToStep(2);
  }

  function handleClear() {
    setForm(EMPTY_FORM);
    setImagePreview(null);
    setErrors({});
  }

  // Updaters for inline editing of interpretation
  function updateInterpretation(
    patch: Partial<NonNullable<typeof interpretation>>
  ) {
    if (!interpretation) return;
    setInterpretation({ ...interpretation, ...patch });
  }

  return (
    <div className="space-y-1">
      {/* Initial greeting */}
      <Message variant="orchestrator">
        Hi — I&rsquo;m PRISM, your synthetic research partner. Let&rsquo;s start by
        understanding what you&rsquo;re trying to validate. The form below is
        pre-filled with a demo scenario (Adobe Express India tagline study) so
        you can run a full pass quickly. Edit any field to customize, or click
        &ldquo;Start Fresh&rdquo; to wipe the defaults.
      </Message>

      {/* The form */}
      {stage === "input" && (
        <Message
          variant="orchestrator"
          embed={
            <ContextForm
              form={form}
              errors={errors}
              setForm={setForm}
              setErrors={setErrors}
              imagePreview={imagePreview}
              setImagePreview={setImagePreview}
              fileRef={fileRef}
              onSubmit={handleSubmit}
              onClear={handleClear}
              isLoading={isLoading}
            />
          }
        />
      )}

      {/* Error */}
      {error && (
        <Message variant="orchestrator">
          <div className="flex items-start gap-2 text-scarlet">
            <AlertCircleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold mb-1">
                I had trouble analyzing that.
              </p>
              <p className="text-xs">{error}</p>
              <button
                onClick={() => {
                  retryCurrentStep();
                  setStage("input");
                }}
                className="text-[11px] mt-1.5 underline flex items-center gap-1"
              >
                <RefreshCwIcon className="w-3 h-3" />
                Try again
              </button>
            </div>
          </div>
        </Message>
      )}

      {/* User confirms submission */}
      {(stage === "thinking" || stage === "review") && form.hypothesis && (
        <Message variant="user" status="sent">
          <div className="text-[12px] opacity-90">
            Here&rsquo;s my brief — analyze it.
          </div>
        </Message>
      )}

      {/* Thinking */}
      {stage === "thinking" && (
        <Message variant="orchestrator" status="thinking" />
      )}

      {/* Interpretation review */}
      {stage === "review" && interpretation && (
        <>
          <Message variant="orchestrator">
            I&rsquo;ve read through your context. Here&rsquo;s what I understand
            you&rsquo;re trying to validate. Click anything to edit it directly,
            or confirm if it captures your intent.
          </Message>

          <Message
            variant="orchestrator"
            embed={
              <div className="neu-card-sm rounded-xl p-4 space-y-3">
                <div className="bg-magenta/10 border border-magenta/30 rounded-lg p-3">
                  <p className="text-[10px] font-bold text-magenta uppercase tracking-widest mb-1.5">
                    Summary
                  </p>
                  <EditableText
                    value={interpretation.summary}
                    onSave={(v) => updateInterpretation({ summary: v })}
                    multiline
                    rows={3}
                    textClassName="text-xs text-ink-mid"
                  />
                </div>

                <div>
                  <p className="text-[10px] font-bold text-ink-low uppercase tracking-widest mb-1">
                    Hypothesis
                  </p>
                  <EditableText
                    value={interpretation.restatedHypothesis}
                    onSave={(v) =>
                      updateInterpretation({ restatedHypothesis: v })
                    }
                    multiline
                    rows={2}
                    textClassName="text-xs"
                  />
                </div>

                <div>
                  <p className="text-[10px] font-bold text-ink-low uppercase tracking-widest mb-1">
                    Audience
                  </p>
                  <EditableText
                    value={interpretation.restatedAudience}
                    onSave={(v) =>
                      updateInterpretation({ restatedAudience: v })
                    }
                    multiline
                    textClassName="text-xs"
                  />
                </div>

                <div>
                  <p className="text-[10px] font-bold text-ink-low uppercase tracking-widest mb-1">
                    Research Focus
                  </p>
                  <EditableText
                    value={interpretation.researchFocus}
                    onSave={(v) =>
                      updateInterpretation({ researchFocus: v })
                    }
                    multiline
                    textClassName="text-xs font-medium text-magenta"
                  />
                </div>

                <div>
                  <p className="text-[10px] font-bold text-ink-low uppercase tracking-widest mb-1">
                    Objectives
                  </p>
                  <ul className="space-y-1">
                    {interpretation.restatedObjectives.map((obj, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-[10px] text-magenta font-bold flex-shrink-0 mt-1.5">
                          {i + 1}.
                        </span>
                        <EditableText
                          value={obj}
                          onSave={(v) => {
                            const newObjs = [...interpretation.restatedObjectives];
                            newObjs[i] = v;
                            updateInterpretation({ restatedObjectives: newObjs });
                          }}
                          multiline
                          textClassName="text-xs"
                          className="flex-1"
                        />
                      </li>
                    ))}
                  </ul>
                </div>

                {interpretation.studyType === "concept_test" &&
                  interpretation.variants && (
                    <div className="bg-yellow/10 border border-yellow/30 rounded-lg p-2.5">
                      <p className="text-[10px] font-bold text-yellow uppercase tracking-widest mb-1">
                        Concept Test Detected · {interpretation.variants.label}
                      </p>
                      <ul className="space-y-1">
                        {interpretation.variants.items.map((v, i) => (
                          <li
                            key={i}
                            className="text-xs text-yellow/90 flex items-start gap-1.5"
                          >
                            <span className="text-yellow font-bold">
                              {i + 1}.
                            </span>
                            &ldquo;{v}&rdquo;
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
            }
          />

          <Message
            variant="orchestrator"
            embed={
              <div className="flex gap-2">
                <button
                  onClick={() => setStage("input")}
                  className="flex-1 py-2 px-3 text-xs font-semibold text-ink-mid neu-button rounded-lg"
                >
                  Edit my inputs
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-[2] py-2 px-4 text-xs font-semibold neu-button-primary rounded-lg flex items-center justify-center gap-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  This captures it — let&rsquo;s build personas
                </button>
              </div>
            }
          />
        </>
      )}
    </div>
  );
}
