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
  FileText,
  FileType2,
  Paperclip,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { Message } from "@/components/conversation/Message";
import { EditableText } from "@/components/conversation/EditableText";
import { AutoTextarea } from "@/components/conversation/AutoTextarea";
import {
  ACCEPT_LIST,
  ACCEPT_EXTENSIONS,
  parseFile,
  totalBytes,
  formatSize,
} from "@/lib/attachments";
import type {
  ResearchContext,
  Attachment,
  AttachmentKind,
  VariantInput,
} from "@/types";

interface FormErrors {
  hypothesis?: string;
  productDescription?: string;
  targetAudience?: string;
  objectives?: string;
}

const DEMO_DEFAULTS: ResearchContext = {
  hypothesis:
    "A tagline that combines emotional resonance (pride, empowerment) with practical clarity (ease, accessibility) will outperform purely aspirational or purely functional taglines for Adobe Express India.",
  researchQuestion:
    "Which tagline messaging strategy for Adobe Express India best balances broad appeal, emotional resonance, and a compelling value proposition across our four primary audience cohorts?",
  productDescription:
    "Adobe Express — a consumer-facing creative design tool for people with light creative needs. Competing primarily with Canva (92% adoption in target audience), Capcut (49%), and Adobe Photoshop (55%). Current Adobe Express adoption in target market is 25%.",
  targetAudience:
    "People in India who regularly use creative tools for light design needs. Four primary audience cohorts: (1) Massy Consumer/Personal (51%) — Salaried employees, homemakers, non-employed individuals; (2) Small Business/Solopreneurs (32%) — Freelancers, gig workers, small business owners; (3) Students (17%) — Full-time students, some with side freelance work; (4) Creators/Influencers (overlapping cohort) — Photographers, content writers, graphic designers. Demographics: Mean age 31.6 years, median 25-34. Languages: English (100%), Hindi (89%), Marathi (22%). Top content types: Videos/Reels (75%), Social Media Posts (73%), Edited Images (67%).",
  objectives:
    "Explore people's sentiments regarding five different taglines for Adobe Express India. Respondents should rate favorability and state their sentiments regarding each tagline. We want to understand both quantitative resonance and the qualitative drivers behind each tagline's performance.",
  variantTypeLabel: "Tagline",
  variants: [
    { id: "v1", description: "Magic of design. In your hands." },
    { id: "v2", description: "Ek click mein design" },
    { id: "v3", description: "Ab India karega design" },
    { id: "v4", description: "Now anyone can design" },
    { id: "v5", description: "Empowering Indians to design" },
  ],
  attachments: [],
};

const EMPTY_FORM: ResearchContext = {
  hypothesis: "",
  researchQuestion: "",
  productDescription: "",
  targetAudience: "",
  objectives: "",
  variantTypeLabel: "",
  variants: [],
  attachments: [],
};

function kindIcon(kind: AttachmentKind) {
  switch (kind) {
    case "image":
      return ImageIcon;
    case "pdf":
      return FileType2;
    case "docx":
      return FileText;
    default:
      return FileText;
  }
}

function kindLabel(kind: AttachmentKind) {
  switch (kind) {
    case "image":
      return "IMAGE";
    case "pdf":
      return "PDF";
    case "docx":
      return "DOCX";
    case "txt":
      return "TEXT";
  }
}

function kindBadgeColor(kind: AttachmentKind) {
  switch (kind) {
    case "image":
      return "bg-magenta/15 text-magenta border-magenta/40";
    case "pdf":
      return "bg-scarlet/15 text-scarlet border-scarlet/40";
    case "docx":
      return "bg-sky/15 text-sky border-sky/40";
    case "txt":
      return "bg-green-500/15 text-green-500 border-green-500/40";
  }
}

function AttachmentUploader({
  attachments,
  onAdd,
  onRemove,
}: {
  attachments: Attachment[];
  onAdd: (a: Attachment) => void;
  onRemove: (id: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  async function handleFiles(files: FileList | File[]) {
    setParseError(null);
    setParsing(true);
    try {
      let runningTotal = totalBytes(attachments);
      for (const file of Array.from(files)) {
        const result = await parseFile(file, runningTotal);
        if (result.error) {
          setParseError(result.error);
          continue;
        }
        if (result.attachment) {
          onAdd(result.attachment);
          runningTotal += result.attachment.size;
        }
      }
    } finally {
      setParsing(false);
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      // Reset so re-uploading same file works
      e.target.value = "";
    }
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  }

  return (
    <div>
      <label className="text-[11px] font-bold text-ink-mid mb-0.5 block">
        Reference Files{" "}
        <span className="text-ink-low font-normal">(optional)</span>
      </label>
      <p className="text-[10px] text-ink-low mb-1.5 leading-snug">
        Drop in images, PDFs, DOCX, or text — PRISM will extract their content as additional context.
      </p>

      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "border-2 border-dashed rounded-lg p-3 cursor-pointer transition-all",
          dragOver
            ? "border-magenta bg-magenta/10"
            : "border-line hover:border-magenta/50 hover:bg-magenta/5"
        )}
      >
        <div className="flex items-center justify-center gap-2 py-2">
          {parsing ? (
            <>
              <Loader2 className="w-4 h-4 text-magenta animate-spin" />
              <span className="text-[11px] text-ink-mid">
                Extracting content…
              </span>
            </>
          ) : (
            <>
              <Paperclip className="w-3.5 h-3.5 text-ink-low" />
              <span className="text-[11px] text-ink-low">
                Drop files or click to browse
                <span className="text-ink-dim ml-1">
                  · PNG, JPG, PDF, DOCX, TXT, MD
                </span>
              </span>
            </>
          )}
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT_LIST + "," + ACCEPT_EXTENSIONS}
        multiple
        className="hidden"
        onChange={onInputChange}
      />

      {parseError && (
        <p className="text-[10px] text-scarlet mt-1.5 flex items-start gap-1">
          <AlertCircleIcon className="w-3 h-3 mt-0.5 flex-shrink-0" />
          {parseError}
        </p>
      )}

      {attachments.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {attachments.map((att) => {
            const Icon = kindIcon(att.kind);
            const isImage = att.kind === "image";
            return (
              <div
                key={att.id}
                className="flex items-center gap-2 neu-card-sm rounded-md p-2"
              >
                {isImage && att.content ? (
                  <img
                    src={att.content}
                    alt={att.name}
                    className="w-8 h-8 object-cover rounded flex-shrink-0"
                  />
                ) : (
                  <div
                    className="w-8 h-8 rounded flex-shrink-0 flex items-center justify-center bg-bg-elevated"
                    title={
                      isImage && !att.content
                        ? "Preview unavailable after autosave restore"
                        : undefined
                    }
                  >
                    <Icon className="w-4 h-4 text-ink-mid" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-ink-high font-medium truncate">
                      {att.name}
                    </span>
                    <span
                      className={cn(
                        "text-[8px] font-bold px-1 py-0.5 rounded border flex-shrink-0",
                        kindBadgeColor(att.kind)
                      )}
                    >
                      {kindLabel(att.kind)}
                    </span>
                  </div>
                  <p className="text-[10px] text-ink-low">
                    {formatSize(att.size)}
                    {!isImage && att.content && (
                      <span className="ml-1.5 text-ink-dim">
                        · {att.content.length.toLocaleString()} chars extracted
                      </span>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(att.id);
                  }}
                  className="p-1 rounded hover:bg-scarlet/15 text-ink-low hover:text-scarlet transition-colors flex-shrink-0"
                >
                  <XIcon className="w-3 h-3" />
                </button>
              </div>
            );
          })}
          <p className="text-[10px] text-ink-dim text-right pr-1">
            {attachments.length} file{attachments.length === 1 ? "" : "s"} ·{" "}
            {formatSize(totalBytes(attachments))}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Structured list of variants. Each row has a one-line description input plus
 * an optional image-upload slot. When images are provided, the simulation
 * sends the image to the persona; when only description exists, the
 * description is shown as the variant content (e.g. for taglines).
 */
function VariantList({
  form,
  setForm,
}: {
  form: ResearchContext;
  setForm: (updater: (f: ResearchContext) => ResearchContext) => void;
}) {
  const variants = form.variants ?? [];
  const typeLabel = form.variantTypeLabel ?? "";

  function updateVariant(idx: number, patch: Partial<VariantInput>) {
    setForm((f) => {
      const next = [...(f.variants ?? [])];
      next[idx] = { ...next[idx], ...patch };
      return { ...f, variants: next };
    });
  }

  function removeVariant(idx: number) {
    setForm((f) => ({
      ...f,
      variants: (f.variants ?? []).filter((_, i) => i !== idx),
    }));
  }

  function addVariant() {
    setForm((f) => {
      const list = f.variants ?? [];
      return {
        ...f,
        variants: [
          ...list,
          { id: `v${Date.now()}_${list.length + 1}`, description: "" },
        ],
      };
    });
  }

  async function handleVariantImage(idx: number, file: File) {
    if (!file.type.startsWith("image/")) return;
    const result = await parseFile(file, 0); // size budget handled inside
    if (result.error || !result.attachment) return;
    if (result.attachment.kind !== "image") return;
    updateVariant(idx, { image: result.attachment });
  }

  return (
    <div>
      <label className="text-[11px] font-bold text-ink-mid mb-0.5 block">
        Concept Variants{" "}
        <span className="text-ink-low font-normal">(optional)</span>
      </label>
      <p className="text-[10px] text-ink-low mb-1.5 leading-snug">
        What kind of items are you comparing? Add one row per variant. Upload
        an image for image-based variants; leave it empty for text variants
        like taglines.
      </p>

      <input
        type="text"
        value={typeLabel}
        onChange={(e) =>
          setForm((f) => ({ ...f, variantTypeLabel: e.target.value }))
        }
        placeholder="Variant type (e.g. Tagline, Culturalised Image, Pricing Plan)"
        className="w-full px-2.5 py-1.5 text-[12px] border border-line rounded-md bg-bg-deep mb-2"
      />

      {variants.length > 0 && (
        <div className="space-y-1.5 mb-1.5">
          {variants.map((v, i) => (
            <VariantRow
              key={v.id}
              index={i}
              variant={v}
              typeLabel={typeLabel}
              onUpdate={(patch) => updateVariant(i, patch)}
              onRemove={() => removeVariant(i)}
              onImageUpload={(file) => handleVariantImage(i, file)}
            />
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={addVariant}
        className="w-full py-1.5 text-[11px] font-semibold text-ink-mid hover:text-magenta border border-dashed border-line hover:border-magenta/40 rounded-md flex items-center justify-center gap-1.5 transition-colors"
      >
        <Plus className="w-3 h-3" />
        Add {typeLabel ? typeLabel.toLowerCase() : "variant"}
      </button>
    </div>
  );
}

function VariantRow({
  index,
  variant,
  typeLabel,
  onUpdate,
  onRemove,
  onImageUpload,
}: {
  index: number;
  variant: VariantInput;
  typeLabel: string;
  onUpdate: (patch: Partial<VariantInput>) => void;
  onRemove: () => void;
  onImageUpload: (file: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const hasImage = !!variant.image;
  const imagePreview = hasImage && variant.image?.content ? variant.image.content : null;

  return (
    <div className="neu-card-sm rounded-md p-2.5">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[10px] font-bold text-magenta whitespace-nowrap flex-shrink-0">
          {typeLabel ? typeLabel : "Variant"} {index + 1}
        </span>
        <input
          type="text"
          value={variant.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder={
            typeLabel
              ? `${typeLabel} description / content`
              : "Description (e.g. the tagline text or a description of the image)"
          }
          className="flex-1 px-2 py-1 text-[12px] border border-line rounded bg-bg-deep"
        />
        <button
          type="button"
          onClick={onRemove}
          className="p-1 text-ink-low hover:text-scarlet transition-colors"
          title="Remove variant"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        {hasImage ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {imagePreview ? (
              <img
                src={imagePreview}
                alt={variant.image!.name}
                className="w-10 h-10 object-cover rounded flex-shrink-0 border border-line"
              />
            ) : (
              <div className="w-10 h-10 rounded flex-shrink-0 flex items-center justify-center bg-bg-elevated">
                <ImageIcon className="w-4 h-4 text-ink-mid" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-ink-mid truncate">
                {variant.image!.name}
              </p>
              <p className="text-[9px] text-ink-low">
                {formatSize(variant.image!.size)} · personas will see this image
              </p>
            </div>
            <button
              type="button"
              onClick={() => onUpdate({ image: undefined })}
              className="p-1 text-ink-low hover:text-scarlet transition-colors"
              title="Remove image"
            >
              <XIcon className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 text-[10px] text-ink-low hover:text-magenta border border-dashed border-line hover:border-magenta/40 rounded px-2 py-1 transition-colors"
          >
            <ImageIcon className="w-3 h-3" />
            Upload image (optional)
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onImageUpload(file);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

function ContextForm({
  form,
  errors,
  setForm,
  setErrors,
  onSubmit,
  onClear,
  isLoading,
}: {
  form: ResearchContext;
  errors: FormErrors;
  setForm: (updater: (f: ResearchContext) => ResearchContext) => void;
  setErrors: (updater: (e: FormErrors) => FormErrors) => void;
  onSubmit: () => void;
  onClear: () => void;
  isLoading: boolean;
}) {
  function field(
    key:
      | "hypothesis"
      | "researchQuestion"
      | "productDescription"
      | "targetAudience"
      | "objectives",
    label: string,
    hint: string,
    placeholder: string,
    minRows = 3,
    required = true
  ) {
    return (
      <div>
        <label className="text-[11px] font-bold text-ink-mid mb-0.5 block">
          {label}{" "}
          {required && <span className="text-scarlet/80">*</span>}
        </label>
        <p className="text-[10px] text-ink-low mb-1.5 leading-snug">{hint}</p>
        <AutoTextarea
          value={(form[key] as string) ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            setForm((f) => ({ ...f, [key]: v }));
            if (errors[key as keyof FormErrors])
              setErrors((er) => ({ ...er, [key]: undefined }));
          }}
          placeholder={placeholder}
          minRows={minRows}
          maxRows={40}
          className={cn(
            "w-full px-2.5 py-2 text-[13px] border rounded-md bg-bg-deep text-ink-high placeholder-ink-dim leading-relaxed",
            errors[key as keyof FormErrors] ? "border-scarlet/40" : "border-line"
          )}
        />
        {errors[key as keyof FormErrors] && (
          <p className="text-[10px] text-scarlet mt-0.5">
            {errors[key as keyof FormErrors]}
          </p>
        )}
      </div>
    );
  }

  function addAttachment(att: Attachment) {
    setForm((f) => ({ ...f, attachments: [...(f.attachments || []), att] }));
  }

  function removeAttachment(id: string) {
    setForm((f) => ({
      ...f,
      attachments: (f.attachments || []).filter((a) => a.id !== id),
    }));
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
        "What you BELIEVE to be true (the assumption you're testing)",
        "e.g., Hindi taglines will resonate more with Indian users than English taglines"
      )}
      {field(
        "researchQuestion",
        "Research Question",
        "What you want to LEARN from this research",
        "e.g., Which tagline messaging strategy best balances appeal, resonance, and value proposition?",
        2,
        false
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

      <VariantList
        form={form}
        setForm={setForm}
      />

      <AttachmentUploader
        attachments={form.attachments || []}
        onAdd={addAttachment}
        onRemove={removeAttachment}
      />

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
    setErrors({});
  }

  function updateInterpretation(
    patch: Partial<NonNullable<typeof interpretation>>
  ) {
    if (!interpretation) return;
    setInterpretation({ ...interpretation, ...patch });
  }

  return (
    <div className="space-y-1">
      <Message variant="orchestrator">
        Hi — I&rsquo;m PRISM, your synthetic research partner. Let&rsquo;s start by
        understanding what you&rsquo;re trying to validate. The form below is
        pre-filled with a demo scenario (Adobe Express India tagline study) so
        you can run a full pass quickly. Edit any field to customize, or click
        &ldquo;Start Fresh&rdquo; to wipe the defaults.
      </Message>

      {stage === "input" && (
        <Message
          variant="orchestrator"
          embed={
            <ContextForm
              form={form}
              errors={errors}
              setForm={setForm}
              setErrors={setErrors}
              onSubmit={handleSubmit}
              onClear={handleClear}
              isLoading={isLoading}
            />
          }
        />
      )}

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

      {(stage === "thinking" || stage === "review") && form.hypothesis && (
        <Message variant="user" status="sent">
          <div className="text-[12px] opacity-90">
            Here&rsquo;s my brief — analyze it.
          </div>
        </Message>
      )}

      {stage === "thinking" && (
        <Message variant="orchestrator" status="thinking" />
      )}

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
              <div className="bg-bg-deep border border-line rounded-xl p-4 space-y-3">
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
                    Hypothesis (Belief)
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

                {interpretation.restatedResearchQuestion && (
                  <div>
                    <p className="text-[10px] font-bold text-ink-low uppercase tracking-widest mb-1">
                      Research Question (What we want to learn)
                    </p>
                    <EditableText
                      value={interpretation.restatedResearchQuestion}
                      onSave={(v) =>
                        updateInterpretation({ restatedResearchQuestion: v })
                      }
                      multiline
                      rows={2}
                      textClassName="text-xs"
                    />
                  </div>
                )}

                {interpretation.evaluationSubject && (
                  <div className="bg-sky/10 border border-sky/30 rounded-lg p-2.5">
                    <p className="text-[10px] font-bold text-sky uppercase tracking-widest mb-1">
                      Evaluation Subject
                    </p>
                    <EditableText
                      value={interpretation.evaluationSubject}
                      onSave={(v) =>
                        updateInterpretation({ evaluationSubject: v })
                      }
                      multiline
                      textClassName="text-xs text-sky"
                    />
                  </div>
                )}

                {interpretation.successCriteria && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5">
                    <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1">
                      Success Criteria
                    </p>
                    <EditableText
                      value={interpretation.successCriteria}
                      onSave={(v) =>
                        updateInterpretation({ successCriteria: v })
                      }
                      multiline
                      textClassName="text-xs text-amber-500/90"
                    />
                  </div>
                )}

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

                {(interpretation.studyType === "concept_test" ||
                  interpretation.studyType === "variant_comparison" ||
                  interpretation.studyType === "positioning_test") &&
                  interpretation.variants && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5">
                      <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1">
                        Concept Test Detected · {interpretation.variants.label}
                      </p>
                      <ul className="space-y-1">
                        {interpretation.variants.items.map((v, i) => (
                          <li
                            key={i}
                            className="text-xs text-amber-500/90 flex items-start gap-1.5"
                          >
                            <span className="text-amber-500 font-bold">
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
