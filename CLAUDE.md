# PRISM — Project Context for Claude Code

PRISM (Primary Research and Insight Synthesis Model) is a synthetic user-research
tool: a PM enters a hypothesis + research question + audience + variants, and the
app generates personas, builds an instrument, simulates a synthetic panel via
LLMs, and produces a confidence-scored report.

This file is here so a fresh Claude Code session can pick up the project quickly.
Read it before making changes.

---

## Stack

- **Next.js 14 App Router** (TypeScript, React, Tailwind)
- **Zustand** for global state, with `persist` middleware autosaving to localStorage
- **Anthropic SDK** server-side; default models:
  - `PRISM_MODEL_DEFAULT` = `claude-opus-4-1-20250805` (reasoning + synthesis)
  - `PRISM_MODEL_SIMULATION` = `claude-haiku-4-5` (bulk panel simulation; cheaper)
- **jsPDF** for the PDF export; plain string templates for the Markdown export
- **Lucide React** icons
- Deployed to Vercel at https://prism-vx.vercel.app

## Architecture

The app is a strict 5-step uni-directional pipeline:

| Step | Component | API route | Model |
|------|-----------|-----------|-------|
| 1. Context ingestion + orchestrator interpretation | `src/components/steps/Step1Context.tsx` | `src/app/api/orchestrate/route.ts` | default |
| 2. Persona cluster generation (L1/L2/L3 framework) | `src/components/steps/Step2Personas.tsx` | `src/app/api/personas/route.ts` | default |
| 3. Method selection + instrument design | `src/components/steps/Step3Instrument.tsx` | `src/app/api/instrument/route.ts` | default |
| 4. Panel simulation (batched, streaming) | `src/components/steps/Step4Simulation.tsx` | `src/app/api/simulate/route.ts` | simulation |
| 5. Synthesis + confidence scoring | `src/components/steps/Step5Report.tsx` | `src/app/api/synthesize/route.ts`, `src/app/api/confidence/route.ts` | default |

The conversation/forms live in the center panel. The left panel renders a
progressive report that builds as steps complete. The right panel is the
pipeline tracker — collapsible, clickable on completed steps for read-only
review.

## Key files to know

- **`src/lib/prompts.ts`** — every LLM prompt template. Edit here, not inline.
- **`src/lib/llm.ts`** — `callLLM()` wrapper with retry/backoff, accepts an optional `images` array for vision content blocks.
- **`src/lib/store.ts`** — Zustand store with `persist` middleware. Autosaves the entire app state to `localStorage` (key `prism_autosave_v1`), throttled to 2s.
- **`src/lib/schemas.ts`** — Zod schemas validating every LLM response.
- **`src/lib/pdf.ts`** — PDF + Markdown report generators. `deriveReportSubtitle()` sources the report title from `interpretation.evaluationSubject` — no hardcoded product names.
- **`src/lib/fixtures.ts`** — dev-only fixtures. Lets you skip Steps 1–4 to test synthesis prompts without burning credits. Triggered via the floating `DEV` chip (bottom-left), which only renders when `NODE_ENV !== "production"`.
- **`src/types/index.ts`** — single source of truth for all types.
- **`src/components/panels/`** — the three panels (Report / Conversation / PipelineTracker).
- **`src/components/conversation/`** — chat primitives, modals, dev panel.

## Major design choices (don't undo without thinking)

1. **Forward-only flow** — steps 1→2→3→4→5, no going back. Past steps are reviewable read-only via the pipeline tracker click or the conversation recap chips. Editing a past step would invalidate downstream LLM work.

2. **Variant structure**: `context.variants: VariantInput[]` where each entry is `{id, description, image?}`. The description is the textual content (the tagline itself, or an image's description). When `image` is present, the simulation prompt sees the image and the description is system-only.

3. **Token-efficient synthesis** — `src/app/api/synthesize/route.ts` slims each respondent before serializing (strips `personaProfile`, `questionText`, `variantText` — all available elsewhere in the prompt). Precomputes per-variant quant stats server-side so the LLM doesn't crunch arithmetic across 100 respondents. This was a critical fix for a 194k → 200k context overflow.

4. **Anti-hallucination guardrails in prompts**:
   - Simulation prompt: explicit "you CAN see the variants, do NOT say 'I haven't been shown them'"
   - Anti-convergence rules: forbid monotonic 1→2→3→4→5 progressions, require 10–15% explicit dissent
   - Synthesis prompt: explicit "DEMOGRAPHIC STATS ANTI-HALLUCINATION RULE — omit fields you can't source from real data"
   - Confidence prompt: study-type-aware via `getStudyTypeRelevantDimensions()` / `getStudyTypeIrrelevantDimensions()` — tagline studies aren't penalized for missing price-sensitivity etc.

5. **Persona L1/L2/L3 framework**: each `PersonaCluster` has L1 (dimensions, narrative), L2 (`validationPredispositions`: adoptionPosture, riskTolerance, switchingCost, counterfactual, acceptanceCriteria, rejectionTriggers, habitStrength), L3 (`jobsToBeDone`: functional/emotional/social).

6. **Saved runs** vs **autosave**: distinct.
   - Autosave (zustand `persist`): always running, single slot, key `prism_autosave_v1`.
   - Saved runs (named): manual via "Save Run" button. Stored in localStorage under `prism_saved_runs_v1`. Surfaced via the "Saved Runs" modal in the top bar.

7. **PDF/Markdown report titles** are derived from `interpretation.evaluationSubject` via `deriveReportSubtitle()`. No hardcoded "Adobe Express" anywhere in the report renderers.

## Known limits (don't try to "fix" with more prompts)

These are fundamental constraints of synthetic research, not bugs:

- **Hämäläinen-Journey bias**: LLMs trained on the open web mirror dominant narratives — synthetic panels under-represent minority/dissenting views.
- **Memorization critique (Aaru)**: when product names or contexts appear in training data, the model can leak knowledge that real respondents wouldn't have.
- **Persona drift**: even with strong system prompts, respondents subtly converge toward the "average reasonable consumer" voice.
- **Convergence**: a 5-variant test will usually show monotonic ratings unless you actively fight it — even with the anti-convergence rules baked in, expect smoother distributions than real research would produce.

Use the **fixture dev panel** (bottom-left `DEV` chip) to iterate on prompts without burning credits on a fresh 100-person sim each time.

## Environment

```
# .env.local at project root
ANTHROPIC_API_KEY=sk-ant-...
# Optional overrides — only set if defaults don't work for your account:
# PRISM_MODEL_DEFAULT=claude-opus-4-1-20250805
# PRISM_MODEL_SIMULATION=claude-haiku-4-5
```

On Vercel, set the same vars in **Settings → Environment Variables** (Production + Preview). Redeploy after changes.

API routes have `export const maxDuration = 60` so they survive Vercel Hobby's
default 10s function timeout. On a paid plan you can bump this to 300.

## Run locally

```bash
npm install
npm run dev
# open http://localhost:3000
```

## Build / deploy

```bash
npm run build     # type check + production build
vercel --prod     # deploy
```

## Recent work (most recent commits first)

```
6511a8a  7 surgical fixes: interview variants, study-type question battery,
         anti-convergence, scope-aware confidence, no demographic hallucination,
         method-adaptive PDF, dev fixtures
5eb6de6  Per-variant image upload + de-hardcode reports
860f0c5  Fix synthesis context-length overflow (194k → 200k)
dba54ca  Fix localStorage QuotaExceededError on autosave
b9086f8  Crash resilience + L1/L2/L3 persona framework + question guardrail
d1623c6  P0/P1/P4/P5: Foundation fixes for variants-in-prompt, study type,
         PM-focus
c6ec58c  Add read-only review of completed steps
c85e3aa  Multi-attachment (images, PDF, DOCX) + auto-expanding textareas
```

## Things I'd reach for next (rough roadmap)

- **Charts (Recharts)** in the report and PDF — variant performance bars, rating distributions
- **Web search triangulation** in confidence scoring via Anthropic's `web_search_20250305` tool
- **Multi-method studies** (run a survey AND interview from the same setup)
- **New methods**: KANO, MaxDiff, Concept Testing — currently surfaced as "Coming Soon" in the methods catalog
- **Image embedding in the PDF** for visual variant studies (currently descriptions only)

## How to add a new step / new variant type / new prompt

- **Adding a question type**: extend `Question` union in `types/index.ts`, schema in `schemas.ts`, render in `Step3Instrument.tsx`, handle in `buildSurveyBatchPrompt()` in `prompts.ts`.
- **Tweaking a prompt**: edit `prompts.ts` only. Never inline prompts in route files.
- **Changing the report layout**: edit `ReportPanel.tsx` for the live view, `pdf.ts` for downloads.

## Working with this codebase as Claude Code

- The repo has working git history. Commit after every meaningful change.
- `.env.local` is gitignored — never commit secrets.
- The build is type-strict; run `npm run build` to catch type errors before pushing.
- The dev fixture panel is the fastest way to iterate on Step 4/5 prompts without spending credits.
- Conversation history from previous Claude Code sessions does NOT transfer between accounts or machines. This `CLAUDE.md` plus `git log` is the persistent memory.
