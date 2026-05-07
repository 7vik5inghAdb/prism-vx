"use client";

import { useState } from "react";
import { ChevronDown, User, Quote } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SurveyRespondent, InterviewRespondent } from "@/types";

function isInterview(
  r: SurveyRespondent | InterviewRespondent
): r is InterviewRespondent {
  return "transcript" in r;
}

function summarize(r: SurveyRespondent | InterviewRespondent): string {
  if (isInterview(r)) {
    const first = r.transcript[0]?.answer ?? "";
    return first.slice(0, 80) + (first.length > 80 ? "…" : "");
  }
  // Survey: take first open-ended answer or first rating commentary
  const open = r.answers.find(
    (a) => a.questionType === "open_ended" && typeof a.answer === "string"
  );
  if (open) {
    const text = String(open.answer);
    return text.slice(0, 80) + (text.length > 80 ? "…" : "");
  }
  const rating = r.answers.find((a) => a.questionType === "rating");
  if (rating) {
    return `Rated ${String(rating.answer)} on first scaled question`;
  }
  return "Responded to all questions";
}

export function RespondentCard({
  respondent,
  index,
}: {
  respondent: SurveyRespondent | InterviewRespondent;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const interview = isInterview(respondent);
  const summary = summarize(respondent);

  return (
    <div
      className={cn(
        "border border-line rounded-lg overflow-hidden transition-all bg-bg-deep",
        expanded ? "shadow-md" : "hover:border-magenta/40 hover:shadow-sm"
      )}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-3 py-2.5 flex items-start gap-2.5 hover:bg-bg-elevated/60 transition-colors"
      >
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-prism-100 to-prism-200 flex items-center justify-center flex-shrink-0">
          <User className="w-3.5 h-3.5 text-magenta" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-bold text-ink-high">
              {respondent.respondentId}
            </span>
            <span className="text-[10px] bg-magenta/10 text-magenta px-1.5 py-0.5 rounded font-semibold">
              {respondent.personaClusterName}
            </span>
            {interview && (
              <span className="text-[9px] bg-magenta/10 text-magenta px-1.5 py-0.5 rounded font-semibold">
                INTERVIEW
              </span>
            )}
          </div>
          <p className="text-[11px] text-ink-low line-clamp-2 leading-snug">
            {summary}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-ink-low flex-shrink-0 transition-transform mt-1",
            expanded && "rotate-180"
          )}
        />
      </button>

      {expanded && (
        <div className="border-t border-line bg-bg-raised/40 px-3 py-3 space-y-2 animate-slide-in">
          <div className="text-[10px] text-ink-low italic">
            {respondent.personaProfile.slice(0, 200)}
            {respondent.personaProfile.length > 200 ? "…" : ""}
          </div>

          {interview ? (
            <div className="space-y-2 mt-2">
              {respondent.transcript.map((t, i) => (
                <div key={i} className="bg-bg-deep rounded-md p-2 border border-line">
                  <p className="text-[10px] font-bold text-ink-mid mb-1">
                    Q: {t.question}
                  </p>
                  <p className="text-[11px] text-ink-mid leading-relaxed italic">
                    &ldquo;{t.answer}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <SurveyAnswers respondent={respondent} />
          )}
        </div>
      )}
    </div>
  );
}

function SurveyAnswers({ respondent }: { respondent: SurveyRespondent }) {
  // Group by variant if present, otherwise flat
  const grouped = new Map<string, typeof respondent.answers>();
  const flat: typeof respondent.answers = [];

  respondent.answers.forEach((a) => {
    if (a.variantId) {
      const existing = grouped.get(a.variantId) ?? [];
      existing.push(a);
      grouped.set(a.variantId, existing);
    } else {
      flat.push(a);
    }
  });

  return (
    <div className="space-y-2 mt-2">
      {Array.from(grouped.entries()).map(([variantId, answers]) => (
        <div
          key={variantId}
          className="bg-bg-deep rounded-md p-2 border border-line"
        >
          <p className="text-[9px] font-bold text-magenta uppercase tracking-wider mb-1">
            For: &ldquo;{answers[0]?.variantText || variantId}&rdquo;
          </p>
          <div className="space-y-1">
            {answers.map((a) => (
              <div key={a.questionId + a.variantId} className="flex gap-2">
                <span
                  className={cn(
                    "text-[8px] font-bold px-1 py-0.5 rounded flex-shrink-0 uppercase",
                    a.questionType === "rating" && "bg-sky/15 text-sky",
                    a.questionType === "likert" && "bg-sky/15 text-sky",
                    a.questionType === "open_ended" && "bg-harvest/15 text-harvest"
                  )}
                >
                  {a.questionType === "open_ended" ? "Open" : a.questionType}
                </span>
                <span className="text-[10px] text-ink-mid leading-snug">
                  {String(a.answer)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
      {flat.length > 0 && (
        <div className="bg-bg-deep rounded-md p-2 border border-line">
          <p className="text-[9px] font-bold text-ink-low uppercase tracking-wider mb-1">
            Cross-Variant Questions
          </p>
          <div className="space-y-1">
            {flat.map((a) => (
              <div key={a.questionId} className="flex flex-col gap-0.5 pb-1">
                <span className="text-[10px] text-ink-low italic">
                  {a.questionText.slice(0, 80)}
                </span>
                <div className="flex gap-2 items-start">
                  <Quote className="w-2.5 h-2.5 text-ink-low flex-shrink-0 mt-0.5" />
                  <span className="text-[10px] text-ink-mid">
                    {String(a.answer)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
