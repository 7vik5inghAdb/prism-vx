"use client";

import { useState } from "react";
import { ChevronDown, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  SurveyRespondent,
  InterviewRespondent,
  QuestionType,
} from "@/types";

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

const TYPE_LABEL: Record<QuestionType, string> = {
  rating: "Rating",
  likert: "Likert",
  open_ended: "Open",
  forced_ranking: "Ranking",
  allocation: "Allocation",
  semantic_differential: "Sem Diff",
  multiple_choice: "MC",
  matrix: "Matrix",
  sentence_completion: "Sentence",
  word_association: "Words",
  scenario: "Scenario",
  yes_no_why: "Y/N+Why",
  nps: "NPS",
};

const TYPE_STYLE: Record<QuestionType, string> = {
  rating: "bg-sky/15 text-sky",
  likert: "bg-sky/15 text-sky",
  matrix: "bg-sky/15 text-sky",
  multiple_choice: "bg-sky/15 text-sky",
  open_ended: "bg-green-500/15 text-green-500",
  sentence_completion: "bg-green-500/15 text-green-500",
  word_association: "bg-green-500/15 text-green-500",
  scenario: "bg-green-500/15 text-green-500",
  forced_ranking: "bg-magenta/15 text-magenta",
  allocation: "bg-magenta/15 text-magenta",
  semantic_differential: "bg-magenta/15 text-magenta",
  yes_no_why: "bg-green-500/15 text-green-500",
  nps: "bg-sky/15 text-sky",
};

function formatAnswer(answer: string | number): string {
  if (typeof answer !== "string") return String(answer);
  const trimmed = answer.trim();
  // Complex types serialize as JSON strings — pretty-print when possible
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    try {
      return JSON.stringify(JSON.parse(trimmed), null, 2);
    } catch {
      // not valid JSON — fall through
    }
  }
  return answer;
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
  void index; // index reserved for future zebra striping

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
                <details
                  key={i}
                  className="bg-bg-deep rounded-md border border-line overflow-hidden"
                >
                  <summary className="cursor-pointer px-2 py-1.5 hover:bg-bg-elevated/40 flex items-start gap-2 text-[10px]">
                    <span className="text-[8px] font-bold bg-magenta/15 text-magenta px-1 py-0.5 rounded flex-shrink-0 uppercase">
                      Q{i + 1}
                    </span>
                    <span className="text-ink-mid font-medium flex-1 min-w-0 line-clamp-1">
                      {t.question}
                    </span>
                    <ChevronDown className="w-2.5 h-2.5 text-ink-low flex-shrink-0 mt-0.5" />
                  </summary>
                  <div className="px-2 pb-2 pt-1 text-[11px] text-ink-mid leading-relaxed italic whitespace-pre-wrap break-words">
                    &ldquo;{t.answer}&rdquo;
                  </div>
                </details>
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

function AnswerRow({
  questionType,
  questionText,
  answer,
  variantId,
}: {
  questionType: QuestionType;
  questionText: string;
  answer: string | number;
  variantId?: string;
}) {
  return (
    <details className="bg-bg-deep rounded border border-line/60 overflow-hidden">
      <summary className="cursor-pointer px-1.5 py-1 hover:bg-bg-elevated/40 flex items-start gap-2 text-[10px]">
        <span
          className={cn(
            "text-[8px] font-bold px-1 py-0.5 rounded flex-shrink-0 uppercase",
            TYPE_STYLE[questionType]
          )}
        >
          {TYPE_LABEL[questionType]}
        </span>
        <span className="text-ink-low italic flex-1 min-w-0 line-clamp-1">
          {questionText || "(no question text)"}
        </span>
        <ChevronDown className="w-2.5 h-2.5 text-ink-low flex-shrink-0 mt-0.5" />
      </summary>
      <div className="px-2 pb-1.5 pt-0.5 text-[10px] text-ink-mid leading-snug whitespace-pre-wrap break-words font-mono">
        {formatAnswer(answer)}
        {variantId && (
          <span className="block mt-0.5 text-[9px] text-ink-dim font-sans not-italic">
            variant: {variantId}
          </span>
        )}
      </div>
    </details>
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
          <p className="text-[9px] font-bold text-magenta uppercase tracking-wider mb-1.5">
            For: &ldquo;{answers[0]?.variantText || variantId}&rdquo;
          </p>
          <div className="space-y-1">
            {answers.map((a) => (
              <AnswerRow
                key={a.questionId + (a.variantId ?? "")}
                questionType={a.questionType}
                questionText={a.questionText}
                answer={a.answer}
              />
            ))}
          </div>
        </div>
      ))}
      {flat.length > 0 && (
        <div className="bg-bg-deep rounded-md p-2 border border-line">
          <p className="text-[9px] font-bold text-ink-low uppercase tracking-wider mb-1.5">
            {grouped.size > 0 ? "Cross-Variant / General Questions" : "Questions"}
          </p>
          <div className="space-y-1">
            {flat.map((a) => (
              <AnswerRow
                key={a.questionId}
                questionType={a.questionType}
                questionText={a.questionText}
                answer={a.answer}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
