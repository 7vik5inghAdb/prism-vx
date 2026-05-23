"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CheckIcon } from "lucide-react";

export type MessageVariant = "orchestrator" | "user" | "system";

export function Message({
  variant,
  children,
  embed,
  timestamp,
  status,
}: {
  variant: MessageVariant;
  children?: ReactNode;
  embed?: ReactNode;
  timestamp?: string;
  status?: "sending" | "sent" | "thinking";
}) {
  if (variant === "system") {
    return (
      <div className="flex justify-center my-3 animate-slide-in">
        <span className="text-[10px] text-ink-low neu-pill px-2.5 py-1 rounded-full">
          {children}
        </span>
      </div>
    );
  }

  if (variant === "user") {
    return (
      <div className="flex justify-end gap-2 my-3 animate-slide-in">
        <div className="max-w-[85%]">
          <div
            className="rounded-2xl rounded-br-sm px-4 py-2.5 text-sm leading-relaxed text-white"
            style={{
              background: "linear-gradient(135deg, #E753FE 0%, #B240D8 100%)",
              boxShadow:
                "0 4px 14px rgba(231, 83, 254, 0.30), inset 0 1px 0 rgba(255,255,255,0.20), inset 0 -1px 0 rgba(0,0,0,0.15)",
            }}
          >
            {children}
          </div>
          {(timestamp || status) && (
            <div className="text-[10px] text-ink-dim mt-1 text-right flex items-center gap-1 justify-end">
              {status === "sent" && (
                <CheckIcon className="w-2.5 h-2.5 text-magenta-400" />
              )}
              {timestamp}
            </div>
          )}
        </div>
        <div className="w-7 h-7 rounded-full neu-card-sm flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-ink-mid">
          PM
        </div>
      </div>
    );
  }

  // Orchestrator
  return (
    <div className="flex gap-2 my-3 animate-slide-in">
      <div className="w-7 h-7 rounded-full flex-shrink-0 overflow-hidden border border-magenta/40 shadow-glow-magenta">
        <img src="/logo.png" alt="PRISM" className="w-full h-full object-cover" />
      </div>
      <div className="max-w-[92%] flex-1 min-w-0">
        {children && (
          <div className="neu-card rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm leading-relaxed text-ink-high">
            {status === "thinking" ? (
              <ThinkingDots />
            ) : (
              <div className="whitespace-pre-wrap">{children}</div>
            )}
          </div>
        )}
        {embed && (
          <div className={cn("mt-2", children && "ml-0")}>{embed}</div>
        )}
        {timestamp && (
          <div className="text-[10px] text-ink-dim mt-1">PRISM · {timestamp}</div>
        )}
      </div>
    </div>
  );
}

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      <span
        className="w-1.5 h-1.5 rounded-full bg-magenta animate-pulse"
        style={{ animationDelay: "0ms" }}
      />
      <span
        className="w-1.5 h-1.5 rounded-full bg-sky animate-pulse"
        style={{ animationDelay: "150ms" }}
      />
      <span
        className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"
        style={{ animationDelay: "300ms" }}
      />
    </div>
  );
}

export function StepDivider({
  stepNumber,
  label,
}: {
  stepNumber: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 my-5">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-line-strong to-transparent" />
      <span className="text-[10px] font-bold text-ink-low uppercase tracking-widest neu-pill px-3 py-1 rounded-full">
        Step {stepNumber} · {label}
      </span>
      <div className="flex-1 h-px bg-gradient-to-l from-transparent via-line-strong to-transparent" />
    </div>
  );
}
