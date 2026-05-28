"use client";

import { useEffect, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { Step0Welcome } from "@/components/steps/Step0Welcome";
import { Step1Context } from "@/components/steps/Step1Context";
import { Step2Personas } from "@/components/steps/Step2Personas";
import { Step3Instrument } from "@/components/steps/Step3Instrument";
import { Step4Simulation } from "@/components/steps/Step4Simulation";
import { Step5Report } from "@/components/steps/Step5Report";
import { StepDivider, Message } from "@/components/conversation/Message";
import { StepRecapDetail } from "@/components/conversation/StepRecapDetail";
import { STEP_INFO, type Step } from "@/types";
import { ChevronDown, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

function CompletedRecapSummary({ stepNumber }: { stepNumber: number }) {
  const { context, interpretation, personas, selectedMethod, instrument, panelResults } =
    useAppStore();

  if (stepNumber === 1 && interpretation) {
    return (
      <span>
        <span className="font-semibold text-ink-mid">Context confirmed:</span>{" "}
        {interpretation.researchFocus}
      </span>
    );
  }
  if (stepNumber === 2 && personas) {
    return (
      <span>
        <span className="font-semibold text-ink-mid">
          {personas.length} persona clusters
        </span>{" "}
        confirmed: {personas.map((p) => p.name).join(", ")}
      </span>
    );
  }
  if (stepNumber === 3 && instrument && selectedMethod) {
    return (
      <span>
        <span className="font-semibold text-ink-mid capitalize">
          {selectedMethod}
        </span>{" "}
        instrument confirmed · {instrument.questions.length} questions
        {instrument.variants
          ? ` · ${instrument.variants.items.length} variants`
          : ""}
      </span>
    );
  }
  if (stepNumber === 4 && panelResults) {
    return (
      <span>
        <span className="font-semibold text-ink-mid">
          {panelResults.respondents.length} respondents
        </span>{" "}
        simulated
      </span>
    );
  }
  return null;
}

function ExpandableRecapCard({
  stepNumber,
  refSetter,
}: {
  stepNumber: Step;
  refSetter: (el: HTMLDivElement | null) => void;
}) {
  const { expandedReviewStep, toggleReviewStep } = useAppStore();
  const expanded = expandedReviewStep === stepNumber;

  return (
    <div ref={refSetter}>
      <Message
        variant="orchestrator"
        embed={
          <div className="space-y-2">
            <button
              onClick={() => toggleReviewStep(stepNumber)}
              className={cn(
                "w-full text-left flex items-center justify-between gap-2 px-3 py-2 rounded-lg transition-all",
                expanded
                  ? "neu-card-sm border border-magenta/40"
                  : "neu-card-sm hover:border-magenta/30"
              )}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <BookOpen
                  className={cn(
                    "w-3.5 h-3.5 flex-shrink-0 transition-colors",
                    expanded ? "text-magenta" : "text-ink-low"
                  )}
                />
                <div className="text-[12px] text-ink-mid min-w-0 flex-1">
                  <CompletedRecapSummary stepNumber={stepNumber} />
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-[9px] font-bold text-ink-low uppercase tracking-wider hidden sm:inline">
                  {expanded ? "Hide" : "Review"}
                </span>
                <ChevronDown
                  className={cn(
                    "w-3.5 h-3.5 text-ink-low transition-transform",
                    expanded && "rotate-180 text-magenta"
                  )}
                />
              </div>
            </button>
            {expanded && (
              <div className="animate-slide-in">
                <StepRecapDetail step={stepNumber} />
              </div>
            )}
          </div>
        }
      />
    </div>
  );
}

export function ConversationPanel() {
  const {
    currentStep,
    stepStatuses,
    expandedReviewStep,
    setExpandedReviewStep,
    context,
    interpretation,
  } = useAppStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Auto-scroll to bottom on step advance (collapse any expanded review)
  useEffect(() => {
    setExpandedReviewStep(null);
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  // Scroll to expanded review step
  useEffect(() => {
    if (expandedReviewStep == null) return;
    const el = stepRefs.current.get(expandedReviewStep);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [expandedReviewStep]);

  const completedSteps: Step[] = [];
  for (let s = 1; s < currentStep; s++) {
    if (stepStatuses[s as Step] === "completed") {
      completedSteps.push(s as Step);
    }
  }

  // At the very start of a session (no context filled yet) we show the
  // Step 0 welcome with use-case cards instead of the blank Step 1 form.
  // Snapshot-loaded sessions skip this because they set context+report+etc.
  const showWelcome =
    currentStep === 1 && context === null && interpretation === null;

  const ActiveStep = showWelcome
    ? Step0Welcome
    : currentStep === 1
      ? Step1Context
      : currentStep === 2
      ? Step2Personas
      : currentStep === 3
      ? Step3Instrument
      : currentStep === 4
      ? Step4Simulation
      : Step5Report;

  const activeStepInfo = STEP_INFO.find((s) => s.number === currentStep);

  return (
    <div className="flex flex-col h-full bg-bg-base">
      <div className="flex-shrink-0 px-5 py-3 border-b border-line bg-bg-deep/60 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-ink-high">Conversation</p>
          <p className="text-[10px] text-ink-low">
            Step {currentStep} of 5 · {activeStepInfo?.shortLabel}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-magenta animate-pulse" />
          <span className="text-[10px] text-ink-low font-semibold uppercase tracking-wider">
            Live
          </span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4">
        {completedSteps.map((s) => {
          const info = STEP_INFO.find((si) => si.number === s);
          return (
            <div
              key={`recap-${s}`}
              ref={(el) => {
                if (el) stepRefs.current.set(s, el);
                else stepRefs.current.delete(s);
              }}
            >
              <StepDivider stepNumber={s} label={info?.shortLabel || ""} />
              <ExpandableRecapCard
                stepNumber={s}
                refSetter={() => {}}
              />
            </div>
          );
        })}

        <div key={`active-${currentStep}`}>
          {completedSteps.length > 0 && activeStepInfo && (
            <StepDivider
              stepNumber={currentStep}
              label={activeStepInfo.shortLabel}
            />
          )}
          <ActiveStep />
        </div>
      </div>

      <div className="flex-shrink-0 px-5 py-2 border-t border-line bg-bg-deep/40">
        <p className="text-[9px] text-ink-dim text-center">
          Forward-only flow · Click past steps in the pipeline to review them
        </p>
      </div>
    </div>
  );
}
