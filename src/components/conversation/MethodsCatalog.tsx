"use client";

import { useState } from "react";
import {
  BarChart2,
  MessageSquare,
  LayoutGrid,
  Lightbulb,
  Calendar,
  Users2,
  PackageCheck,
  Rocket,
  MousePointer2,
  GitCompareArrows,
  Eye,
  Trophy,
  Eye as EyeIcon,
  Lock,
  Info,
  ListOrdered,
  Sparkles,
  Scale,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ResearchMethod } from "@/types";

interface MethodDef {
  id: string;
  label: string;
  category: "Attitudinal" | "Behavioral";
  icon: React.ElementType;
  available: boolean;
  selectableValue?: ResearchMethod;
  tooltip: { what: string; when: string; produces: string; limitations?: string };
}

const METHODS: MethodDef[] = [
  // Attitudinal
  {
    id: "survey",
    label: "Surveys",
    category: "Attitudinal",
    icon: BarChart2,
    available: true,
    selectableValue: "survey",
    tooltip: {
      what: "Structured questionnaires distributed to a large panel.",
      when: "Best for measuring sentiment at scale.",
      produces: "Quantitative data (ratings, rankings) with supporting qualitative signal (open-ended responses). Leans quantitative.",
    },
  },
  {
    id: "interview",
    label: "Interviews",
    category: "Attitudinal",
    icon: MessageSquare,
    available: true,
    selectableValue: "interview",
    tooltip: {
      what: "In-depth one-on-one conversations with synthetic respondents.",
      when: "Best for understanding the 'why' behind preferences.",
      produces: "Rich qualitative narratives with detailed reasoning. Leans qualitative.",
    },
  },
  {
    id: "card_sorting",
    label: "Card Sorting",
    category: "Attitudinal",
    icon: LayoutGrid,
    available: false,
    tooltip: {
      what: "Respondents organize concepts into categories that make sense to them.",
      when: "Best for understanding mental models and information architecture preferences.",
      produces: "Category structures and grouping logic from the user's perspective.",
    },
  },
  {
    id: "maxdiff",
    label: "MaxDiff",
    category: "Attitudinal",
    icon: ListOrdered,
    available: true,
    selectableValue: "maxdiff",
    tooltip: {
      what: "Best-Worst Scaling — respondents pick the most and least preferred item from sets, forcing trade-offs.",
      when: "Best for feature prioritization, messaging ranking, or value-prop testing where forced choice reveals true priority.",
      produces: "A reliable preference hierarchy across items (more discriminating than simple ratings).",
    },
  },
  {
    id: "kano",
    label: "KANO Analysis",
    category: "Attitudinal",
    icon: Sparkles,
    available: true,
    selectableValue: "kano",
    tooltip: {
      what: "Paired functional/dysfunctional questions per feature classify features as Must-have, Performance, Delighter, Indifferent, or Reverse.",
      when: "Best for roadmap prioritization — distinguishing dissatisfiers (must-haves) from delighters from indifferent.",
      produces: "A KANO classification per feature with the underlying functional/dysfunctional response data.",
    },
  },
  {
    id: "conjoint",
    label: "Conjoint Trade-off",
    category: "Attitudinal",
    icon: Scale,
    available: true,
    selectableValue: "conjoint",
    tooltip: {
      what: "Simplified trade-off scenarios — 'Feature A at price X' vs 'Feature B at price Y' — forcing the synthetic panel to reveal priorities.",
      when: "Best for pricing decisions, feature bundling, and any choice where trade-offs reveal true preference.",
      produces: "Choice-share data per scenario, surfacing what respondents will give up for what.",
    },
  },
  {
    id: "concept_testing",
    label: "Concept Testing",
    category: "Attitudinal",
    icon: Lightbulb,
    available: true,
    selectableValue: "concept_test",
    tooltip: {
      what: "Respondents evaluate early-stage concepts using a tuned battery — clarity, desirability, perceived value, intent. The variant inputs serve as the concepts.",
      when: "Best for validating whether a proposed concept (tagline, feature, design) resonates before full development.",
      produces: "Per-concept reactions plus comparative preference data across concepts.",
    },
  },
  {
    id: "diary_study",
    label: "Diary Study",
    category: "Attitudinal",
    icon: Calendar,
    available: false,
    tooltip: {
      what: "Respondents log experiences over time.",
      when: "Best for understanding longitudinal behavior patterns and contextual usage.",
      produces: "Time-series logs of usage patterns, emotional reactions, and context.",
    },
  },
  {
    id: "focus_groups",
    label: "Focus Groups",
    category: "Attitudinal",
    icon: Users2,
    available: false,
    tooltip: {
      what: "Moderated group discussions among multiple respondents.",
      when: "Best for exploring group dynamics and consensus-building around preferences.",
      produces: "Group reactions, social dynamics, emergent consensus or disagreement.",
    },
  },
  // Behavioral
  {
    id: "beta_testing",
    label: "Beta Testing",
    category: "Behavioral",
    icon: PackageCheck,
    available: false,
    tooltip: {
      what: "Respondents interact with a near-final product.",
      when: "Best for identifying usability issues and feature gaps before launch.",
      produces: "Bug reports, friction points, feature gap signals.",
    },
  },
  {
    id: "pre_release",
    label: "Pre-release Testing",
    category: "Behavioral",
    icon: Rocket,
    available: false,
    tooltip: {
      what: "Respondents evaluate a product in a controlled pre-launch environment.",
      when: "Best for go/no-go launch decisions.",
      produces: "Launch-readiness signal and identified blockers.",
    },
  },
  {
    id: "usability_testing",
    label: "Usability Testing",
    category: "Behavioral",
    icon: MousePointer2,
    available: false,
    tooltip: {
      what: "Respondents complete tasks while the system observes success rates and friction.",
      when: "Best for identifying UX bottlenecks.",
      produces: "Task success rates, time-to-completion, friction map.",
    },
  },
  {
    id: "ab_testing",
    label: "A/B Testing",
    category: "Behavioral",
    icon: GitCompareArrows,
    available: false,
    tooltip: {
      what: "Two or more variants are tested against each other with split audiences.",
      when: "Best for statistically significant preference decisions.",
      produces: "Comparative performance metrics with confidence intervals.",
    },
  },
  {
    id: "observational",
    label: "Observational Studies",
    category: "Behavioral",
    icon: Eye,
    available: false,
    tooltip: {
      what: "Respondents are observed in natural usage contexts.",
      when: "Best for uncovering unarticulated behaviors and workarounds.",
      produces: "Behavioral patterns and tacit usage habits.",
    },
  },
  {
    id: "benchmarking",
    label: "Benchmarking",
    category: "Behavioral",
    icon: Trophy,
    available: false,
    tooltip: {
      what: "Performance is measured against industry standards or competitors.",
      when: "Best for competitive positioning analysis.",
      produces: "Comparative metrics against benchmarks and named competitors.",
    },
  },
  {
    id: "eye_tracking",
    label: "Eye Tracking",
    category: "Behavioral",
    icon: EyeIcon,
    available: false,
    tooltip: {
      what: "Simulated visual attention analysis across design elements.",
      when: "Best for understanding where attention lands and what gets missed.",
      produces: "Heatmaps and attention paths across visual layouts.",
    },
  },
];

function MethodTooltip({
  tooltip,
}: {
  tooltip: MethodDef["tooltip"];
}) {
  return (
    <div className="absolute z-50 bottom-full mb-2 left-1/2 -translate-x-1/2 w-72 neu-card rounded-lg p-3 text-[11px] leading-relaxed pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-ink-mid">
      <div className="space-y-1.5">
        <div>
          <span className="font-bold text-magenta">What: </span>
          {tooltip.what}
        </div>
        <div>
          <span className="font-bold text-sky/80">When: </span>
          {tooltip.when}
        </div>
        <div>
          <span className="font-bold text-sky/80">Produces: </span>
          {tooltip.produces}
        </div>
      </div>
      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-bg-raised" />
    </div>
  );
}

function MethodCard({
  method,
  selected,
  onSelect,
}: {
  method: MethodDef;
  selected: boolean;
  onSelect: (m: MethodDef) => void;
}) {
  const Icon = method.icon;
  const isLocked = !method.available;

  return (
    <div className="relative group">
      <button
        type="button"
        onClick={() => method.available && onSelect(method)}
        disabled={!method.available}
        className={cn(
          "w-full text-left p-3 rounded-xl transition-all duration-200",
          selected
            ? "neu-card border border-magenta/60 shadow-glow-magenta"
            : method.available
            ? "neu-card-sm hover:shadow-glow-magenta hover:border-magenta/40 cursor-pointer"
            : "neu-inset cursor-not-allowed opacity-50"
        )}
      >
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <Icon
              className={cn(
                "w-4 h-4 flex-shrink-0",
                selected
                  ? "text-magenta"
                  : method.available
                  ? "text-ink-mid"
                  : "text-ink-dim"
              )}
            />
            <span
              className={cn(
                "text-xs font-semibold truncate",
                isLocked ? "text-ink-low" : "text-ink-high"
              )}
            >
              {method.label}
            </span>
          </div>
          <Info
            className={cn(
              "w-3 h-3 flex-shrink-0",
              isLocked ? "text-ink-dim" : "text-ink-low"
            )}
          />
        </div>
        <div className="flex items-center gap-1.5">
          {isLocked ? (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/40 px-1.5 py-0.5 rounded">
              <Lock className="w-2 h-2" />
              COMING SOON
            </span>
          ) : (
            <span className="inline-flex items-center text-[9px] font-bold text-sky bg-sky/10 border border-sky/40 px-1.5 py-0.5 rounded">
              ✓ AVAILABLE
            </span>
          )}
        </div>
      </button>
      <MethodTooltip tooltip={method.tooltip} />
    </div>
  );
}

export function MethodsCatalog({
  selectedMethod,
  onSelect,
}: {
  selectedMethod: ResearchMethod | null;
  onSelect: (method: ResearchMethod) => void;
}) {
  const attitudinal = METHODS.filter((m) => m.category === "Attitudinal");
  const behavioral = METHODS.filter((m) => m.category === "Behavioral");

  return (
    <div className="neu-card-sm rounded-xl p-4 space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-bold text-ink-low uppercase tracking-widest">
            Attitudinal Methods
          </span>
          <div className="flex-1 h-px bg-bg-elevated" />
          <span className="text-[9px] text-ink-low">
            What people think & feel
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {attitudinal.map((m) => (
            <MethodCard
              key={m.id}
              method={m}
              selected={
                m.available &&
                m.selectableValue === selectedMethod
              }
              onSelect={(method) => method.selectableValue && onSelect(method.selectableValue)}
            />
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-bold text-ink-low uppercase tracking-widest">
            Behavioral Methods
          </span>
          <div className="flex-1 h-px bg-bg-elevated" />
          <span className="text-[9px] text-ink-low">
            What people actually do
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {behavioral.map((m) => (
            <MethodCard
              key={m.id}
              method={m}
              selected={false}
              onSelect={() => {}}
            />
          ))}
        </div>
      </div>

      <p className="text-[10px] text-ink-low text-center pt-1 border-t border-line">
        💡 Hover any method to see what it does. Locked methods are on the roadmap.
      </p>
    </div>
  );
}
