"use client";

import { create } from "zustand";
import {
  persist,
  createJSONStorage,
  type StateStorage,
} from "zustand/middleware";
import type {
  AppState,
  Step,
  ResearchContext,
  OrchestratorInterpretation,
  PersonaCluster,
  ResearchMethod,
  ResearchInstrument,
  PanelResults,
  SimulationProgress,
  ResearchReport,
  StepStatus,
  SurveyRespondent,
  InterviewRespondent,
} from "@/types";

interface AppStore extends AppState {
  setLoading: (loading: boolean, message?: string) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  advanceToStep: (step: Step) => void;
  setStepStatus: (step: Step, status: StepStatus) => void;

  setContext: (ctx: ResearchContext) => void;
  setInterpretation: (interp: OrchestratorInterpretation | null) => void;
  setPersonas: (personas: PersonaCluster[] | null) => void;
  setSelectedMethod: (method: ResearchMethod | null) => void;
  setInstrument: (instrument: ResearchInstrument | null) => void;
  setPanelResults: (results: PanelResults | null) => void;
  setSimulationProgress: (progress: SimulationProgress | null) => void;
  setReport: (report: ResearchReport | null) => void;

  setSurveyPanelSize: (size: number) => void;
  setInterviewPanelSize: (size: number) => void;
  appendStreamingRespondents: (
    respondents: (SurveyRespondent | InterviewRespondent)[]
  ) => void;
  resetStreamingRespondents: () => void;

  // Saved runs
  currentRunId: string | null;
  currentRunName: string | null;
  setCurrentRun: (id: string, name: string) => void;
  loadRunSnapshot: (snapshot: {
    id: string;
    name: string;
    currentStep: Step;
    stepStatuses: Record<Step, StepStatus>;
    context: ResearchContext | null;
    interpretation: OrchestratorInterpretation | null;
    personas: PersonaCluster[] | null;
    selectedMethod: ResearchMethod | null;
    instrument: ResearchInstrument | null;
    panelResults: PanelResults | null;
    report: ResearchReport | null;
    surveyPanelSize: number;
    interviewPanelSize: number;
  }) => void;

  // UI state
  pipelineOpen: boolean;
  togglePipeline: () => void;
  expandedReviewStep: Step | null;
  setExpandedReviewStep: (step: Step | null) => void;
  toggleReviewStep: (step: Step) => void;

  retryCurrentStep: () => void;
  resetAll: () => void;
}

const initialStepStatuses: Record<Step, StepStatus> = {
  1: "active",
  2: "pending",
  3: "pending",
  4: "pending",
  5: "pending",
};

const initialState: AppState = {
  currentStep: 1,
  stepStatuses: { ...initialStepStatuses },
  isLoading: false,
  loadingMessage: "",
  error: null,
  context: null,
  interpretation: null,
  personas: null,
  selectedMethod: null,
  instrument: null,
  panelResults: null,
  simulationProgress: null,
  report: null,
  surveyPanelSize: 100,
  interviewPanelSize: 3,
  streamingRespondents: [],
  autosavedAt: null,
};

const initialRunState = {
  currentRunId: null as string | null,
  currentRunName: null as string | null,
  pipelineOpen: true,
  expandedReviewStep: null as Step | null,
};

// ── Quota-safe localStorage adapter ──────────────────────────────────────────
// Zustand's default `createJSONStorage(() => localStorage)` does not handle
// `QuotaExceededError`. When the persisted blob grows past ~5 MB the write
// silently fails and resume-after-crash stops working. This wrapper catches
// the quota error, slims state aggressively (drop the report, then the panel
// results), and as a final fallback clears the autosave key.

function isQuotaError(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  return (
    e.name === "QuotaExceededError" ||
    // Older Firefox name
    e.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    /quota/i.test(e.message)
  );
}

const safeStorage: StateStorage = {
  getItem: (name) => {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  removeItem: (name) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(name);
    } catch {
      /* noop */
    }
  },
  setItem: (name, value) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(name, value);
    } catch (e) {
      if (!isQuotaError(e)) {
        console.error("[PRISM] localStorage write failed:", e);
        return;
      }
      // Tier 1 fallback: drop the heaviest non-essential state and retry.
      try {
        const parsed = JSON.parse(value);
        if (parsed?.state) {
          parsed.state.report = null;
          parsed.state.panelResults = null;
        }
        localStorage.setItem(name, JSON.stringify(parsed));
        console.warn(
          "[PRISM] localStorage quota exceeded — autosave continued without the report and panel results. Use the 'Save Run' button to capture state safely."
        );
        return;
      } catch (e2) {
        if (!isQuotaError(e2)) {
          console.error("[PRISM] Tier-1 autosave fallback failed:", e2);
        }
      }
      // Tier 2 fallback: clear the key so future writes don't keep throwing.
      try {
        localStorage.removeItem(name);
      } catch {
        /* noop */
      }
      console.error(
        "[PRISM] Autosave disabled this session — storage quota cannot be satisfied. Use the 'Save Run' button to capture state."
      );
    }
  },
};

// Strip the base64 `content` of image attachments before persisting. Keep the
// metadata (name, kind, size, mediaType) so the UI can show "image attached"
// after resume; the LLM has already consumed the image content at orchestrator
// time so it's not needed downstream.
function slimContext(ctx: import("@/types").ResearchContext): import("@/types").ResearchContext {
  if (!ctx.attachments || ctx.attachments.length === 0) return ctx;
  return {
    ...ctx,
    attachments: ctx.attachments.map((a) =>
      a.kind === "image" ? { ...a, content: "" } : a
    ),
  };
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
  ...initialState,
  ...initialRunState,

  setLoading: (loading, message = "") =>
    set({ isLoading: loading, loadingMessage: message, error: null }),

  setError: (error) => set({ error, isLoading: false, loadingMessage: "" }),

  clearError: () => set({ error: null }),

  advanceToStep: (step) => {
    const current = get().currentStep;
    if (step !== current + 1) return;
    set((state) => ({
      currentStep: step,
      stepStatuses: {
        ...state.stepStatuses,
        [current]: "completed",
        [step]: "active",
      },
    }));
  },

  setStepStatus: (step, status) =>
    set((state) => ({
      stepStatuses: { ...state.stepStatuses, [step]: status },
    })),

  setContext: (ctx) => set({ context: ctx }),
  setInterpretation: (interp) => set({ interpretation: interp }),
  setPersonas: (personas) => set({ personas }),
  setSelectedMethod: (method) => set({ selectedMethod: method }),
  setInstrument: (instrument) => set({ instrument }),
  setPanelResults: (results) => set({ panelResults: results }),
  setSimulationProgress: (progress) => set({ simulationProgress: progress }),
  setReport: (report) => set({ report }),

  setSurveyPanelSize: (size) =>
    set({ surveyPanelSize: Math.max(20, Math.min(500, size)) }),
  setInterviewPanelSize: (size) =>
    set({ interviewPanelSize: Math.max(1, Math.min(10, size)) }),
  appendStreamingRespondents: (respondents) =>
    set((s) => ({
      streamingRespondents: [...s.streamingRespondents, ...respondents],
    })),
  resetStreamingRespondents: () => set({ streamingRespondents: [] }),

  setCurrentRun: (id, name) => set({ currentRunId: id, currentRunName: name }),

  loadRunSnapshot: (snapshot) =>
    set({
      currentRunId: snapshot.id,
      currentRunName: snapshot.name,
      currentStep: snapshot.currentStep,
      stepStatuses: snapshot.stepStatuses,
      context: snapshot.context,
      interpretation: snapshot.interpretation,
      personas: snapshot.personas,
      selectedMethod: snapshot.selectedMethod,
      instrument: snapshot.instrument,
      panelResults: snapshot.panelResults,
      report: snapshot.report,
      surveyPanelSize: snapshot.surveyPanelSize,
      interviewPanelSize: snapshot.interviewPanelSize,
      simulationProgress: null,
      streamingRespondents: [],
      isLoading: false,
      loadingMessage: "",
      error: null,
    }),

  togglePipeline: () => set((s) => ({ pipelineOpen: !s.pipelineOpen })),
  setExpandedReviewStep: (step) => set({ expandedReviewStep: step }),
  toggleReviewStep: (step) =>
    set((s) => ({
      expandedReviewStep: s.expandedReviewStep === step ? null : step,
    })),

  retryCurrentStep: () => {
    const step = get().currentStep;
    set((state) => ({
      error: null,
      isLoading: false,
      loadingMessage: "",
      stepStatuses: { ...state.stepStatuses, [step]: "active" },
    }));
  },

  resetAll: () =>
    set({
      ...initialState,
      ...initialRunState,
      streamingRespondents: [],
      autosavedAt: null,
    }),
}),
    {
      name: "prism_autosave_v1",
      storage: createJSONStorage(() => safeStorage),
      // Persist everything except transient UI state. We intentionally exclude
      // `streamingRespondents` (it's a duplicate of `panelResults.respondents`
      // and gets re-seeded onRehydrate) and we strip base64 image content from
      // attachments — both prevent localStorage quota blowouts.
      partialize: (state) => ({
        currentStep: state.currentStep,
        stepStatuses: state.stepStatuses,
        context: state.context ? slimContext(state.context) : null,
        interpretation: state.interpretation,
        personas: state.personas,
        selectedMethod: state.selectedMethod,
        instrument: state.instrument,
        panelResults: state.panelResults,
        report: state.report,
        surveyPanelSize: state.surveyPanelSize,
        interviewPanelSize: state.interviewPanelSize,
        currentRunId: state.currentRunId,
        currentRunName: state.currentRunName,
        pipelineOpen: state.pipelineOpen,
        autosavedAt: state.autosavedAt,
      }),
      // On rehydration, re-seed streamingRespondents from panelResults so the
      // Step 4 UI continues to show all completed respondent cards.
      onRehydrateStorage: () => (state) => {
        if (state && state.panelResults && state.panelResults.respondents) {
          state.streamingRespondents = [...state.panelResults.respondents];
        }
      },
    }
  )
);

// Stamp the autosave timestamp on every state change that includes real progress.
if (typeof window !== "undefined") {
  let lastStamp = 0;
  useAppStore.subscribe((state) => {
    const hasProgress =
      state.context !== null ||
      state.currentStep > 1 ||
      state.streamingRespondents.length > 0;
    if (!hasProgress) return;
    const now = Date.now();
    // Throttle: stamp at most every 2 seconds
    if (now - lastStamp < 2000) return;
    lastStamp = now;
    const ts = new Date().toISOString();
    if (state.autosavedAt !== ts) {
      useAppStore.setState({ autosavedAt: ts });
    }
  });
}
