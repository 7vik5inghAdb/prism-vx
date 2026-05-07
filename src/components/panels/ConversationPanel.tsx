"use client";

import { useEffect, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { Step1Context } from "@/components/steps/Step1Context";
import { Step2Personas } from "@/components/steps/Step2Personas";
import { Step3Instrument } from "@/components/steps/Step3Instrument";
import { Step4Simulation } from "@/components/steps/Step4Simulation";
import { Step5Report } from "@/components/steps/Step5Report";
import { StepDivider, Message } from "@/components/conversation/Message";
import { STEP_INFO } from "@/types";

function CompletedStepRecap({ stepNumber }: { stepNumber: number }) {
  const { context, interpretation, personas, selectedMethod, instrument, panelResults } = useAppStore();

  if (stepNumber === 1 && interpretation) {
    return (
      <Message variant="orchestrator">
        <span className="text-[12px]">
          <span className="font-semibold">Context confirmed:</span>{" "}
          {interpretation.researchFocus}
        </span>
      </Message>
    );
  }
  if (stepNumber === 2 && personas) {
    return (
      <Message variant="orchestrator">
        <span className="text-[12px]">
          <span className="font-semibold">{personas.length} persona clusters</span>{" "}
          confirmed: {personas.map((p) => p.name).join(", ")}
        </span>
      </Message>
    );
  }
  if (stepNumber === 3 && instrument && selectedMethod) {
    return (
      <Message variant="orchestrator">
        <span className="text-[12px]">
          <span className="font-semibold capitalize">{selectedMethod}</span>{" "}
          instrument confirmed · {instrument.questions.length} questions
          {instrument.variants ? ` · ${instrument.variants.items.length} variants` : ""}
        </span>
      </Message>
    );
  }
  if (stepNumber === 4 && panelResults) {
    return (
      <Message variant="orchestrator">
        <span className="text-[12px]">
          <span className="font-semibold">
            {panelResults.respondents.length} respondents
          </span>{" "}
          simulated and ready for synthesis
        </span>
      </Message>
    );
  }
  return null;
}

export function ConversationPanel() {
  const { currentStep, stepStatuses } = useAppStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [currentStep]);

  const completedSteps: number[] = [];
  for (let s = 1; s < currentStep; s++) {
    if (stepStatuses[s as 1 | 2 | 3 | 4] === "completed") {
      completedSteps.push(s);
    }
  }

  const ActiveStep =
    currentStep === 1
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
          <p className="text-xs font-bold text-ink-high">
            Conversation
          </p>
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
            <div key={`recap-${s}`}>
              <StepDivider stepNumber={s} label={info?.shortLabel || ""} />
              <CompletedStepRecap stepNumber={s} />
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
          Forward-only flow · Each step requires confirmation to advance
        </p>
      </div>
    </div>
  );
}
