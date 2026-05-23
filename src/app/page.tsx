"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { ReportPanel } from "@/components/panels/ReportPanel";
import { ConversationPanel } from "@/components/panels/ConversationPanel";
import { PipelineTracker } from "@/components/panels/PipelineTracker";
import { SavedRunsModal } from "@/components/conversation/SavedRunsModal";
import { SaveRunDialog } from "@/components/conversation/SaveRunDialog";
import { ResumeBanner } from "@/components/conversation/ResumeBanner";
import { FixtureDevPanel } from "@/components/conversation/FixtureDevPanel";
import {
  RefreshCwIcon,
  FolderOpen,
  Save,
  Sun,
  Moon,
  Zap,
  ZapOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Home() {
  const {
    resetAll,
    pipelineOpen,
    currentRunName,
    context,
    autoRunEnabled,
    setAutoRunEnabled,
  } = useAppStore();
  const [savedOpen, setSavedOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);

  const canSave = !!context;

  // Theme: dark default; persists via localStorage; applied as data-theme attr
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  useEffect(() => {
    const saved =
      typeof window !== "undefined"
        ? (localStorage.getItem("prism_theme") as "light" | "dark" | null)
        : null;
    if (saved === "light" || saved === "dark") setTheme(saved);
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("prism_theme", theme);
  }, [theme]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg-base">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 h-12 bg-bg-deep/80 backdrop-blur-md border-b border-line flex items-center justify-between px-4 z-20">
        <div className="flex items-center gap-2.5">
          <img
            src="/logo.png"
            alt="PRISM"
            className="w-8 h-8 rounded-lg object-cover shadow-glow-magenta"
          />
          <div className="flex flex-col leading-none">
            <span className="text-sm font-black tracking-tight bg-prism-gradient bg-clip-text text-transparent">
              PRISM
            </span>
            <span className="text-[9px] text-ink-low font-medium hidden sm:inline mt-0.5">
              Primary Research &amp; Insight Synthesis Model
            </span>
          </div>
          {currentRunName && (
            <>
              <span className="text-ink-dim text-xs mx-1">·</span>
              <span className="text-[11px] text-ink-mid font-medium truncate max-w-[180px]">
                {currentRunName}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-sky neu-pill px-2 py-0.5 rounded font-bold tracking-wider">
            SYNTHETIC RESEARCH · PREVIEW
          </span>

          <div className="h-5 w-px bg-line mx-1" />

          <button
            onClick={() => setSavedOpen(true)}
            className="text-[11px] text-ink-mid hover:text-magenta neu-button px-2.5 py-1 rounded-md flex items-center gap-1.5 font-semibold"
            title="Open saved runs"
          >
            <FolderOpen className="w-3 h-3" />
            Saved Runs
          </button>

          <button
            onClick={() => canSave && setSaveOpen(true)}
            disabled={!canSave}
            className={cn(
              "text-[11px] px-2.5 py-1 rounded-md flex items-center gap-1.5 font-semibold transition-all",
              canSave
                ? "neu-button-primary"
                : "neu-button text-ink-dim cursor-not-allowed opacity-50"
            )}
            title={canSave ? "Save current run" : "Complete Step 1 first"}
          >
            <Save className="w-3 h-3" />
            Save Run
          </button>

          <div className="h-5 w-px bg-line mx-1" />

          <button
            onClick={() => {
              if (confirm("Reset all research? This cannot be undone.")) {
                resetAll();
              }
            }}
            className="text-[11px] text-ink-low hover:text-magenta flex items-center gap-1 transition-colors"
            title="Start a new session"
          >
            <RefreshCwIcon className="w-3 h-3" />
            New
          </button>

          <button
            onClick={() => setAutoRunEnabled(!autoRunEnabled)}
            className={cn(
              "text-[10px] px-2 py-1 rounded-md flex items-center gap-1.5 font-bold transition-all uppercase tracking-wider",
              autoRunEnabled
                ? "text-magenta neu-card-sm border border-magenta/40"
                : "text-ink-mid neu-button"
            )}
            title={
              autoRunEnabled
                ? "Auto-run is ON — pipeline advances itself with minimum panel sizes. Click to turn off."
                : "Auto-run is OFF — confirm each step manually. Click to turn on."
            }
          >
            {autoRunEnabled ? (
              <Zap className="w-3 h-3" />
            ) : (
              <ZapOff className="w-3 h-3" />
            )}
            Auto {autoRunEnabled ? "ON" : "OFF"}
          </button>

          <button
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            className="text-ink-mid hover:text-magenta neu-button p-1.5 rounded-md transition-all"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? (
              <Sun className="w-3.5 h-3.5" />
            ) : (
              <Moon className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Floating re-open tab — only visible when the pipeline is collapsed */}
      {!pipelineOpen && (
        <button
          onClick={() => useAppStore.getState().togglePipeline()}
          className="fixed left-0 top-1/2 -translate-y-1/2 z-30 neu-card-sm rounded-r-md border-l-0 px-1.5 py-3 hover:border-magenta/40 transition-all group"
          title="Show pipeline"
        >
          <span className="block text-[9px] font-bold tracking-widest text-ink-mid group-hover:text-magenta uppercase" style={{ writingMode: "vertical-rl" }}>
            Pipeline
          </span>
        </button>
      )}

      {/* Three-panel layout (mirrored: Pipeline · Conversation · Report) */}
      <div className="flex w-full h-full pt-12">
        {/* Left: Pipeline tracker (collapsible) */}
        <div
          className={cn(
            "h-full flex-shrink-0 overflow-hidden transition-all duration-400 ease-out",
            pipelineOpen ? "w-[20%] min-w-[220px]" : "w-0 min-w-0"
          )}
        >
          <PipelineTracker />
        </div>

        {/* Center: Conversation panel */}
        <div
          className={cn(
            "min-w-0 h-full flex-shrink-0 border-x border-line transition-all duration-400 ease-out",
            pipelineOpen ? "w-[40%]" : "w-[56%]"
          )}
        >
          <ConversationPanel />
        </div>

        {/* Right: Report panel */}
        <div
          className={cn(
            "min-w-0 h-full flex-shrink-0 transition-all duration-400 ease-out",
            pipelineOpen ? "w-[40%]" : "w-[44%]"
          )}
        >
          <ReportPanel />
        </div>
      </div>

      <SavedRunsModal open={savedOpen} onClose={() => setSavedOpen(false)} />
      <SaveRunDialog open={saveOpen} onClose={() => setSaveOpen(false)} />
      <ResumeBanner />
      <FixtureDevPanel />
    </div>
  );
}
