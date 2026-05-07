"use client";

import { create } from "zustand";
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
};

const initialRunState = {
  currentRunId: null as string | null,
  currentRunName: null as string | null,
  pipelineOpen: true,
};

export const useAppStore = create<AppStore>((set, get) => ({
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
    set({ ...initialState, ...initialRunState, streamingRespondents: [] }),
}));
