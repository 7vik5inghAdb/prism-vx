"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  ChevronDownIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  RefreshCwIcon,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Message } from "@/components/conversation/Message";
import { EditableText } from "@/components/conversation/EditableText";
import type { PersonaCluster, PersonaDimension } from "@/types";

const COLORS = [
  { bg: "bg-sky/10", border: "border-sky/40", text: "text-sky", dot: "bg-sky/70" },
  { bg: "bg-magenta/10", border: "border-magenta/40", text: "text-magenta", dot: "bg-magenta/70" },
  { bg: "bg-sky/10", border: "border-sky/40", text: "text-sky", dot: "bg-sky/60" },
  { bg: "bg-yellow/10", border: "border-yellow/40", text: "text-yellow", dot: "bg-yellow/70" },
  { bg: "bg-scarlet/10", border: "border-scarlet/40", text: "text-scarlet", dot: "bg-scarlet/70" },
];

function PersonaCard({
  cluster,
  index,
  onUpdate,
  onDelete,
}: {
  cluster: PersonaCluster;
  index: number;
  onUpdate: (updated: PersonaCluster) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(index === 0);
  const c = COLORS[index % COLORS.length];

  function updateDimension(idx: number, patch: Partial<PersonaDimension>) {
    const newDims = [...cluster.dimensions];
    newDims[idx] = { ...newDims[idx], ...patch };
    onUpdate({ ...cluster, dimensions: newDims });
  }

  function addDimension() {
    const newDim: PersonaDimension = {
      name: "New Dimension",
      description: "Click to describe what this captures",
      values: ["Value 1", "Value 2"],
    };
    onUpdate({ ...cluster, dimensions: [...cluster.dimensions, newDim] });
  }

  function deleteDimension(idx: number) {
    onUpdate({
      ...cluster,
      dimensions: cluster.dimensions.filter((_, i) => i !== idx),
    });
  }

  return (
    <div className={cn("border rounded-xl overflow-hidden", c.border, c.bg)}>
      <div className="flex items-center justify-between px-3 py-2 group">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
        >
          <div className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", c.dot)} />
          <div className="min-w-0">
            <EditableText
              value={cluster.name}
              onSave={(v) => onUpdate({ ...cluster, name: v })}
              textClassName={cn("text-sm font-bold", c.text)}
              inline
            />
            <div className="flex items-center gap-2">
              <EditableText
                value={String(cluster.sampleSize)}
                onSave={(v) => {
                  const n = parseInt(v, 10);
                  if (!isNaN(n)) onUpdate({ ...cluster, sampleSize: n });
                }}
                textClassName={cn("text-[10px] opacity-70 font-semibold", c.text)}
                inline
              />
              <span className={cn("text-[10px] opacity-70", c.text)}>% of panel</span>
            </div>
          </div>
        </button>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onDelete}
            className="p-1 rounded text-ink-low hover:bg-scarlet/10 hover:text-scarlet opacity-0 group-hover:opacity-100 transition-all"
            title="Delete cluster"
          >
            <Trash2 className="w-3 h-3" />
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1"
          >
            <ChevronDownIcon
              className={cn(
                "w-4 h-4 opacity-60 transition-transform",
                expanded && "rotate-180"
              )}
            />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 space-y-2.5 border-t border-current/10 pt-2.5 animate-slide-in">
          <EditableText
            value={cluster.description}
            onSave={(v) => onUpdate({ ...cluster, description: v })}
            multiline
            rows={2}
            textClassName={cn("text-[11px] opacity-80 leading-relaxed", c.text)}
          />

          <div>
            <p className={cn("text-[9px] font-bold uppercase tracking-widest opacity-60 mb-1", c.text)}>
              Profile Narrative
            </p>
            <EditableText
              value={cluster.narrativeProfile}
              onSave={(v) => onUpdate({ ...cluster, narrativeProfile: v })}
              multiline
              rows={3}
              textClassName={cn("text-[11px] italic opacity-75", c.text)}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className={cn("text-[9px] font-bold uppercase tracking-widest opacity-60", c.text)}>
                Dimensions ({cluster.dimensions.length})
              </p>
              <button
                onClick={addDimension}
                className={cn(
                  "text-[9px] font-bold flex items-center gap-0.5 hover:opacity-100 opacity-70 transition-opacity",
                  c.text
                )}
              >
                <Plus className="w-2.5 h-2.5" />
                Add
              </button>
            </div>
            <div className="space-y-1.5">
              {cluster.dimensions.map((dim, di) => (
                <div
                  key={di}
                  className="bg-bg-deep/50 rounded-md p-2 group/dim relative"
                >
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <EditableText
                      value={dim.name}
                      onSave={(v) => updateDimension(di, { name: v })}
                      textClassName="text-[11px] font-semibold"
                      className="flex-1"
                    />
                    <button
                      onClick={() => deleteDimension(di)}
                      className="opacity-0 group-hover/dim:opacity-100 transition-opacity p-0.5 text-ink-low hover:text-scarlet"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <EditableText
                    value={dim.description}
                    onSave={(v) => updateDimension(di, { description: v })}
                    multiline
                    textClassName="text-[10px] opacity-70"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {dim.values.map((val, vi) => (
                      <div key={vi} className="relative group/val">
                        <EditableText
                          value={val}
                          onSave={(newVal) => {
                            const newVals = [...dim.values];
                            newVals[vi] = newVal;
                            updateDimension(di, { values: newVals });
                          }}
                          textClassName="text-[9px] px-1.5 py-0.5 bg-bg-elevated/80 rounded border border-current/10 font-medium inline-block"
                          inline
                        />
                        <button
                          onClick={() => {
                            updateDimension(di, {
                              values: dim.values.filter((_, i) => i !== vi),
                            });
                          }}
                          className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-scarlet text-white text-[8px] opacity-0 group-hover/val:opacity-100 flex items-center justify-center"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        updateDimension(di, {
                          values: [...dim.values, "New value"],
                        });
                      }}
                      className="text-[9px] px-1.5 py-0.5 bg-bg-raised/30 border border-dashed border-current/30 rounded font-medium hover:bg-bg-elevated/60"
                    >
                      + Add value
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* L2 — Validation Predispositions */}
          {cluster.validationPredispositions && (
            <details className="bg-bg-deep/50 rounded-md overflow-hidden">
              <summary className="px-2 py-1.5 cursor-pointer hover:bg-bg-elevated/40 transition-colors">
                <span
                  className={cn(
                    "text-[9px] font-bold uppercase tracking-widest",
                    c.text
                  )}
                >
                  L2 · Validation Predispositions
                </span>
                <span className="text-[9px] opacity-60 ml-2">
                  {cluster.validationPredispositions.adoptionPosture}
                </span>
              </summary>
              <div className="px-2 pb-2 space-y-1.5 pt-1">
                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  <PredispositionPill
                    label="Adoption"
                    value={cluster.validationPredispositions.adoptionPosture}
                  />
                  <PredispositionPill
                    label="Risk"
                    value={cluster.validationPredispositions.riskTolerance}
                  />
                  <PredispositionPill
                    label="Switching"
                    value={cluster.validationPredispositions.switchingCost}
                  />
                  <PredispositionPill
                    label="Habit"
                    value={cluster.validationPredispositions.habitStrength}
                  />
                </div>
                <div>
                  <p className="text-[8.5px] font-bold uppercase tracking-widest opacity-60 mb-0.5">
                    Counterfactual (does today)
                  </p>
                  <EditableText
                    value={cluster.validationPredispositions.counterfactual}
                    onSave={(v) =>
                      onUpdate({
                        ...cluster,
                        validationPredispositions: {
                          ...cluster.validationPredispositions!,
                          counterfactual: v,
                        },
                      })
                    }
                    multiline
                    textClassName="text-[10px] opacity-80"
                  />
                </div>
                <div>
                  <p className="text-[8.5px] font-bold uppercase tracking-widest text-sky mb-0.5">
                    Says yes when
                  </p>
                  <EditableText
                    value={cluster.validationPredispositions.acceptanceCriteria}
                    onSave={(v) =>
                      onUpdate({
                        ...cluster,
                        validationPredispositions: {
                          ...cluster.validationPredispositions!,
                          acceptanceCriteria: v,
                        },
                      })
                    }
                    multiline
                    textClassName="text-[10px] text-sky"
                  />
                </div>
                <div>
                  <p className="text-[8.5px] font-bold uppercase tracking-widest text-scarlet mb-0.5">
                    Says no when
                  </p>
                  <EditableText
                    value={cluster.validationPredispositions.rejectionTriggers}
                    onSave={(v) =>
                      onUpdate({
                        ...cluster,
                        validationPredispositions: {
                          ...cluster.validationPredispositions!,
                          rejectionTriggers: v,
                        },
                      })
                    }
                    multiline
                    textClassName="text-[10px] text-scarlet"
                  />
                </div>
              </div>
            </details>
          )}

          {/* L3 — Jobs-to-be-Done */}
          {cluster.jobsToBeDone && (
            <details className="bg-bg-deep/50 rounded-md overflow-hidden">
              <summary className="px-2 py-1.5 cursor-pointer hover:bg-bg-elevated/40 transition-colors">
                <span
                  className={cn(
                    "text-[9px] font-bold uppercase tracking-widest",
                    c.text
                  )}
                >
                  L3 · Jobs-to-be-Done
                </span>
              </summary>
              <div className="px-2 pb-2 space-y-1.5 pt-1">
                <div>
                  <p className="text-[8.5px] font-bold uppercase tracking-widest text-magenta mb-0.5">
                    Functional Job
                  </p>
                  <EditableText
                    value={cluster.jobsToBeDone.functional}
                    onSave={(v) =>
                      onUpdate({
                        ...cluster,
                        jobsToBeDone: {
                          ...cluster.jobsToBeDone!,
                          functional: v,
                        },
                      })
                    }
                    multiline
                    textClassName="text-[10px] opacity-90"
                  />
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <p className="text-[8.5px] font-bold uppercase tracking-widest text-yellow mb-0.5">
                      Emotional
                    </p>
                    <EditableText
                      value={cluster.jobsToBeDone.emotional}
                      onSave={(v) =>
                        onUpdate({
                          ...cluster,
                          jobsToBeDone: {
                            ...cluster.jobsToBeDone!,
                            emotional: v,
                          },
                        })
                      }
                      textClassName="text-[10px] text-yellow/90"
                    />
                  </div>
                  <div>
                    <p className="text-[8.5px] font-bold uppercase tracking-widest text-harvest mb-0.5">
                      Social
                    </p>
                    <EditableText
                      value={cluster.jobsToBeDone.social}
                      onSave={(v) =>
                        onUpdate({
                          ...cluster,
                          jobsToBeDone: {
                            ...cluster.jobsToBeDone!,
                            social: v,
                          },
                        })
                      }
                      textClassName="text-[10px] text-harvest"
                    />
                  </div>
                </div>
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function PredispositionPill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="neu-pill rounded px-1.5 py-1">
      <p className="text-[8.5px] font-bold uppercase tracking-widest text-ink-low">
        {label}
      </p>
      <p className="text-[10px] text-ink-mid font-semibold">{value}</p>
    </div>
  );
}

export function Step2Personas() {
  const {
    context,
    interpretation,
    personas,
    isLoading,
    error,
    setLoading,
    setError,
    setPersonas,
    advanceToStep,
    retryCurrentStep,
  } = useAppStore();

  const hasGenerated = !!personas;

  useEffect(() => {
    if (!personas && !isLoading && !error) {
      generatePersonas();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generatePersonas() {
    if (!context || !interpretation) return;
    setLoading(true, "Generating audience dimension clusters...");
    try {
      const res = await fetch("/api/personas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, interpretation }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate personas");
      setPersonas(data.personas);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong generating personas. This is usually a temporary issue."
      );
    } finally {
      setLoading(false);
    }
  }

  function updatePersona(idx: number, updated: PersonaCluster) {
    if (!personas) return;
    const newPs = [...personas];
    newPs[idx] = updated;
    setPersonas(newPs);
  }

  function deletePersona(idx: number) {
    if (!personas) return;
    setPersonas(personas.filter((_, i) => i !== idx));
  }

  function addPersona() {
    if (!personas) return;
    const newP: PersonaCluster = {
      id: `cluster_${personas.length + 1}_${Date.now()}`,
      name: "New Cluster",
      description: "Describe what makes this segment distinctive",
      dimensions: [
        {
          name: "Dimension",
          description: "Why this matters",
          values: ["Value 1", "Value 2"],
        },
      ],
      narrativeProfile: "Click to describe a representative member of this segment",
      sampleSize: 10,
    };
    setPersonas([...personas, newP]);
  }

  return (
    <div className="space-y-1">
      <Message variant="orchestrator">
        Based on your context, I&rsquo;ve identified the audience clusters
        you&rsquo;ll want to test against. These aren&rsquo;t fictional
        people — they&rsquo;re the dimensions along which your audience
        meaningfully varies.
      </Message>

      {isLoading && !personas && (
        <Message variant="orchestrator" status="thinking" />
      )}

      {error && (
        <Message variant="orchestrator">
          <div className="flex items-start gap-2 text-scarlet">
            <AlertCircleIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold mb-1">
                I had trouble generating personas.
              </p>
              <p className="text-xs">{error}</p>
              <button
                onClick={() => {
                  retryCurrentStep();
                  generatePersonas();
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

      {personas && (
        <>
          <Message variant="orchestrator">
            Take a look — you can edit any cluster name, dimension, or value
            inline by clicking on it. Add or remove clusters as needed before we
            move on.
          </Message>

          <Message
            variant="orchestrator"
            embed={
              <div className="space-y-2">
                {personas.map((p, i) => (
                  <PersonaCard
                    key={p.id}
                    cluster={p}
                    index={i}
                    onUpdate={(u) => updatePersona(i, u)}
                    onDelete={() => deletePersona(i)}
                  />
                ))}
                <button
                  onClick={addPersona}
                  className="w-full py-2 border-2 border-dashed border-line rounded-xl text-xs text-ink-low hover:border-magenta/50 hover:text-magenta hover:bg-magenta/10 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3 h-3" />
                  Add a cluster I missed
                </button>
              </div>
            }
          />

          <Message
            variant="orchestrator"
            embed={
              <div className="flex gap-2">
                <button
                  onClick={() => generatePersonas()}
                  className="flex-1 py-2 px-3 text-xs font-semibold text-ink-mid neu-button rounded-lg flex items-center justify-center gap-1"
                >
                  <RefreshCwIcon className="w-3 h-3" />
                  Regenerate from scratch
                </button>
                <button
                  onClick={() => advanceToStep(3)}
                  className="flex-[2] py-2 px-4 text-xs font-semibold neu-button-primary rounded-lg flex items-center justify-center gap-1.5"
                >
                  <CheckCircleIcon className="w-3.5 h-3.5" />
                  Personas look good — continue
                </button>
              </div>
            }
          />
        </>
      )}
    </div>
  );
}
