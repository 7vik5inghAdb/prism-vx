"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { ReportPanel } from "@/components/panels/ReportPanel";
import { ConversationPanel } from "@/components/panels/ConversationPanel";
import { PipelineTracker } from "@/components/panels/PipelineTracker";
import { SavedRunsModal } from "@/components/conversation/SavedRunsModal";
import { SaveRunDialog } from "@/components/conversation/SaveRunDialog";
import { ResumeBanner } from "@/components/conversation/ResumeBanner";
import {
  RefreshCwIcon,
  FolderOpen,
  Save,
  PanelRightOpen,
  PanelRightClose,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Home() {
  const { resetAll, pipelineOpen, togglePipeline, currentRunName, context } =
    useAppStore();
  const [savedOpen, setSavedOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);

  const canSave = !!context;

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
          <span className="text-[10px] text-harvest neu-pill px-2 py-0.5 rounded font-bold tracking-wider">
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
            onClick={togglePipeline}
            className="text-ink-mid hover:text-magenta neu-button p-1.5 rounded-md transition-all ml-1"
            title={pipelineOpen ? "Hide pipeline" : "Show pipeline"}
          >
            {pipelineOpen ? (
              <PanelRightClose className="w-3.5 h-3.5" />
            ) : (
              <PanelRightOpen className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Three-panel layout */}
      <div className="flex w-full h-full pt-12">
        {/* Left: Report panel */}
        <div
          className={cn(
            "min-w-0 h-full flex-shrink-0 transition-all duration-400 ease-out",
            pipelineOpen ? "w-[40%]" : "w-[44%]"
          )}
        >
          <ReportPanel />
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

        {/* Right: Pipeline tracker (collapsible) */}
        <div
          className={cn(
            "h-full flex-shrink-0 overflow-hidden transition-all duration-400 ease-out",
            pipelineOpen ? "w-[20%] min-w-[220px]" : "w-0 min-w-0"
          )}
        >
          <PipelineTracker />
        </div>
      </div>

      <SavedRunsModal open={savedOpen} onClose={() => setSavedOpen(false)} />
      <SaveRunDialog open={saveOpen} onClose={() => setSaveOpen(false)} />
      <ResumeBanner />
    </div>
  );
}
