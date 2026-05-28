// Step-by-step PRISM pipeline runner for the Adobe Express India tagline study.
// Mirrors scripts/co-run.mjs but targets a different use case:
//   - Data dir:  scripts/co-data-adobe-tagline/*.json
//   - Output:    public/use-cases/adobe-tagline.json
//   - Panel:     64 respondents in batches of 5
//   - Method:    survey (variant comparison with 5 taglines)
//
//   node scripts/co-run-adobe-tagline.mjs orchestrate
//   node scripts/co-run-adobe-tagline.mjs personas
//   node scripts/co-run-adobe-tagline.mjs instrument
//   node scripts/co-run-adobe-tagline.mjs simulate
//   node scripts/co-run-adobe-tagline.mjs synthesize
//   node scripts/co-run-adobe-tagline.mjs confidence
//   node scripts/co-run-adobe-tagline.mjs assemble

import fs from "node:fs";
import path from "node:path";

const BASE = "http://localhost:3000";
const DIR = path.resolve("scripts/co-data-adobe-tagline");
const OUT_PATH = path.resolve("public/use-cases/adobe-tagline.json");
const PANEL_SIZE = 64;
const BATCH_SIZE = 5;
const METHOD = "survey";
// 8 concurrent batches — Anthropic rate limits are TPM-based, not RPS, so
// higher concurrency is safe and halves total sim time.
const CONCURRENCY = 8;

const read = (name) => JSON.parse(fs.readFileSync(path.join(DIR, name), "utf8"));
const write = (name, obj) =>
  fs.writeFileSync(path.join(DIR, name), JSON.stringify(obj, null, 2));

async function post(routePath, body, label, { retries = 3, timeoutMs = 540000 } = {}) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(BASE + routePath, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`${label}: non-JSON (${res.status}): ${text.slice(0, 300)}`);
      }
      if (!res.ok) throw new Error(`${label} HTTP ${res.status}: ${data.error || text.slice(0, 300)}`);
      return data;
    } catch (err) {
      clearTimeout(timer);
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt >= retries) throw new Error(`${label} failed after ${retries}x: ${msg}`);
      console.log(`  ! ${label} attempt ${attempt} (${msg}) - retry in ${attempt * 3}s`);
      await new Promise((r) => setTimeout(r, attempt * 3000));
    }
  }
}

const step = process.argv[2];

if (step === "orchestrate") {
  const context = read("context.json");
  const { interpretation } = await post("/api/orchestrate", { context }, "orchestrate");
  write("interpretation.json", interpretation);
  console.log(JSON.stringify(interpretation, null, 2));
} else if (step === "personas") {
  const context = read("context.json");
  const interpretation = read("interpretation.json");
  const { personas } = await post("/api/personas", { context, interpretation }, "personas");
  write("personas.json", personas);
  console.log(`${personas.length} clusters:`);
  personas.forEach((p) =>
    console.log(`  - ${p.name} (~${p.sampleSize}%): ${p.description}`)
  );
} else if (step === "instrument") {
  const context = read("context.json");
  const interpretation = read("interpretation.json");
  const personas = read("personas.json");
  const { instrument } = await post(
    "/api/instrument",
    { context, interpretation, personas, method: METHOD },
    "instrument"
  );
  write("instrument.json", instrument);
  console.log(`"${instrument.title}" - ${instrument.questions.length} questions:`);
  instrument.questions.forEach((q, i) =>
    console.log(`  ${i + 1}. [${q.type}/${q.scope ?? q.perVariant ?? "general"}] ${q.text}`)
  );
} else if (step === "simulate") {
  const context = read("context.json");
  const interpretation = read("interpretation.json");
  const personas = read("personas.json");
  const instrument = read("instrument.json");
  const totalBatches = Math.ceil(PANEL_SIZE / BATCH_SIZE);
  const batchResults = new Array(totalBatches).fill(null);
  let next = 0;
  let done = 0;
  async function worker() {
    while (next < totalBatches) {
      const bi = next++;
      try {
        const data = await post(
          "/api/simulate",
          {
            method: METHOD,
            personas,
            instrument,
            context,
            evaluationSubject: interpretation.evaluationSubject,
            studyType: interpretation.studyType,
            batchIndex: bi,
            panelSize: PANEL_SIZE,
          },
          `simulate ${bi + 1}/${totalBatches}`
        );
        batchResults[bi] = data.respondents || [];
      } catch (err) {
        console.log(`  ! batch ${bi + 1} failed permanently - skipped: ${err.message}`);
        batchResults[bi] = [];
      }
      done++;
      console.log(`  batch ${bi + 1}/${totalBatches} - ${(batchResults[bi] || []).length} respondents (${done}/${totalBatches})`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  const respondents = batchResults.flat();
  write("respondents.json", respondents);
  console.log(`panel complete: ${respondents.length} respondents`);
} else if (step === "synthesize") {
  const context = read("context.json");
  const interpretation = read("interpretation.json");
  const personas = read("personas.json");
  const instrument = read("instrument.json");
  const respondents = read("respondents.json");
  const { synthesis, isAdrs } = await post(
    "/api/synthesize",
    { method: METHOD, respondents, instrument, personas, interpretation, context },
    "synthesize"
  );
  write("synthesis.json", synthesis);
  console.log(`synthesis written (isAdrs=${isAdrs}). keys: ${Object.keys(synthesis).join(", ")}`);
  console.log(`keyFindings: ${(synthesis.keyFindings || []).length} · recommendations: ${(synthesis.recommendations || []).length}`);
  if (synthesis.variantPerformance) {
    console.log(`variantPerformance:`);
    synthesis.variantPerformance.forEach((v) =>
      console.log(`  - ${v.variantText} : avg ${v.averageRating} · interest ${v.interestPercent}%`)
    );
  }
} else if (step === "confidence") {
  const interpretation = read("interpretation.json");
  const synthesis = read("synthesis.json");
  const respondents = read("respondents.json");
  const { confidenceScore } = await post(
    "/api/confidence",
    {
      primaryFindings: synthesis,
      method: METHOD,
      panelSize: respondents.length,
      hypothesis: interpretation.restatedHypothesis,
      studyType: interpretation.studyType,
    },
    "confidence"
  );
  write("confidence.json", confidenceScore);
  console.log(JSON.stringify(confidenceScore, null, 2));
} else if (step === "assemble") {
  const context = read("context.json");
  const interpretation = read("interpretation.json");
  const personas = read("personas.json");
  const instrument = read("instrument.json");
  const respondents = read("respondents.json");
  const synthesis = read("synthesis.json");
  const confidenceScore = read("confidence.json");

  const report = {
    background: synthesis.background ?? "",
    executiveSummary: synthesis.executiveSummary,
    qualitativeOverview: synthesis.qualitativeOverview ?? "",
    keyFindings: synthesis.keyFindings,
    recommendations: synthesis.recommendations,
    confidenceScore,
    methodologyNote: synthesis.methodologyNote,
    generatedAt: new Date().toISOString(),
    panelSize: respondents.length,
    researchMethod: METHOD,
    participantProfile: synthesis.participantProfile,
    variantPerformance: synthesis.variantPerformance,
    crossThemes: synthesis.crossThemes,
    strategicTakeaways: synthesis.strategicTakeaways,
    adrsRecommendation: synthesis.adrsRecommendation,
  };
  const state = {
    id: "usecase-adobe-tagline-india",
    name: "Adobe Express India - Tagline Positioning Test",
    currentStep: 5,
    stepStatuses: { 1: "completed", 2: "completed", 3: "completed", 4: "completed", 5: "completed" },
    context,
    interpretation,
    personas,
    selectedMethod: METHOD,
    instrument,
    panelResults: { method: "survey", respondents },
    report,
    surveyPanelSize: PANEL_SIZE,
    interviewPanelSize: 3,
  };
  fs.writeFileSync(OUT_PATH, JSON.stringify({ state, generatedAt: new Date().toISOString() }, null, 2));
  console.log(`assembled snapshot - ${OUT_PATH}`);
  console.log(`  ${respondents.length} respondents · ${(report.keyFindings || []).length} findings · confidence ${confidenceScore.score}`);
} else {
  console.error("unknown step:", step);
  process.exit(1);
}
