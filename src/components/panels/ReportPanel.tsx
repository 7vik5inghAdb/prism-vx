"use client";

import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  FileTextIcon,
  UserIcon,
  ListChecksIcon,
  BarChart2Icon,
  SparklesIcon,
  ShieldCheckIcon,
  TrendingUpIcon,
  AlertTriangleIcon,
} from "lucide-react";

function SectionHeader({
  icon: Icon,
  title,
  step,
}: {
  icon: React.ElementType;
  title: string;
  step: number;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="flex-shrink-0 w-6 h-6 rounded-md bg-magenta/10 flex items-center justify-center">
        <Icon className="w-3.5 h-3.5 text-magenta" />
      </div>
      <div className="flex items-center gap-2">
        <h3 className="text-[11px] font-bold text-ink-low uppercase tracking-widest">
          {title}
        </h3>
        <span className="text-[9px] text-magenta font-semibold bg-magenta/10 px-1.5 py-0.5 rounded">
          STEP {step}
        </span>
      </div>
    </div>
  );
}

function ConfidenceGauge({ score }: { score: number }) {
  const tier = score >= 70 ? "good" : score >= 50 ? "mid" : "low";
  const text =
    tier === "good" ? "text-sky" : tier === "mid" ? "text-yellow" : "text-scarlet";
  const glow =
    tier === "good"
      ? "shadow-glow-sky"
      : tier === "mid"
      ? "shadow-glow-yellow"
      : "shadow-glow-scarlet";
  const bar =
    tier === "good" ? "bg-sky" : tier === "mid" ? "bg-yellow" : "bg-scarlet";

  return (
    <div className={cn("rounded-xl p-4 neu-card", glow)}>
      <div className="flex items-end justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-ink-low">
          Confidence Score
        </span>
        <span className={cn("text-3xl font-black", text)}>{score}</span>
      </div>
      <div className="h-2 neu-inset rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-1000", bar)}
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="text-[10px] text-ink-dim mt-1.5 text-right">out of 100</p>
    </div>
  );
}

export function ReportPanel() {
  const {
    currentStep,
    context,
    interpretation,
    personas,
    selectedMethod,
    instrument,
    simulationProgress,
    panelResults,
    report,
  } = useAppStore();

  const isEmpty = currentStep === 1 && !context;

  return (
    <div className="flex flex-col h-full bg-bg-deep border-r border-line">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-line flex-shrink-0">
        <div>
          <h2 className="text-sm font-bold text-ink-high">Research Report</h2>
          <p className="text-[11px] text-ink-low mt-0.5">Builds as you advance</p>
        </div>
        <FileTextIcon className="w-4 h-4 text-ink-dim" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <div className="w-14 h-14 rounded-2xl bg-magenta/10 flex items-center justify-center mb-4">
              <FileTextIcon className="w-6 h-6 text-magenta/40" />
            </div>
            <p className="text-sm font-semibold text-ink-low mb-1">
              Report will appear here
            </p>
            <p className="text-xs text-ink-dim max-w-[180px] leading-relaxed">
              Sections populate as you complete each step
            </p>
          </div>
        ) : (
          <>
            {/* Step 1: Research Context */}
            {interpretation && (
              <div className="report-section">
                <SectionHeader
                  icon={FileTextIcon}
                  title="Research Context"
                  step={1}
                />
                <div className="space-y-3">
                  <div className="neu-card-sm rounded-lg p-3">
                    <p className="text-[10px] font-semibold text-ink-low uppercase tracking-wider mb-1">
                      Hypothesis
                    </p>
                    <p className="text-xs text-ink-mid leading-relaxed">
                      {interpretation.restatedHypothesis}
                    </p>
                  </div>
                  <div className="neu-card-sm rounded-lg p-3">
                    <p className="text-[10px] font-semibold text-ink-low uppercase tracking-wider mb-1">
                      Research Focus
                    </p>
                    <p className="text-xs text-ink-mid leading-relaxed">
                      {interpretation.researchFocus}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-ink-low uppercase tracking-wider mb-1.5">
                      Objectives
                    </p>
                    <ul className="space-y-1">
                      {interpretation.restatedObjectives.map((obj, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-1.5 text-xs text-ink-mid"
                        >
                          <span className="mt-0.5 w-3.5 h-3.5 rounded-full bg-magenta/15 text-magenta flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                            {i + 1}
                          </span>
                          {obj}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Divider */}
            {personas && <div className="border-t border-dashed border-line" />}

            {/* Step 2: Personas */}
            {personas && (
              <div className="report-section">
                <SectionHeader icon={UserIcon} title="Persona Clusters" step={2} />
                <div className="space-y-2">
                  {personas.map((p) => (
                    <div
                      key={p.id}
                      className="neu-card-sm rounded-lg p-3"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="text-xs font-semibold text-ink-high">
                          {p.name}
                        </span>
                        <span className="text-[10px] text-magenta font-semibold bg-magenta/10 px-1.5 py-0.5 rounded flex-shrink-0">
                          ~{p.sampleSize}%
                        </span>
                      </div>
                      <p className="text-[11px] text-ink-low leading-relaxed">
                        {p.description}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {p.dimensions.map((d) => (
                          <span
                            key={d.name}
                            className="text-[9px] px-1.5 py-0.5 neu-card-sm text-ink-low rounded"
                          >
                            {d.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Instrument */}
            {instrument && (
              <>
                <div className="border-t border-dashed border-line" />
                <div className="report-section">
                  <SectionHeader
                    icon={ListChecksIcon}
                    title="Research Instrument"
                    step={3}
                  />
                  <div className="neu-card-sm rounded-lg p-3 mb-2">
                    <p className="text-[10px] font-semibold text-ink-low uppercase tracking-wider mb-1">
                      Method
                    </p>
                    <p className="text-xs font-semibold text-ink-high">
                      {selectedMethod === "survey"
                        ? "Survey (Quantitative/Attitudinal)"
                        : "Interview (Qualitative/Attitudinal)"}
                    </p>
                  </div>
                  <div className="neu-card-sm rounded-lg p-3">
                    <p className="text-[10px] font-semibold text-ink-low uppercase tracking-wider mb-2">
                      Questions ({instrument.questions.length})
                    </p>
                    <div className="space-y-2">
                      {instrument.questions.map((q, i) => (
                        <div key={q.id} className="flex items-start gap-1.5">
                          <span className="text-[10px] text-ink-low mt-0.5 w-5 flex-shrink-0">
                            {i + 1}.
                          </span>
                          <div className="min-w-0 flex-1">
                            <span
                              className={cn(
                                "inline-block text-[9px] font-semibold px-1 py-0.5 rounded mr-1 mb-0.5",
                                q.type === "likert" &&
                                  "bg-sky/15 text-sky",
                                q.type === "rating" &&
                                  "bg-sky/15 text-sky",
                                q.type === "open_ended" &&
                                  "bg-harvest/15 text-harvest"
                              )}
                            >
                              {q.type === "likert"
                                ? "LIKERT"
                                : q.type === "rating"
                                ? "RATING"
                                : "OPEN"}
                            </span>
                            {q.perVariant && (
                              <span className="inline-block text-[8px] font-semibold px-1 py-0.5 rounded mr-1 mb-0.5 bg-magenta/15 text-magenta">
                                PER-VARIANT
                              </span>
                            )}
                            <span className="text-[11px] text-ink-mid leading-relaxed">
                              {q.text}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Step 4: Simulation progress or complete */}
            {(simulationProgress || panelResults) && (
              <>
                <div className="border-t border-dashed border-line" />
                <div className="report-section">
                  <SectionHeader
                    icon={BarChart2Icon}
                    title="Panel Simulation"
                    step={4}
                  />
                  {simulationProgress &&
                  simulationProgress.phase !== "complete" ? (
                    <div className="neu-card-sm rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-ink-mid">
                          {simulationProgress.currentBatch ??
                            "Initializing..."}
                        </span>
                        <span className="text-xs font-semibold text-magenta">
                          {simulationProgress.current}/{simulationProgress.total}
                        </span>
                      </div>
                      <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                        <div
                          className="h-full bg-magenta/100 rounded-full transition-all duration-500"
                          style={{
                            width: `${
                              (simulationProgress.current /
                                simulationProgress.total) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  ) : panelResults ? (
                    <div className="bg-sky/10 rounded-lg p-3 border border-sky/30">
                      <p className="text-xs font-semibold text-sky">
                        {panelResults.method === "survey"
                          ? `${panelResults.respondents.length} survey responses collected`
                          : `${panelResults.respondents.length} interview transcripts collected`}
                      </p>
                      <p className="text-[11px] text-sky-400 mt-0.5">
                        Simulation complete · Ready for synthesis
                      </p>
                    </div>
                  ) : null}
                </div>
              </>
            )}

            {/* Step 5: Full Report */}
            {report && (
              <>
                <div className="border-t border-dashed border-line" />
                <div className="report-section">
                  <SectionHeader
                    icon={SparklesIcon}
                    title="Insight Report"
                    step={5}
                  />

                  {/* Background */}
                  {report.background && (
                    <div className="mb-4">
                      <p className="text-[10px] font-semibold text-ink-low uppercase tracking-wider mb-2">
                        Background
                      </p>
                      <p className="text-xs text-ink-mid leading-relaxed">
                        {report.background}
                      </p>
                    </div>
                  )}

                  {/* Executive Summary */}
                  <div className="mb-4">
                    <p className="text-[10px] font-semibold text-ink-low uppercase tracking-wider mb-2">
                      Executive Summary
                    </p>
                    <p className="text-xs text-ink-mid leading-relaxed bg-magenta/10 border border-magenta/30 rounded-lg p-3">
                      {report.executiveSummary}
                    </p>
                  </div>

                  {/* Confidence Score */}
                  <div className="mb-4">
                    <ConfidenceGauge score={report.confidenceScore.score} />
                  </div>

                  {/* Participant Profile (ADRS) */}
                  {report.participantProfile && (
                    <div className="mb-4">
                      <p className="text-[10px] font-semibold text-ink-low uppercase tracking-wider mb-2">
                        Participant Profile
                      </p>
                      <div className="neu-card-sm rounded-lg overflow-hidden">
                        <table className="w-full text-[10px]">
                          <thead className="bg-bg-raised">
                            <tr className="border-b border-line">
                              <th className="text-left px-2 py-1.5 font-bold text-ink-low uppercase tracking-wider">
                                Cohort
                              </th>
                              <th className="text-right px-2 py-1.5 font-bold text-ink-low uppercase tracking-wider">
                                N
                              </th>
                              <th className="text-right px-2 py-1.5 font-bold text-ink-low uppercase tracking-wider">
                                %
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {report.participantProfile.cohorts.map((c) => (
                              <tr
                                key={c.name}
                                className="border-b border-line last:border-0"
                              >
                                <td className="px-2 py-1.5 text-ink-mid">
                                  {c.name}
                                </td>
                                <td className="px-2 py-1.5 text-right text-ink-mid font-semibold">
                                  {c.count}
                                </td>
                                <td className="px-2 py-1.5 text-right text-ink-low">
                                  {c.percent}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {(report.participantProfile.meanAge ||
                        report.participantProfile.languageDistribution) && (
                        <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                          {report.participantProfile.meanAge && (
                            <div className="neu-card-sm rounded px-2 py-1.5">
                              <span className="text-ink-low">Mean age: </span>
                              <span className="font-semibold text-ink-mid">
                                {report.participantProfile.meanAge}
                              </span>
                            </div>
                          )}
                          {report.participantProfile.medianAge && (
                            <div className="neu-card-sm rounded px-2 py-1.5">
                              <span className="text-ink-low">Median: </span>
                              <span className="font-semibold text-ink-mid">
                                {report.participantProfile.medianAge}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Variant Performance (ADRS) */}
                  {report.variantPerformance && (
                    <div className="mb-4">
                      <p className="text-[10px] font-semibold text-ink-low uppercase tracking-wider mb-2">
                        {report.variantPerformance.length} Variants Tested · Performance
                      </p>
                      <div className="neu-card-sm rounded-lg overflow-hidden">
                        <table className="w-full text-[10px]">
                          <thead className="bg-bg-raised">
                            <tr className="border-b border-line">
                              <th className="text-left px-2 py-1.5 font-bold text-ink-low uppercase tracking-wider">
                                Variant
                              </th>
                              <th className="text-right px-2 py-1.5 font-bold text-ink-low uppercase tracking-wider">
                                Avg
                              </th>
                              <th className="text-right px-2 py-1.5 font-bold text-ink-low uppercase tracking-wider">
                                Intent
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {[...report.variantPerformance]
                              .sort((a, b) => b.averageRating - a.averageRating)
                              .map((vp, i) => (
                                <tr
                                  key={vp.variantId}
                                  className="border-b border-line last:border-0"
                                >
                                  <td className="px-2 py-1.5">
                                    <span className="text-magenta font-bold mr-1">
                                      #{i + 1}
                                    </span>
                                    <span className="text-ink-mid font-medium">
                                      {vp.variantText}
                                    </span>
                                  </td>
                                  <td className="px-2 py-1.5 text-right font-bold text-ink-high">
                                    {vp.averageRating.toFixed(2)}
                                  </td>
                                  <td className="px-2 py-1.5 text-right text-ink-mid">
                                    {Math.round(vp.interestPercent)}%
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Detailed variant analysis */}
                  {report.variantPerformance && (
                    <div className="mb-4">
                      <p className="text-[10px] font-semibold text-ink-low uppercase tracking-wider mb-2">
                        Detailed Variant Analysis
                      </p>
                      <div className="space-y-2">
                        {report.variantPerformance.map((vp, i) => (
                          <details
                            key={vp.variantId}
                            className="neu-card-sm rounded-lg overflow-hidden"
                          >
                            <summary className="px-3 py-2 cursor-pointer hover:bg-bg-elevated transition-colors">
                              <span className="text-[11px] font-bold text-ink-high">
                                {i + 1}. &ldquo;{vp.variantText}&rdquo;
                              </span>
                              <div className="flex gap-3 mt-1">
                                <span className="text-[10px] text-magenta font-semibold">
                                  ★ {vp.averageRating.toFixed(2)}/5
                                </span>
                                <span className="text-[10px] text-ink-low">
                                  Intent: {Math.round(vp.interestPercent)}%
                                </span>
                              </div>
                            </summary>
                            <div className="px-3 pb-3 space-y-2">
                              <p className="text-[11px] text-ink-mid leading-relaxed mt-2">
                                {vp.narrative}
                              </p>
                              <div>
                                <p className="text-[9px] font-bold text-sky uppercase tracking-wider mb-1">
                                  Top Positive Reactions
                                </p>
                                <div className="space-y-1">
                                  {vp.topPositives.map((row) => (
                                    <div
                                      key={row.category}
                                      className="bg-sky/10 border border-sky/30 rounded px-2 py-1.5"
                                    >
                                      <div className="flex justify-between items-center mb-0.5">
                                        <span className="text-[10px] font-semibold text-sky">
                                          {row.category}
                                        </span>
                                        <span className="text-[9px] text-sky-400 font-bold">
                                          {row.count} resp.
                                        </span>
                                      </div>
                                      <p className="text-[10px] text-sky leading-snug mb-1">
                                        {row.themes}
                                      </p>
                                      {row.quotes.map((q, qi) => (
                                          <p
                                            key={qi}
                                            className="text-[10px] italic text-sky-400 border-l-2 border-sky/40 pl-1.5"
                                          >
                                            &ldquo;{q}&rdquo;
                                          </p>
                                        ))}
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <p className="text-[9px] font-bold text-scarlet uppercase tracking-wider mb-1">
                                  Top Negative Reactions
                                </p>
                                <div className="space-y-1">
                                  {vp.topNegatives.map((row) => (
                                    <div
                                      key={row.category}
                                      className="bg-scarlet/10 border border-scarlet/30 rounded px-2 py-1.5"
                                    >
                                      <div className="flex justify-between items-center mb-0.5">
                                        <span className="text-[10px] font-semibold text-scarlet">
                                          {row.category}
                                        </span>
                                        <span className="text-[9px] text-scarlet font-bold">
                                          {row.count} resp.
                                        </span>
                                      </div>
                                      <p className="text-[10px] text-scarlet leading-snug mb-1">
                                        {row.themes}
                                      </p>
                                      {row.quotes.map((q, qi) => (
                                          <p
                                            key={qi}
                                            className="text-[10px] italic text-scarlet border-l-2 border-scarlet/40 pl-1.5"
                                          >
                                            &ldquo;{q}&rdquo;
                                          </p>
                                        ))}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </details>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cross-Thematic Analysis */}
                  {report.crossThemes && report.crossThemes.length > 0 && (
                    <div className="mb-4">
                      <p className="text-[10px] font-semibold text-ink-low uppercase tracking-wider mb-2">
                        Cross-Thematic Analysis
                      </p>
                      <div className="space-y-2">
                        {report.crossThemes.map((t, i) => (
                          <div
                            key={i}
                            className="bg-magenta/10/40 border border-magenta/30 rounded-lg p-3"
                          >
                            <p className="text-xs font-bold text-magenta mb-1">
                              {t.title}
                            </p>
                            <p className="text-[11px] text-ink-mid leading-relaxed">
                              {t.analysis}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Strategic Takeaways */}
                  {report.strategicTakeaways &&
                    report.strategicTakeaways.length > 0 && (
                      <div className="mb-4">
                        <p className="text-[10px] font-semibold text-ink-low uppercase tracking-wider mb-2">
                          Strategic Takeaways
                        </p>
                        <div className="space-y-1.5">
                          {report.strategicTakeaways.map((t, i) => (
                            <div
                              key={i}
                              className="neu-card-sm rounded-lg p-3"
                            >
                              <p className="text-xs font-bold text-ink-high mb-1">
                                {t.principle}
                              </p>
                              <p className="text-[11px] text-ink-mid leading-relaxed">
                                {t.explanation}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Recommended Tagline (ADRS) */}
                  {report.adrsRecommendation && (
                    <div className="mb-4 bg-magenta/10 border-2 border-magenta/40 rounded-xl p-4">
                      <p className="text-[10px] font-bold text-magenta uppercase tracking-wider mb-2">
                        Recommended {selectedMethod === "survey" ? "Tagline" : "Variant"}
                      </p>
                      <p className="text-sm font-bold text-ink-high mb-2">
                        &ldquo;{report.adrsRecommendation.taglineText}&rdquo;
                      </p>
                      <p className="text-[11px] text-ink-mid mb-2 leading-relaxed">
                        {report.adrsRecommendation.primaryRecommendation}
                      </p>
                      {report.adrsRecommendation.supportingFactors.length > 0 && (
                        <div className="space-y-1 mt-2">
                          {report.adrsRecommendation.supportingFactors.map(
                            (f, i) => (
                              <div
                                key={i}
                                className="flex items-start gap-1.5 text-[11px] text-ink-mid"
                              >
                                <span className="font-bold text-magenta flex-shrink-0">
                                  {i + 1}.
                                </span>
                                <span>{f}</span>
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Generic Key Findings (always shown for completeness) */}
                  {!report.variantPerformance && (
                    <div className="mb-4">
                      <p className="text-[10px] font-semibold text-ink-low uppercase tracking-wider mb-2">
                        Key Findings
                      </p>
                      <div className="space-y-2">
                        {report.keyFindings.map((finding, i) => (
                          <div
                            key={i}
                            className="neu-card-sm rounded-lg p-3"
                          >
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <span className="text-xs font-semibold text-ink-high">
                                {finding.theme}
                              </span>
                              <SentimentBadge sentiment={finding.sentiment} />
                            </div>
                            <p className="text-[11px] text-ink-mid leading-relaxed mb-2">
                              {finding.summary}
                            </p>
                            <div className="space-y-1">
                              {finding.evidence.map((ev, ei) => (
                                <p
                                  key={ei}
                                  className="text-[10px] text-ink-low italic border-l-2 border-magenta/40 pl-2"
                                >
                                  &ldquo;{ev}&rdquo;
                                </p>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  <div>
                    <p className="text-[10px] font-semibold text-ink-low uppercase tracking-wider mb-2">
                      Recommendations
                    </p>
                    <div className="space-y-1.5">
                      {report.recommendations.map((rec, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 text-xs text-ink-mid neu-card-sm rounded-lg p-2.5 border border-line"
                        >
                          <TrendingUpIcon className="w-3 h-3 mt-0.5 text-magenta flex-shrink-0" />
                          {rec}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SentimentBadge({
  sentiment,
}: {
  sentiment: "positive" | "negative" | "mixed" | "neutral";
}) {
  const styles = {
    positive: "bg-sky/15 text-sky border border-sky/30",
    negative: "bg-scarlet/15 text-scarlet border border-scarlet/30",
    mixed: "bg-yellow/15 text-yellow border border-yellow/30",
    neutral: "bg-bg-elevated text-ink-mid border border-line",
  };
  return (
    <span
      className={cn(
        "text-[9px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 capitalize",
        styles[sentiment]
      )}
    >
      {sentiment}
    </span>
  );
}
