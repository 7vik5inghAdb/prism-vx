"use client";

import type {
  ResearchContext,
  OrchestratorInterpretation,
  PersonaCluster,
  ResearchMethod,
  ResearchInstrument,
  PanelResults,
  ResearchReport,
  Step,
  StepStatus,
} from "@/types";

const STORAGE_KEY = "prism_saved_runs_v1";

export interface SavedRun {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
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
}

export interface SavedRunMeta {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  currentStep: Step;
  hypothesisPreview: string;
  methodLabel: string;
  reportReady: boolean;
}

function readAll(): SavedRun[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedRun[];
  } catch {
    return [];
  }
}

function writeAll(runs: SavedRun[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
}

export function listRuns(): SavedRunMeta[] {
  return readAll()
    .map<SavedRunMeta>((r) => ({
      id: r.id,
      name: r.name,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      currentStep: r.currentStep,
      hypothesisPreview: r.context?.hypothesis?.slice(0, 100) ?? "—",
      methodLabel: r.selectedMethod
        ? r.selectedMethod === "survey"
          ? "Survey"
          : "Interview"
        : "—",
      reportReady: !!r.report,
    }))
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export function loadRun(id: string): SavedRun | null {
  return readAll().find((r) => r.id === id) ?? null;
}

export function saveRun(run: Omit<SavedRun, "id" | "createdAt" | "updatedAt"> & { id?: string }): SavedRun {
  const all = readAll();
  const now = new Date().toISOString();

  if (run.id) {
    const existing = all.findIndex((r) => r.id === run.id);
    if (existing >= 0) {
      const updated: SavedRun = {
        ...all[existing],
        ...(run as SavedRun),
        id: run.id,
        updatedAt: now,
      };
      all[existing] = updated;
      writeAll(all);
      return updated;
    }
  }

  const newRun: SavedRun = {
    ...(run as SavedRun),
    id: `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    updatedAt: now,
  };
  all.push(newRun);
  writeAll(all);
  return newRun;
}

export function deleteRun(id: string): void {
  writeAll(readAll().filter((r) => r.id !== id));
}

export function deriveAutoName(ctx: ResearchContext | null): string {
  if (!ctx?.hypothesis) return `Run · ${new Date().toLocaleString()}`;
  const words = ctx.hypothesis.trim().split(/\s+/).slice(0, 6).join(" ");
  return words.length > 50 ? words.slice(0, 50) + "…" : words;
}
