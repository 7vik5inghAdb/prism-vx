import type { ResearchReport, ResearchContext } from "@/types";

function confidenceColor(score: number): string {
  if (score >= 70) return "#15803d";
  if (score >= 50) return "#a16207";
  return "#b91c1c";
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

function sentimentColor(sentiment: string): string {
  switch (sentiment) {
    case "positive":
      return "#15803d";
    case "negative":
      return "#b91c1c";
    case "mixed":
      return "#a16207";
    default:
      return "#374151";
  }
}

/**
 * Derive the report's subtitle from interpretation data — no hardcoded
 * product or geography. Falls back gracefully when fields aren't set.
 */
function deriveReportSubtitle(
  report: ResearchReport,
  context: ResearchContext,
  interpretation?: { evaluationSubject?: string } | null
): string {
  // Prefer the orchestrator's evaluationSubject — it's the cleanest summary
  // of what's being tested.
  if (interpretation?.evaluationSubject) {
    return interpretation.evaluationSubject;
  }
  // Fallback: variant-aware title
  if (report.variantPerformance && report.variantPerformance.length > 0) {
    return `${report.variantPerformance.length} variants compared`;
  }
  // Fallback: first 80 chars of hypothesis
  if (context.hypothesis) {
    const h = context.hypothesis.trim();
    return h.length > 80 ? h.slice(0, 78) + "..." : h;
  }
  return "Synthetic User Research Report";
}

/**
 * Replace Unicode glyphs that jsPDF's Helvetica WinAnsi encoding can't render
 * with ASCII fallbacks. Without this, a minus sign appears as `"`, a warning
 * sign as `&`, a bullet as nothing, etc. Em-dash, en-dash, and standard quotes
 * already encode correctly so we leave them alone.
 */
function pdfSafe(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/−/g, "-")   // minus sign
    .replace(/⚠/g, "!")   // warning sign
    .replace(/•/g, "*")   // bullet
    .replace(/…/g, "...") // horizontal ellipsis
    .replace(/[‘’]/g, "'") // curly single quotes
    .replace(/[“”]/g, '"') // curly double quotes
    .replace(/–/g, "-")   // en dash (Helvetica usually OK, but safer)
    .replace(/ /g, " ");  // non-breaking space
}

/**
 * Sanitized filename derived from the study subject. Same fallback chain as
 * `deriveReportSubtitle` but stripped to alphanumerics + dashes so it's safe
 * on every filesystem. Replaces the older `prism-report-${Date.now()}.pdf`.
 */
export function deriveReportFilename(
  report: ResearchReport,
  context: ResearchContext,
  interpretation?: { evaluationSubject?: string } | null,
  extension: "pdf" | "md" = "pdf"
): string {
  const raw =
    interpretation?.evaluationSubject ||
    (report.variantPerformance && report.variantPerformance.length > 0
      ? `${report.variantPerformance.length}-variant-study`
      : "") ||
    (context.hypothesis ? context.hypothesis.slice(0, 60) : "") ||
    "prism-report";
  const safe = raw
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${safe || "prism-report"}.${extension}`;
}

export async function generatePDF(
  report: ResearchReport,
  context: ResearchContext,
  interpretation?: { evaluationSubject?: string } | null
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageW = 210;
  const margin = 18;
  const contentW = pageW - margin * 2;
  let y = margin;

  // Use the ADRS-style variant performance layout only when there's actual
  // quantitative data for each variant. Interview studies (or any study where
  // ratings weren't computable) fall through to the generic findings layout.
  const isAdrs =
    !!report.variantPerformance &&
    report.variantPerformance.length > 0 &&
    report.variantPerformance.every(
      (v) =>
        v.averageRating !== null &&
        v.averageRating !== undefined &&
        !Number.isNaN(v.averageRating)
    );

  const addPage = () => {
    doc.addPage();
    y = margin;
  };

  const addPageIfNeeded = (h: number) => {
    if (y + h > 275) addPage();
  };

  const writeHeading = (text: string, size = 12) => {
    addPageIfNeeded(12);
    doc.setFontSize(size);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 24, 39);
    doc.text(pdfSafe(text), margin, y);
    y += size * 0.45;
    doc.setDrawColor(79, 70, 229);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + contentW, y);
    y += 3;
  };

  // Subheading helpers — call keepWithNext internally so a subheading never
  // appears at the bottom of a page with its content stranded on the next.
  // expectedContentH is the rough vertical space the immediate following
  // block needs; default 18mm covers a short paragraph or a small list.
  const writeSubheading = (text: string, expectedContentH: number = 18) => {
    if (y + 10 + expectedContentH > 275) addPage();
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(79, 70, 229);
    doc.text(pdfSafe(text), margin, y);
    y += 4;
  };

  // writeSubheading with a custom color — used by Confidence Analysis sub-labels
  // (green strengths / red limitations / amber bias) so spacing matches the
  // rest of the document while preserving semantic color coding.
  const writeColoredSubheading = (
    text: string,
    rgb: [number, number, number],
    expectedContentH: number = 18
  ) => {
    if (y + 10 + expectedContentH > 275) addPage();
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(rgb[0], rgb[1], rgb[2]);
    doc.text(pdfSafe(text), margin, y);
    y += 4;
  };

  const writeParagraph = (text: string, size = 8.5) => {
    if (!text) return;
    doc.setFontSize(size);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(31, 41, 55);
    const lines = doc.splitTextToSize(pdfSafe(text), contentW);
    addPageIfNeeded(lines.length * size * 0.45 + 2);
    doc.text(lines, margin, y);
    y += lines.length * size * 0.45 + 2;
  };

  // Draws a horizontal bar: a light track plus a proportional filled segment.
  const drawHBar = (
    bx: number,
    by: number,
    bw: number,
    bh: number,
    pct: number,
    fill: [number, number, number]
  ) => {
    doc.setFillColor(226, 232, 240);
    doc.roundedRect(bx, by, bw, bh, 0.7, 0.7, "F");
    const fw = Math.max(0, Math.min(1, pct)) * bw;
    if (fw > 0.5) {
      doc.setFillColor(fill[0], fill[1], fill[2]);
      doc.roundedRect(bx, by, fw, bh, 0.7, 0.7, "F");
    }
  };

  // Page-break heuristic: if a heading plus its first content block would
  // straddle the page break, advance to the next page before the heading lands.
  const keepWithNext = (headingH: number, contentH: number) => {
    if (y + headingH + contentH > 275) addPage();
  };

  // Native pie chart via triangle fans. Slices clockwise from 12 o'clock.
  const drawPie = (
    cx: number,
    cy: number,
    r: number,
    slices: Array<{ pct: number; color: [number, number, number] }>
  ) => {
    const total = slices.reduce((s, x) => s + (x.pct > 0 ? x.pct : 0), 0);
    if (total <= 0) return;
    let angle = Math.PI / 2;
    const totalSteps = 60;
    slices.forEach((slice) => {
      if (slice.pct <= 0) return;
      const frac = slice.pct / total;
      const sweep = frac * Math.PI * 2;
      const steps = Math.max(2, Math.ceil(frac * totalSteps));
      doc.setFillColor(slice.color[0], slice.color[1], slice.color[2]);
      for (let i = 0; i < steps; i++) {
        const a1 = angle - (i / steps) * sweep;
        const a2 = angle - ((i + 1) / steps) * sweep;
        const x1 = cx + r * Math.cos(a1);
        const y1 = cy - r * Math.sin(a1);
        const x2 = cx + r * Math.cos(a2);
        const y2 = cy - r * Math.sin(a2);
        doc.triangle(cx, cy, x1, y1, x2, y2, "F");
      }
      angle -= sweep;
    });
  };

  // Annular arc segment helper for gauges.
  const drawArcSegment = (
    cx: number,
    cy: number,
    innerR: number,
    outerR: number,
    a1: number,
    a2: number
  ) => {
    const x1o = cx + outerR * Math.cos(a1);
    const y1o = cy - outerR * Math.sin(a1);
    const x2o = cx + outerR * Math.cos(a2);
    const y2o = cy - outerR * Math.sin(a2);
    const x1i = cx + innerR * Math.cos(a1);
    const y1i = cy - innerR * Math.sin(a1);
    const x2i = cx + innerR * Math.cos(a2);
    const y2i = cy - innerR * Math.sin(a2);
    doc.triangle(x1i, y1i, x1o, y1o, x2o, y2o, "F");
    doc.triangle(x1i, y1i, x2o, y2o, x2i, y2i, "F");
  };

  // Semi-circular gauge (180° arc) colored per confidence tier.
  const drawGauge = (cx: number, cy: number, r: number, score: number) => {
    const innerR = r * 0.62;
    const steps = 40;
    const startAngle = Math.PI;
    const total = Math.PI;
    const clamped = Math.max(0, Math.min(100, score));

    doc.setFillColor(229, 231, 235);
    for (let i = 0; i < steps; i++) {
      const a1 = startAngle - (i / steps) * total;
      const a2 = startAngle - ((i + 1) / steps) * total;
      drawArcSegment(cx, cy, innerR, r, a1, a2);
    }

    const color = confidenceColor(clamped);
    const rgb = hexToRgb(color);
    doc.setFillColor(rgb.r, rgb.g, rgb.b);
    const filledSteps = Math.round((clamped / 100) * steps);
    for (let i = 0; i < filledSteps; i++) {
      const a1 = startAngle - (i / steps) * total;
      const a2 = startAngle - ((i + 1) / steps) * total;
      drawArcSegment(cx, cy, innerR, r, a1, a2);
    }

    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(rgb.r, rgb.g, rgb.b);
    doc.text(`${clamped}`, cx, cy - 1, { align: "center" });
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 114, 128);
    doc.text("/ 100", cx, cy + 3, { align: "center" });
  };

  // ── Cover Header ──────────────────────────────────────────────────────────
  // Subtitle wraps to up to 2 lines; cover banner height adjusts so the
  // attribution row never collides with the body content underneath.
  const subtitleRaw = pdfSafe(
    deriveReportSubtitle(report, context, interpretation)
  );
  doc.setFontSize(11);
  const subtitleLines = (doc.splitTextToSize(
    subtitleRaw,
    pageW - margin * 2
  ) as string[]).slice(0, 2);
  if (
    subtitleLines.length === 2 &&
    subtitleRaw.length > subtitleLines.join(" ").length
  ) {
    // Ellipsize when the subject is so long it overflows two lines
    subtitleLines[1] = subtitleLines[1].replace(/\s*\S*$/, "") + "...";
  }
  const bannerH = 32 + subtitleLines.length * 6;
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, pageW, bannerH, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("PRISM RESEARCH FINDINGS", margin, 14);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(subtitleLines, margin, 22);
  doc.setFontSize(8);
  doc.text(
    `Generated by PRISM (Primary Research and Insight Synthesis Model)  ·  ${new Date(
      report.generatedAt
    ).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
    margin,
    bannerH - 4
  );

  y = bannerH + 12;

  // ── Confidence Banner ─────────────────────────────────────────────────────
  const cs = report.confidenceScore;
  const csColor = confidenceColor(cs.score);
  const rgb = hexToRgb(csColor);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentW, 22, 3, 3, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(107, 114, 128);
  doc.text("CONFIDENCE SCORE", margin + 5, y + 7);
  doc.setFontSize(18);
  doc.setTextColor(rgb.r, rgb.g, rgb.b);
  doc.text(`${cs.score}/100`, margin + 5, y + 17);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(55, 65, 81);
  const csLines = doc.splitTextToSize(cs.reasoning, contentW - 50);
  doc.text(csLines, margin + 50, y + 8);
  y += 28;

  // ── Background ───────────────────────────────────────────────────────────
  if (report.background) {
    keepWithNext(12, 24);
    writeHeading("BACKGROUND");
    writeParagraph(report.background);
  }

  // ── Methodology ──────────────────────────────────────────────────────────
  keepWithNext(12, 30);
  writeHeading("RESEARCH OBJECTIVES & METHODOLOGY");
  writeParagraph(`Hypothesis: ${context.hypothesis}`);
  writeParagraph(report.methodologyNote);
  writeParagraph(
    `Method: ${
      report.researchMethod === "survey"
        ? "Synthetic survey, unmoderated"
        : "In-depth synthetic interview"
    } · Panel size: ${report.panelSize} respondents · Variant order: ${
      isAdrs ? "randomized per respondent" : "n/a"
    }`,
    8
  );

  // ── Participant Profile ──────────────────────────────────────────────────
  if (report.participantProfile) {
    const pp = report.participantProfile;
    keepWithNext(12, pp.cohorts.length * 7 + 24);
    writeHeading("PARTICIPANT PROFILE");

    writeSubheading("Audience Cohort Breakdown");

    // Cohort table (left) + cohort pie (right) — laid out side-by-side.
    const tableW = contentW - 48;
    const pieCx = margin + contentW - 22;
    const pieCy = y + (pp.cohorts.length * 7) / 2 + 7;
    const pieR = Math.min(20, (pp.cohorts.length * 7) / 2 + 4);

    addPageIfNeeded(pp.cohorts.length * 7 + 12);
    doc.setFillColor(243, 244, 246);
    doc.rect(margin, y, tableW, 7, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(75, 85, 99);
    doc.text("Cohort", margin + 3, y + 5);
    doc.text("N", margin + tableW - 22, y + 5, { align: "right" });
    doc.text("%", margin + tableW - 4, y + 5, { align: "right" });
    y += 7;

    doc.setFont("helvetica", "normal");
    pp.cohorts.forEach((c, i) => {
      addPageIfNeeded(7);
      if (i % 2 === 0) {
        doc.setFillColor(249, 250, 251);
        doc.rect(margin, y, tableW, 7, "F");
      }
      doc.setTextColor(31, 41, 55);
      doc.setFontSize(8);
      doc.text(c.name, margin + 3, y + 5);
      doc.text(String(c.count), margin + tableW - 22, y + 5, { align: "right" });
      doc.text(`${c.percent}%`, margin + tableW - 4, y + 5, { align: "right" });
      y += 7;
    });

    // Cohort distribution pie next to the table — magenta / cyan / green / red
    // shades only. Yellow and harvest dropped to align with the new palette.
    const cohortPalette: Array<[number, number, number]> = [
      [231, 83, 254], // magenta
      [44, 197, 247], // sky
      [34, 197, 94], // green-500
      [239, 68, 68], // red-500
      [178, 64, 216], // magenta-400
      [31, 169, 221], // sky-400
      [21, 128, 61], // green-dark
      [185, 28, 28], // red-dark
    ];
    if (pp.cohorts.length > 0) {
      drawPie(
        pieCx,
        pieCy,
        pieR,
        pp.cohorts.map((c, i) => ({
          pct: c.percent || c.count || 0,
          color: cohortPalette[i % cohortPalette.length],
        }))
      );
      // Tiny legend underneath the pie
      doc.setFontSize(5.8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(75, 85, 99);
      doc.text("Distribution", pieCx, pieCy + pieR + 4, { align: "center" });
      // Ensure y is past the pie's bottom edge AND its legend — without this
      // the next heading lands on top of the pie.
      y = Math.max(y, pieCy + pieR + 8);
    } else {
      y += 4;
    }

    // Demographics row — only render if values are real (>0)
    const meanAgeReal =
      typeof pp.meanAge === "number" && pp.meanAge > 0 ? pp.meanAge : null;
    const medianAgeReal =
      typeof pp.medianAge === "number" && pp.medianAge > 0 ? pp.medianAge : null;
    if (meanAgeReal !== null || medianAgeReal !== null) {
      addPageIfNeeded(10);
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(107, 114, 128);
      const demoText = [
        meanAgeReal !== null ? `Mean age: ${meanAgeReal}` : "",
        medianAgeReal !== null ? `Median: ${medianAgeReal}` : "",
      ]
        .filter(Boolean)
        .join("  ·  ");
      doc.text(demoText, margin, y);
      y += 5;
    }
  }

  // ── Executive Summary ───────────────────────────────────────────────────
  keepWithNext(12, 28);
  writeHeading("EXECUTIVE SUMMARY");

  writeSubheading("Top-line");
  writeParagraph(report.executiveSummary);

  if (report.qualitativeOverview) {
    writeSubheading("Qualitative Overview");
    writeParagraph(report.qualitativeOverview);
  }

  // ── Variant Performance Bar Chart ───────────────────────────────────────
  if (report.variantPerformance) {
    addPageIfNeeded(40);
    writeSubheading("Quantitative Overview — Variant Performance");

    // Sort by avg rating desc
    const sortedVps = [...report.variantPerformance].sort(
      (a, b) => b.averageRating - a.averageRating
    );

    const rowH = 12;
    const labelW = 50;
    const valW = 26;
    const barX = margin + labelW;
    const barMaxW = contentW - labelW - valW;
    const indigo: [number, number, number] = [79, 70, 229];

    sortedVps.forEach((vp, i) => {
      addPageIfNeeded(rowH);
      const rating =
        typeof vp.averageRating === "number" && !Number.isNaN(vp.averageRating)
          ? vp.averageRating
          : 0;

      // Rank
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(79, 70, 229);
      doc.text(`#${i + 1}`, margin, y + 5);

      // Variant label (truncated, up to 2 lines)
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(31, 41, 55);
      const labelText =
        vp.variantText.length > 52
          ? vp.variantText.slice(0, 50) + "…"
          : vp.variantText;
      const labelLines = doc.splitTextToSize(labelText, labelW - 9).slice(0, 2);
      doc.text(labelLines, margin + 7, y + 4);

      // Bar (vertically centered in the row)
      const barH = 4.5;
      const barY = y + rowH / 2 - barH / 2;
      drawHBar(barX, barY, barMaxW, barH, rating / 5, indigo);

      // Value: rating + intent, right-aligned at the content edge
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(17, 24, 39);
      doc.text(rating.toFixed(2), margin + contentW, y + rowH / 2 - 0.5, {
        align: "right",
      });
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(107, 114, 128);
      doc.text(
        `${Math.round(vp.interestPercent)}% intent`,
        margin + contentW,
        y + rowH / 2 + 3.2,
        { align: "right" }
      );

      y += rowH;
    });

    y += 1;
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(156, 163, 175);
    doc.text("Bar length = average rating (scale 0–5).", margin, y);
    y += 6;
  }

  // ── Strategic Takeaways ─────────────────────────────────────────────────
  if (report.strategicTakeaways && report.strategicTakeaways.length > 0) {
    keepWithNext(10, 30);
    writeSubheading("Strategic Takeaways");
    report.strategicTakeaways.forEach((t, i) => {
      addPageIfNeeded(13);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(17, 24, 39);
      const principleLines = doc.splitTextToSize(`${i + 1}. ${t.principle}`, contentW);
      doc.text(principleLines, margin, y);
      y += principleLines.length * 4.5 + 1;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(75, 85, 99);
      doc.setFontSize(8);
      const expLines = doc.splitTextToSize(t.explanation, contentW - 5);
      doc.text(expLines, margin + 5, y);
      y += expLines.length * 4 + 3;
    });
  }

  // ── Recommended Tagline ─────────────────────────────────────────────────
  if (report.adrsRecommendation) {
    // Compute the box height from the wrapped content so long taglines or
    // recommendations never get clipped by a fixed 35mm height.
    doc.setFontSize(13);
    const taglineLines = doc.splitTextToSize(
      `"${report.adrsRecommendation.taglineText}"`,
      contentW - 10
    ) as string[];
    doc.setFontSize(9);
    const recLines = doc.splitTextToSize(
      report.adrsRecommendation.primaryRecommendation,
      contentW - 10
    ) as string[];
    const taglineH = taglineLines.length * 6;
    const recH = recLines.length * 4.5;
    const boxH = 8 + taglineH + 2 + recH + 6;
    addPageIfNeeded(boxH + 4);
    doc.setFillColor(238, 242, 255);
    doc.roundedRect(margin, y, contentW, boxH, 3, 3, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(79, 70, 229);
    doc.text("RECOMMENDED TAGLINE", margin + 5, y + 6);
    doc.setFontSize(13);
    doc.setTextColor(17, 24, 39);
    doc.text(taglineLines, margin + 5, y + 13);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(recLines, margin + 5, y + 13 + taglineH + 4);
    y += boxH + 4;

    if (report.adrsRecommendation.supportingFactors.length > 0) {
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(75, 85, 99);
      doc.text("Supporting factors:", margin, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(55, 65, 81);
      doc.setFontSize(8);
      report.adrsRecommendation.supportingFactors.forEach((f, i) => {
        addPageIfNeeded(7);
        const fl = doc.splitTextToSize(`${i + 1}. ${f}`, contentW - 5);
        doc.text(fl, margin + 5, y);
        y += fl.length * 4 + 1;
      });
      y += 3;
    }
  }

  // ── Detailed Variant Analysis (one per variant) ─────────────────────────
  if (report.variantPerformance) {
    addPage();
    writeHeading("DETAILED VARIANT ANALYSIS");

    report.variantPerformance.forEach((vp, idx) => {
      addPageIfNeeded(72);

      doc.setFillColor(238, 242, 255);
      doc.rect(margin, y, contentW, 13, "F");
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(67, 56, 202);
      doc.text(`Variant ${idx + 1}`, margin + 4, y + 5);
      doc.setFontSize(9);
      doc.setTextColor(17, 24, 39);
      const labelText =
        vp.variantText.length > 90
          ? vp.variantText.slice(0, 88) + "…"
          : vp.variantText;
      doc.text(`"${labelText}"`, margin + 4, y + 10);
      y += 16;

      // ── Variant image (when uploaded and still in-session) ──────────────
      const variantImage = context.variants?.find(
        (c) => c.id === vp.variantId || c.description === vp.variantText
      )?.image;
      if (variantImage?.content) {
        const imgW = 45;
        const imgH = 45;
        addPageIfNeeded(imgH + 4);
        const fmt =
          variantImage.mediaType?.toLowerCase().includes("jpeg") ||
          variantImage.mediaType?.toLowerCase().includes("jpg")
            ? "JPEG"
            : variantImage.mediaType?.toLowerCase().includes("webp")
            ? "WEBP"
            : "PNG";
        try {
          doc.addImage(variantImage.content, fmt, margin, y, imgW, imgH);
          y += imgH + 4;
        } catch {
          // Embedding can fail for malformed dataURLs; degrade to placeholder.
          doc.setFontSize(7.5);
          doc.setFont("helvetica", "italic");
          doc.setTextColor(150, 150, 150);
          doc.text(
            `[Image attached: ${variantImage.name} — render failed]`,
            margin,
            y + 4
          );
          y += 8;
        }
      } else if (variantImage) {
        // Metadata only — base64 stripped by slimContext on autosave persist.
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(150, 150, 150);
        doc.text(
          `[Image attached: ${variantImage.name} — preview unavailable after autosave reload]`,
          margin,
          y + 4
        );
        y += 8;
      }

      // Stats line — full width. The sentiment pie was previously placed
      // alongside this row, but its bounding box collided with the variant
      // header. The pie now lives beside the rating-distribution histogram.
      const totalPositive = vp.topPositives.reduce((s, r) => s + r.count, 0);
      const totalNegative = vp.topNegatives.reduce((s, r) => s + r.count, 0);
      const sentimentTotal = totalPositive + totalNegative;

      addPageIfNeeded(14);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(75, 85, 99);
      doc.text(
        `Average Rating: ${vp.averageRating.toFixed(2)}/5  ·  Interest to try: ${Math.round(vp.interestPercent)}%`,
        margin,
        y + 2
      );
      doc.setFontSize(7);
      doc.setTextColor(120, 130, 145);
      // Honest description: these are CITATION counts (each respondent can
      // mention multiple themes), not respondent counts. The earlier "neutral"
      // math was mathematically incoherent on a small panel.
      doc.text(
        `Themes cited: ${totalPositive} positive  ·  ${totalNegative} negative`,
        margin,
        y + 8
      );
      y += 12;

      // Rating distribution mini-histogram (left) + sentiment pie (right)
      if (vp.ratingDistribution.length > 0) {
        addPageIfNeeded(34);
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(107, 114, 128);
        doc.text("RATING DISTRIBUTION", margin, y);
        y += 2;

        const dist = [...vp.ratingDistribution].sort(
          (a, b) => a.rating - b.rating
        );
        const histH = 16;
        const barW = 9;
        const gap = 4;
        const baseY = y + histH + 4;
        const maxPct = Math.max(...dist.map((r) => r.percent), 1);

        dist.forEach((r, di) => {
          const bx = margin + di * (barW + gap);
          const bh = Math.max(0.4, (r.percent / maxPct) * histH);
          doc.setFillColor(79, 70, 229);
          doc.rect(bx, baseY - bh, barW, bh, "F");
          doc.setFontSize(6);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(75, 85, 99);
          doc.text(`${Math.round(r.percent)}%`, bx + barW / 2, baseY - bh - 1.2, {
            align: "center",
          });
          doc.setFontSize(7);
          doc.setTextColor(107, 114, 128);
          doc.text(String(r.rating), bx + barW / 2, baseY + 3.5, {
            align: "center",
          });
        });

        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.3);
        const histW = dist.length * (barW + gap) - gap;
        doc.line(margin, baseY, margin + histW, baseY);

        // Sentiment pie BESIDE the histogram (positive vs negative share of
        // theme citations). No "neutral" slice — that math was broken.
        let pieBottom = baseY;
        if (sentimentTotal > 0) {
          const pieR = 8;
          const pieCx = margin + contentW - pieR - 6;
          const pieCy = baseY - histH / 2;
          drawPie(pieCx, pieCy, pieR, [
            { pct: totalPositive, color: [21, 128, 61] },
            { pct: totalNegative, color: [185, 28, 28] },
          ]);
          doc.setFontSize(5.8);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(75, 85, 99);
          doc.text("pos / neg", pieCx, pieCy + pieR + 4, { align: "center" });
          pieBottom = pieCy + pieR + 6;
        }

        y = Math.max(baseY + 8, pieBottom + 2);
      } else if (sentimentTotal > 0) {
        // No histogram but still want to show the sentiment split visually
        const pieR = 8;
        const pieCx = margin + contentW - pieR - 6;
        const pieCy = y + pieR + 2;
        drawPie(pieCx, pieCy, pieR, [
          { pct: totalPositive, color: [21, 128, 61] },
          { pct: totalNegative, color: [185, 28, 28] },
        ]);
        y = Math.max(y, pieCy + pieR + 6);
      }

      // Positive sentiment table
      writeSubheading("Top Positive Reactions");
      vp.topPositives.forEach((row) => {
        // Pre-measure the block so a tall box never splits across a page
        // boundary (which left its border/text colliding with the footer).
        doc.setFontSize(8);
        const themeLines = doc.splitTextToSize(row.themes, contentW - 8);
        doc.setFontSize(7.5);
        const quoteSets = row.quotes
          .slice(0, 2)
          .map((q) => doc.splitTextToSize(`"${q}"`, contentW - 10));
        const themeH = themeLines.length * 3.8 + 1;
        const quotesH = quoteSets.reduce(
          (sum, ql) => sum + ql.length * 3.5 + 0.5,
          0
        );
        const blockH = 8 + themeH + quotesH;
        addPageIfNeeded(blockH + 5);

        const startY = y;
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(21, 128, 61);
        doc.text(`${row.category}  (${row.count} resp.)`, margin + 3, y + 4);
        y += 8;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(34, 84, 61);
        doc.text(themeLines, margin + 3, y);
        y += themeH;
        doc.setFont("helvetica", "italic");
        doc.setTextColor(80, 130, 90);
        doc.setFontSize(7.5);
        quoteSets.forEach((ql) => {
          doc.text(ql, margin + 5, y);
          y += ql.length * 3.5 + 0.5;
        });
        doc.setDrawColor(167, 219, 184);
        doc.setLineWidth(0.3);
        doc.rect(margin, startY - 1, contentW, y - startY + 2, "S");
        y += 4;
      });

      // Negative sentiment table
      writeSubheading("Top Negative Reactions");
      vp.topNegatives.forEach((row) => {
        // Pre-measure the block so a tall box never splits across a page
        // boundary (which left its border/text colliding with the footer).
        doc.setFontSize(8);
        const themeLines = doc.splitTextToSize(row.themes, contentW - 8);
        doc.setFontSize(7.5);
        const quoteSets = row.quotes
          .slice(0, 2)
          .map((q) => doc.splitTextToSize(`"${q}"`, contentW - 10));
        const themeH = themeLines.length * 3.8 + 1;
        const quotesH = quoteSets.reduce(
          (sum, ql) => sum + ql.length * 3.5 + 0.5,
          0
        );
        const blockH = 8 + themeH + quotesH;
        addPageIfNeeded(blockH + 5);

        const startY = y;
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(185, 28, 28);
        doc.text(`${row.category}  (${row.count} resp.)`, margin + 3, y + 4);
        y += 8;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(127, 29, 29);
        doc.text(themeLines, margin + 3, y);
        y += themeH;
        doc.setFont("helvetica", "italic");
        doc.setTextColor(140, 60, 60);
        doc.setFontSize(7.5);
        quoteSets.forEach((ql) => {
          doc.text(ql, margin + 5, y);
          y += ql.length * 3.5 + 0.5;
        });
        doc.setDrawColor(232, 178, 178);
        doc.setLineWidth(0.3);
        doc.rect(margin, startY - 1, contentW, y - startY + 2, "S");
        y += 4;
      });

      // Narrative
      addPageIfNeeded(15);
      writeSubheading("Analyst Narrative");
      writeParagraph(vp.narrative);
      y += 4;
    });
  }

  // ── Cross-Thematic Analysis ────────────────────────────────────────────
  if (report.crossThemes && report.crossThemes.length > 0) {
    keepWithNext(12, 28);
    writeHeading("CROSS-THEMATIC ANALYSIS");
    report.crossThemes.forEach((t) => {
      keepWithNext(10, 18);
      writeSubheading(t.title);
      writeParagraph(t.analysis);
    });
  }

  // ── Generic Key Findings (when no variants) ────────────────────────────
  if (!report.variantPerformance && report.keyFindings.length > 0) {
    keepWithNext(12, 24);
    writeHeading("KEY FINDINGS");
    report.keyFindings.forEach((f, i) => {
      addPageIfNeeded(22);
      doc.setFontSize(9.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(79, 70, 229);
      doc.text(`${i + 1}. ${f.theme}`, margin, y);
      y += 5;
      const sCol = sentimentColor(f.sentiment);
      const sRgb = hexToRgb(sCol);
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(sRgb.r, sRgb.g, sRgb.b);
      doc.text(`[${f.sentiment.toUpperCase()}]`, margin + 3, y);
      y += 4;
      doc.setTextColor(17, 24, 39);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      const sl = doc.splitTextToSize(f.summary, contentW - 4);
      doc.text(sl, margin + 3, y);
      y += sl.length * 4 + 2;
      f.evidence.slice(0, 3).forEach((ev) => {
        addPageIfNeeded(9);
        doc.setFontSize(8);
        doc.setTextColor(75, 85, 99);
        doc.setFont("helvetica", "italic");
        const evl = doc.splitTextToSize(`* "${ev}"`, contentW - 8);
        doc.text(evl, margin + 6, y);
        y += evl.length * 3.6 + 1;
      });
      y += 2;
    });
  }

  // ── Recommendations ─────────────────────────────────────────────────────
  keepWithNext(12, 24);
  writeHeading("RECOMMENDATIONS");
  report.recommendations.forEach((rec, i) => {
    addPageIfNeeded(13);
    doc.setFillColor(245, 245, 255);
    doc.setFontSize(8.5);
    const recLines = doc.splitTextToSize(rec, contentW - 12);
    const boxH = recLines.length * 4.5 + 6;
    doc.roundedRect(margin, y - 2, contentW, boxH, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(79, 70, 229);
    doc.text(`${i + 1}.`, margin + 4, y + 3.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(17, 24, 39);
    doc.text(recLines, margin + 10, y + 3.5);
    y += boxH + 2;
  });

  // ── Confidence Detail ───────────────────────────────────────────────────
  keepWithNext(12, 40);
  writeHeading("CONFIDENCE ANALYSIS");

  // Compact layout when alignment notes are short: gauge inline alongside
  // a tight notes column, then the bullet sections wrap full-width below.
  // Larger notes-blocks get the original side-by-side treatment.
  const gaugeR = 16;
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  const notesProbe = cs.alignmentNotes
    ? (doc.splitTextToSize(
        cs.alignmentNotes,
        contentW - gaugeR * 2 - 12
      ) as string[])
    : [];
  const useCompact = notesProbe.length <= 3;

  if (useCompact) {
    // Gauge top-right, notes left at same y. Advance y to the taller block.
    const gaugeCx = margin + contentW - gaugeR - 4;
    const gaugeCy = y + gaugeR + 2;
    drawGauge(gaugeCx, gaugeCy, gaugeR, cs.score);
    if (notesProbe.length > 0) {
      doc.setTextColor(31, 41, 55);
      doc.text(notesProbe, margin, y + 5);
    }
    const notesH = notesProbe.length * 8.5 * 0.45 + 4;
    y += Math.max(notesH, gaugeR * 2 + 6);
  } else {
    // Longer notes: keep the gauge but wrap notes BELOW it across full width
    // so we don't leave a sparse left column.
    const gaugeCx = margin + contentW / 2;
    const gaugeCy = y + gaugeR + 2;
    drawGauge(gaugeCx, gaugeCy, gaugeR, cs.score);
    y += gaugeR * 2 + 6;
    doc.setTextColor(31, 41, 55);
    const fullNotes = doc.splitTextToSize(
      cs.alignmentNotes,
      contentW
    ) as string[];
    addPageIfNeeded(fullNotes.length * 4 + 4);
    doc.text(fullNotes, margin, y);
    y += fullNotes.length * 4 + 4;
  }

  if (cs.strengthFactors.length > 0) {
    keepWithNext(10, 12);
    writeColoredSubheading("Strength factors:", [21, 128, 61]);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(55, 65, 81);
    doc.setFontSize(8);
    cs.strengthFactors.forEach((f) => {
      addPageIfNeeded(8);
      const fl = doc.splitTextToSize(`+ ${f}`, contentW - 4);
      doc.text(fl, margin + 4, y);
      y += fl.length * 5 + 1;
    });
    y += 2;
  }

  if (cs.limitationFactors.length > 0) {
    keepWithNext(10, 12);
    writeColoredSubheading("Limitation factors:", [185, 28, 28]);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(55, 65, 81);
    doc.setFontSize(8);
    cs.limitationFactors.forEach((f) => {
      addPageIfNeeded(8);
      const fl = doc.splitTextToSize(`- ${f}`, contentW - 4);
      doc.text(fl, margin + 4, y);
      y += fl.length * 5 + 1;
    });
    y += 2;
  }

  if (cs.biasFlags.length > 0) {
    keepWithNext(10, 12);
    writeColoredSubheading("Bias flags:", [161, 98, 7]);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(55, 65, 81);
    doc.setFontSize(8);
    cs.biasFlags.forEach((f) => {
      addPageIfNeeded(8);
      const fl = doc.splitTextToSize(`! ${f}`, contentW - 4);
      doc.text(fl, margin + 4, y);
      y += fl.length * 5 + 1;
    });
    y += 2;
  }

  // ── Disclaimer ──────────────────────────────────────────────────────────
  addPageIfNeeded(20);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(156, 163, 175);
  const disc =
    "Note: This report was generated using PRISM (Primary Research and Insight Synthesis Model), a synthetic user research tool. Panel responses are AI-simulated and should be validated with real user research before making major product decisions.";
  const dl = doc.splitTextToSize(disc, contentW);
  doc.text(dl, margin, y);

  // ── Footer on every page ────────────────────────────────────────────────
  const totalPages = (
    doc as unknown as { internal: { getNumberOfPages: () => number } }
  ).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(156, 163, 175);
    doc.setFont("helvetica", "normal");
    doc.text("PRISM · Synthetic Research · Confidential", margin, 290);
    doc.text(`Page ${i} of ${totalPages}`, pageW - margin, 290, { align: "right" });
  }

  doc.save(deriveReportFilename(report, context, interpretation));
}

export function generateMarkdown(
  report: ResearchReport,
  context: ResearchContext,
  interpretation?: { evaluationSubject?: string } | null
): string {
  const date = new Date(report.generatedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const lines: string[] = [];

  lines.push("# PRISM RESEARCH FINDINGS");
  lines.push(`## ${deriveReportSubtitle(report, context, interpretation)}`);
  lines.push("");
  lines.push(`**Generated by:** PRISM (Primary Research and Insight Synthesis Model)`);
  lines.push(`**Date:** ${date}`);
  lines.push(`**Confidence Score:** ${report.confidenceScore.score}/100`);
  lines.push(`**Method:** ${report.researchMethod === "survey" ? "Synthetic Survey" : "Synthetic Interview"} (${report.panelSize} respondents)`);
  lines.push("");
  lines.push("---");
  lines.push("");

  if (report.background) {
    lines.push("## BACKGROUND", "", report.background, "");
  }

  lines.push(
    "## RESEARCH OBJECTIVES AND METHODOLOGY",
    "",
    `**Hypothesis:** ${context.hypothesis}`,
    "",
    report.methodologyNote,
    ""
  );

  if (report.participantProfile) {
    lines.push("---", "", "## PARTICIPANT PROFILE", "");
    lines.push("| Cohort | # of Respondents | % | Key Characteristics |");
    lines.push("|---|---|---|---|");
    report.participantProfile.cohorts.forEach((c) => {
      lines.push(`| ${c.name} | ${c.count} | ${c.percent}% | ${c.characteristics} |`);
    });
    lines.push("");
    const meanReal =
      typeof report.participantProfile.meanAge === "number" &&
      report.participantProfile.meanAge > 0;
    const medReal =
      typeof report.participantProfile.medianAge === "number" &&
      report.participantProfile.medianAge > 0;
    if (meanReal || medReal) {
      lines.push("### Demographics");
      if (meanReal)
        lines.push(`- Mean age: ${report.participantProfile.meanAge}`);
      if (medReal)
        lines.push(`- Median age: ${report.participantProfile.medianAge}`);
      lines.push("");
    }
  }

  lines.push("---", "", "## EXECUTIVE SUMMARY", "");

  // Use the same isAdrs gate as the PDF — only render the variant performance
  // tables when ratings actually exist.
  const mdIsAdrs =
    !!report.variantPerformance &&
    report.variantPerformance.length > 0 &&
    report.variantPerformance.every(
      (v) =>
        v.averageRating !== null &&
        v.averageRating !== undefined &&
        !Number.isNaN(v.averageRating)
    );

  if (mdIsAdrs && report.variantPerformance) {
    lines.push("### Quantitative Overview", "");
    lines.push("**Tagline Performance by Average Resonance Rating:**", "");
    lines.push("| Rank | Variant | Avg Rating | Interest to Try |");
    lines.push("|---|---|---|---|");
    [...report.variantPerformance]
      .sort((a, b) => b.averageRating - a.averageRating)
      .forEach((vp, i) => {
        lines.push(
          `| #${i + 1} | "${vp.variantText}" | ${vp.averageRating.toFixed(2)} | ${Math.round(vp.interestPercent)}% |`
        );
      });
    lines.push("");
    lines.push(report.executiveSummary, "");
  } else {
    lines.push(report.executiveSummary, "");
  }

  if (report.qualitativeOverview) {
    lines.push("### Qualitative Overview", "", report.qualitativeOverview, "");
  }

  if (report.strategicTakeaways && report.strategicTakeaways.length > 0) {
    lines.push("### Strategic Takeaways", "");
    report.strategicTakeaways.forEach((t, i) => {
      lines.push(`${i + 1}. **${t.principle}** — ${t.explanation}`);
    });
    lines.push("");
  }

  if (report.adrsRecommendation) {
    lines.push("### Recommended Tagline", "");
    lines.push(`> **"${report.adrsRecommendation.taglineText}"**`, "");
    lines.push(report.adrsRecommendation.primaryRecommendation, "");
    if (report.adrsRecommendation.supportingFactors.length > 0) {
      lines.push("Supporting factors:");
      report.adrsRecommendation.supportingFactors.forEach((f, i) => {
        lines.push(`${i + 1}. ${f}`);
      });
      lines.push("");
    }
  }

  if (mdIsAdrs && report.variantPerformance) {
    lines.push("---", "", "## DETAILED VARIANT ANALYSIS", "");
    report.variantPerformance.forEach((vp, idx) => {
      lines.push(`### Variant ${idx + 1}: "${vp.variantText}"`, "");
      lines.push(`**Average Rating:** ${vp.averageRating.toFixed(2)} / 5.0`);
      lines.push(`**Interest to Try App:** ${Math.round(vp.interestPercent)}%`);
      const dist = vp.ratingDistribution
        .sort((a, b) => b.rating - a.rating)
        .map((r) => `${r.rating} (${Math.round(r.percent)}%)`)
        .join("; ");
      lines.push(`**Response Distribution:** ${dist}`, "");

      lines.push("#### Top 3 Positive & Negative Sentiments", "");
      lines.push("| Feedback Type | Reason Category | # | Key Themes | Representative Quotes |");
      lines.push("|---|---|---|---|---|");
      vp.topPositives.forEach((row) => {
        const quotes = row.quotes
          .slice(0, 2)
          .map((q) => `"${q}"`)
          .join(" / ");
        lines.push(`| Positive | ${row.category} | ${row.count} | ${row.themes} | ${quotes} |`);
      });
      vp.topNegatives.forEach((row) => {
        const quotes = row.quotes
          .slice(0, 2)
          .map((q) => `"${q}"`)
          .join(" / ");
        lines.push(`| Negative | ${row.category} | ${row.count} | ${row.themes} | ${quotes} |`);
      });
      lines.push("", vp.narrative, "");
    });
  }

  if (report.crossThemes && report.crossThemes.length > 0) {
    lines.push("---", "", "## CROSS-THEMATIC ANALYSIS", "");
    report.crossThemes.forEach((t) => {
      lines.push(`### ${t.title}`, "", t.analysis, "");
    });
  }

  if (!mdIsAdrs && report.keyFindings.length > 0) {
    lines.push("---", "", "## KEY FINDINGS", "");
    report.keyFindings.forEach((f, i) => {
      lines.push(`### ${i + 1}. ${f.theme}`);
      lines.push(`*Sentiment: ${f.sentiment}*`, "", f.summary, "");
      lines.push("**Evidence:**");
      f.evidence.forEach((ev) => lines.push(`- "${ev}"`));
      lines.push("");
    });
  }

  lines.push("---", "", "## CONCLUSIONS & RECOMMENDATIONS", "");
  report.recommendations.forEach((r, i) => lines.push(`${i + 1}. ${r}`));
  lines.push("");

  lines.push(
    "---",
    "",
    "## CONTEXT & NEXT STEPS",
    "",
    "The findings above are based on AI-simulated synthetic respondents. They are directionally valuable for narrowing strategic options but should be validated with real user research before making major product decisions.",
    ""
  );

  lines.push(
    "---",
    "",
    "## CONFIDENCE ANALYSIS",
    "",
    `**Score:** ${report.confidenceScore.score}/100`,
    "",
    report.confidenceScore.reasoning,
    "",
    `**Market Alignment:** ${report.confidenceScore.alignmentNotes}`,
    ""
  );

  if (report.confidenceScore.strengthFactors.length > 0) {
    lines.push("**Strength Factors:**");
    report.confidenceScore.strengthFactors.forEach((f) => lines.push(`- ✓ ${f}`));
    lines.push("");
  }
  if (report.confidenceScore.limitationFactors.length > 0) {
    lines.push("**Limitation Factors:**");
    report.confidenceScore.limitationFactors.forEach((f) => lines.push(`- ✗ ${f}`));
    lines.push("");
  }
  if (report.confidenceScore.biasFlags.length > 0) {
    lines.push("**Bias Flags:**");
    report.confidenceScore.biasFlags.forEach((f) => lines.push(`- ⚠ ${f}`));
    lines.push("");
  }

  lines.push(
    "---",
    "",
    "*Generated by PRISM. Panel responses are AI-simulated and should be validated with real user research before major product decisions.*"
  );

  return lines.join("\n");
}
