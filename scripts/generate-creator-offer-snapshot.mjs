// One-time snapshot generator: recreates the ADRS "New Creator Offer — USA
// Subscriber Survey" study through the live PRISM pipeline and writes a
// cached Step 0 use-case snapshot to public/use-cases/firefly-creator-offer.json
//
// Run with the dev server up:  node scripts/generate-creator-offer-snapshot.mjs
//
// Resilience: retries each call 3x; checkpoints the post-simulate state so a
// failed synthesis can be re-run without re-spending the panel-simulation cost.

import fs from "node:fs";
import path from "node:path";

const BASE = "http://localhost:3000";
const PANEL_SIZE = 105; // matches ADRS n=105
const BATCH_SIZE = 5; // PRISM's survey batch size
const METHOD = "survey";
const CONCURRENCY = 4; // parallel simulate batches (each batchIndex is independent)
const OUT_PATH = path.resolve("public/use-cases/firefly-creator-offer.json");
const CHECKPOINT = path.resolve("scripts/.creator-offer-checkpoint.json");

// ── Inferred pre-research context (the inputs the ADRS researcher had) ───────
const context = {
  hypothesis:
    'Adobe\'s new Firefly "Creator Offer" paid plans are successfully attracting the intended "Creator" audience — Enthusiastic Creative Hobbyists (ages 13-24) and Monetizing Social Creators — and the subscribers who signed up are satisfied with the generative-AI value the plan delivers.',
  researchQuestion:
    "Who is actually subscribing to the new Firefly Creator Offer plans, what motivated them to sign up, what creative work do they use Firefly for, and how satisfied are they? How do Firefly Standalone subscribers (Creator Offer only) differ from Multi-Plan subscribers (Creator Offer plus other Creative Cloud plans)?",
  productDescription:
    'Adobe Firefly "Creator Offer" — Adobe\'s new Firefly paid plans: Firefly Standard (FFST), Firefly Pro (FFPO), and Firefly Premium (FFPU). They can be purchased as a standalone Firefly subscription or alongside other Creative Cloud plans. Each plan provides access to Adobe\'s Firefly generative-AI model, a monthly allotment of generative credits, generative features embedded in Adobe\'s digital-imaging apps (e.g. Photoshop generative fill), high-precision AI editing, the Firefly web app and Firefly Boards, and — recently added specifically to address user concerns about generation quality — third-party AI models (e.g. Google Gemini, Nano Banana, Flux, GPT-Image) selectable inside Adobe apps. The plans are sold through two funnels: direct-to-paid and free-to-paid. Adobe positions the Creator Offer at the "Creator" customer segment.',
  targetAudience:
    'USA-based, English-speaking subscribers to the new Firefly Creator Offer paid plans (FFST / FFPO / FFPU), including subscribers who also hold other Creative Cloud plans. Known from the subscriber list (n~=15,804) and prior Firefly research: the base splits roughly 41% Firefly Standalone (Creator Offer only) and 59% Multi-Plan (Creator Offer plus other CC plans); the plan mix is ~29% FF Standard, ~70% FF Pro, ~0-1% FF Premium; ~27% arrived via a direct-to-paid funnel and ~73% via free-to-paid. From prior Firefly user studies through 2025 and from past Adobe offerings, this subscriber base is expected to skew older — predominantly 45+ — and to lean toward Photo Hobbyists, Business Professionals, and Creative Professionals rather than Adobe\'s youth "Creator" segments (13-24 Enthusiastic Creative Hobbyists, Monetizing Social Creators). Two behaviorally distinct sub-groups are expected: (1) Firefly Standalone subscribers — generally less experienced, more likely to self-describe as beginners or competent rather than experts, leaning on accessible tools like Canva and Adobe Express, and newer to Adobe (many under a year of tenure); (2) Multi-Plan subscribers — generally more advanced, more likely to self-describe as experts in at least one creative discipline, using Creative Cloud flagship apps plus Firefly plus emerging AI tools (e.g. Sora, ChatGPT, Gemini), and longer-tenured with Adobe.',
  objectives:
    '1. Profile who is subscribing — their fit against Adobe\'s official "Creator" customer-group definitions, age, creative skill level, the types of edits/tasks they perform, the creative and AI apps they use, and their tenure with Adobe.\n2. Understand sign-up motivation — why they chose a Firefly Creator Offer plan, and the specific creative projects (professional vs personal; static-image vs video/motion/audio) they bought the plan to do.\n3. Measure overall satisfaction with the Firefly plan and identify the top value drivers and the top value detractors — including the roles of AI generation quality, cost and credit consumption, app usability and learning curve, and third-party models.\n4. Compare Firefly Standalone subscribers vs Multi-Plan subscribers across profile, motivation, and satisfaction.\n5. Assess whether the recently-added third-party AI models and the credit-pack add-ons are landing with subscribers.\nIntended deliverable: a directional, scaled-qualitative findings report (small-sample survey) with prioritized, actionable recommendations for the Firefly / Creator Offer product team.',
  attachments: [],
};

// ── HTTP helper with timeout + retry ────────────────────────────────────────
async function post(routePath, body, label, { retries = 3, timeoutMs = 290000 } = {}) {
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
        throw new Error(`${label}: non-JSON response (${res.status}): ${text.slice(0, 300)}`);
      }
      if (!res.ok) {
        throw new Error(`${label} HTTP ${res.status}: ${data.error || text.slice(0, 300)}`);
      }
      return data;
    } catch (err) {
      clearTimeout(timer);
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt >= retries) throw new Error(`${label} failed after ${retries} attempts: ${msg}`);
      console.log(`  ! ${label} attempt ${attempt} failed (${msg}) — retrying in ${attempt * 3}s`);
      await new Promise((r) => setTimeout(r, attempt * 3000));
    }
  }
}

async function main() {
  const t0 = Date.now();
  let interpretation, personas, instrument, respondents;

  // Resume from checkpoint if a prior run already produced the panel.
  if (fs.existsSync(CHECKPOINT)) {
    const cp = JSON.parse(fs.readFileSync(CHECKPOINT, "utf8"));
    ({ interpretation, personas, instrument, respondents } = cp);
    console.log(`Resumed from checkpoint: ${respondents.length} respondents already simulated.`);
  } else {
    console.log("Step 1/6 — orchestrate...");
    ({ interpretation } = await post("/api/orchestrate", { context }, "orchestrate"));
    console.log(`  studyType=${interpretation.studyType} · subject="${interpretation.evaluationSubject}"`);

    console.log("Step 2/6 — personas...");
    ({ personas } = await post("/api/personas", { context, interpretation }, "personas"));
    console.log(`  ${personas.length} clusters: ${personas.map((p) => `${p.name} (~${p.sampleSize}%)`).join(", ")}`);

    console.log("Step 3/6 — instrument...");
    ({ instrument } = await post(
      "/api/instrument",
      { context, interpretation, personas, method: METHOD },
      "instrument"
    ));
    console.log(`  ${instrument.questions.length} questions`);

    console.log(`Step 4/6 — simulate panel (${PANEL_SIZE} respondents, ${CONCURRENCY}-way concurrency)...`);
    const totalBatches = Math.ceil(PANEL_SIZE / BATCH_SIZE);
    const batchResults = new Array(totalBatches).fill(null);
    let nextBatch = 0;
    let done = 0;
    async function worker() {
      while (nextBatch < totalBatches) {
        const bi = nextBatch++;
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
            `simulate batch ${bi + 1}/${totalBatches}`
          );
          batchResults[bi] = data.respondents || [];
        } catch (err) {
          console.log(`  ! batch ${bi + 1} permanently failed — continuing without it: ${err.message}`);
          batchResults[bi] = [];
        }
        done++;
        console.log(`  batch ${bi + 1}/${totalBatches} done (${(batchResults[bi] || []).length} respondents) — ${done}/${totalBatches} complete`);
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    respondents = batchResults.flat();
    console.log(`  panel complete: ${respondents.length} respondents`);

    fs.writeFileSync(
      CHECKPOINT,
      JSON.stringify({ interpretation, personas, instrument, respondents }, null, 2)
    );
    console.log(`  checkpoint written (${CHECKPOINT})`);
  }

  console.log("Step 5/6 — synthesize...");
  const { synthesis } = await post(
    "/api/synthesize",
    { method: METHOD, respondents, instrument, personas, interpretation, context },
    "synthesize"
  );

  console.log("Step 6/6 — confidence...");
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
  console.log(`  confidence score: ${confidenceScore.score}/100`);

  // Assemble the ResearchReport (mirrors Step5Report.tsx runSynthesis()).
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

  // Full Zustand-state snapshot consumed by loadRunSnapshot().
  const state = {
    id: "usecase-firefly-creator-offer",
    name: "Firefly Creator Offer — Subscriber Survey",
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
  const mins = ((Date.now() - t0) / 60000).toFixed(1);
  console.log(`\nDONE in ${mins} min — wrote ${OUT_PATH}`);
  console.log(`  keyFindings: ${(report.keyFindings || []).length} · recommendations: ${(report.recommendations || []).length} · confidence: ${confidenceScore.score}`);
  if (fs.existsSync(CHECKPOINT)) fs.unlinkSync(CHECKPOINT);
}

main().catch((err) => {
  console.error("\nFATAL:", err.message);
  process.exit(1);
});
