# Running PRISM

A practical guide to clone, configure and run PRISM locally — including the two cached demo cards (Firefly Creator Offer and Adobe Express India positioning) that play back without any LLM calls.

---

## 1. Prerequisites

- **Node.js 18.18 or newer** (Next.js 14 requirement). 20.x recommended.
  ```bash
  node --version
  ```
- **npm** (ships with Node) or **pnpm/yarn** if you prefer.
- **An Anthropic API key**. Sign in at https://console.anthropic.com → API Keys → Create Key. You need access to Opus 4.1 (`claude-opus-4-1-20250805`) for reasoning steps and Haiku 4.5 (`claude-haiku-4-5`) for simulation. Both demo cards play back without spending tokens, so you can browse the app on cached data with a placeholder key.

---

## 2. Clone the repo

```bash
git clone https://github.com/7vik5inghAdb/prism-vx.git
cd prism-vx
```

If you want the branch with the Adobe Express positioning card and all the super-review fixes:

```bash
git checkout claude/sharp-brahmagupta-07c445
```

This branch is ahead of `main` and contains the latest demo card, prompt-quality work, and runner scripts.

---

## 3. Install dependencies

```bash
npm install
```

First install takes 60-90 seconds.

---

## 4. Environment setup

Create `.env.local` in the project root (gitignored — never commit it):

```bash
cat > .env.local <<'EOF'
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Optional model overrides — defaults work for most accounts
# PRISM_MODEL_DEFAULT=claude-opus-4-1-20250805
# PRISM_MODEL_SIMULATION=claude-haiku-4-5

# Optional self-critique toggle — synthesis runs a second LLM pass to flag
# overstatements. Set to "off" to disable and save ~$0.50 per synthesis.
# PRISM_SELF_CRITIQUE=off

# Optional synthesis output cap — bump if a very large panel needs more
# narrative space. Defaults: 16000 for variant studies, 10000 generic.
# PRISM_SYNTHESIS_MAX_TOKENS=20000
EOF
```

**Just want to browse the demos?** Any non-empty value works for the placeholder key — the cached snapshots replay without API calls.

---

## 5. Run the dev server

```bash
npm run dev
```

Open http://localhost:3000.

You'll land on the Welcome screen showing five cards:

| Card | What it is | LLM cost when clicked |
|---|---|---|
| **Subscriber survey — Firefly Creator Offer** | 105 USA subscribers, attitudinal | $0 (cached snapshot replays) |
| **Positioning test — Adobe Express (India)** | 64 Indian respondents, 5 taglines | $0 (cached snapshot replays) |
| Tagline test (sample tags) | Live placeholder | live run cost (no snapshot yet) |
| Pricing trade-off — SaaS team plans | Live placeholder | live run cost |
| Feature priority — MaxDiff | Live placeholder | live run cost |
| Concept test — new product page | Live placeholder | live run cost |

### Demo card playback flow (no LLM calls)

1. Click either of the **Firefly** or **Adobe Express** card.
2. Lands at **Step 1** with the hypothesis / research question / product / audience / objectives / variants all pre-filled.
3. Click **Confirm** → **Step 2** shows the persona clusters with sample-size weights.
4. Click **Continue** → **Step 3** shows the instrument (every question + options).
5. Click **Continue** → **Step 4** shows the cached respondents.
6. Click **Continue** → **Step 5** renders the full report (executive summary, qualitative overview, variant performance, cross-themes, strategic takeaways, recommendation, confidence score).

**If you previously ran through any pipeline in the same browser**, hit the **New** button in the top bar before clicking a demo card — localStorage caches the prior `currentStep` and would otherwise jump you past Step 1.

### Live run flow (uses LLM)

Click **Start from scratch** (or any non-cached card) to fill in your own research context. The app will:

1. Call `/api/orchestrate` to interpret your input (Opus, ~$0.10).
2. Call `/api/personas` to generate persona clusters (Opus, ~$0.20).
3. Call `/api/instrument` to design the survey/interview (Opus, ~$0.20).
4. Call `/api/simulate` in 5-respondent batches at concurrency 8 (Haiku, ~$0.01/batch).
5. Call `/api/synthesize` then `/api/confidence` (Opus, ~$3-5 for a 64-respondent panel).

Total: roughly **$4-6 per full live run at the default 64-respondent panel size**, $5-8 at 100 respondents.

---

## 6. Optional: re-generate a demo snapshot from scratch

The `scripts/co-run*.mjs` runners step through the pipeline file-by-file, writing each intermediate output to `scripts/co-data-*/`. Useful for iterating on personas, the instrument, or prompts without re-running the whole pipeline.

```bash
# Make sure dev server is running on localhost:3000 in another shell first
npm run dev

# Then in a second shell:
node scripts/co-run-adobe-tagline.mjs orchestrate   # writes interpretation.json
node scripts/co-run-adobe-tagline.mjs personas      # writes personas.json
node scripts/co-run-adobe-tagline.mjs instrument    # writes instrument.json
node scripts/co-run-adobe-tagline.mjs simulate      # writes respondents.json (long: 3-5 min)
node scripts/co-run-adobe-tagline.mjs synthesize    # writes synthesis.json (long: 7-8 min)
node scripts/co-run-adobe-tagline.mjs confidence    # writes confidence.json
node scripts/co-run-adobe-tagline.mjs assemble      # writes public/use-cases/adobe-tagline.json
```

You can edit any intermediate JSON between steps and re-run only what's downstream. Same pattern for `scripts/co-run.mjs` (the Firefly Creator Offer runner).

---

## 7. Building and deploying

```bash
npm run build      # type-checks + production build
npm run start      # serves the built app on port 3000
```

Deploy to Vercel:

```bash
npx vercel --prod
```

In Vercel project settings, add the same env vars (`ANTHROPIC_API_KEY` minimum). Set Production + Preview environments.

**Vercel timeout note**: the API routes now declare `maxDuration` explicitly (synthesize=480s, others=300s). The Vercel Hobby plan caps function duration at 60s regardless — synthesize WILL time out on Hobby. Upgrade to Vercel Pro for the routes to honor their declared durations.

---

## 8. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Demo card click jumps you past Step 1 | Stale `currentStep` in localStorage from a prior session | Hit **New** in the top bar, then click the card |
| `npm run dev` reports port 3000 in use | Another process owns the port | `lsof -ti:3000 \| xargs kill` then `npm run dev` |
| Runner script reports `synthesize failed after 3x: fetch failed` on large panels | Long-running Node fetch occasionally disconnects after ~5 min on this Next.js dev server | Use `curl` directly: see the `curl ... /api/synthesize ... --max-time 600` pattern in commit `df270a4` |
| Synthesize takes 7-8 minutes | Normal — Opus generating 12-16k tokens of structured output on a 100-respondent panel | Wait. Vercel paid plan honors the route's `maxDuration=480`; local dev has no enforced cap. |
| Build fails with TypeScript errors | Schema mismatch or unused import | `npm run build` shows the file:line — fix and rerun |
| Synth report sections missing (no participantProfile / crossThemes) | Generic synthesis emitted them as optional and the LLM omitted them | They are optional in the schema; re-run synthesize, or check the prompt block in `src/lib/prompts.ts buildSynthesisPrompt` |

---

## 9. Project layout (where things live)

```
src/
  app/api/
    orchestrate/     Step 1 — interpret PM input
    personas/        Step 2 — generate persona clusters
    instrument/      Step 3 — design survey/interview
    simulate/        Step 4 — run a 5-respondent batch
    synthesize/      Step 5 — synthesize panel into a structured report
    confidence/      Step 5 — score confidence 0-100
  components/
    panels/          Report / Conversation / PipelineTracker (the three columns)
    steps/           Step0Welcome / Step1Context / Step2Personas / ... / Step5Report
    charts/          Recharts components used in the report
    conversation/    chat primitives, modals, dev panel
  lib/
    prompts.ts       Every LLM prompt template (single source of truth)
    llm.ts           Anthropic SDK wrapper with retry + validate-with-feedback
    schemas.ts       Every Zod schema validating LLM output
    store.ts         Zustand store with persist (localStorage autosave)
    pdf.ts           PDF + Markdown report generators
    fixtures.ts      Dev-only fixtures (skip Steps 1-4 to test synthesis prompts)
  types/index.ts     All TypeScript types (single source of truth)

scripts/
  co-run.mjs                       Firefly snapshot runner
  co-run-adobe-tagline.mjs         Adobe Express snapshot runner
  co-data/                         Firefly intermediate JSONs
  co-data-adobe-tagline/           Adobe Express intermediate JSONs

public/use-cases/                  Cached demo snapshots
```

---

## 10. Cost budget reference

- **Browse demos only**: $0
- **Single live run (n=10 survey, default scratch flow)**: ~$1
- **Single live run (n=64 survey, default panel size)**: ~$4
- **Single live run (n=100 survey, max panel size)**: ~$6
- **Single live run (n=3 interview)**: ~$2

Major levers (in `.env.local`):
- `PRISM_SELF_CRITIQUE=off` saves ~$0.50 per synthesis
- `PRISM_SYNTHESIS_MAX_TOKENS=8000` (down from 16000 default) saves ~$0.50 per synthesis but truncates richer reports
