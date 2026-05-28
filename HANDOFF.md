# PRISM — Handoff to next chat

Paste this whole block into a new Claude Code chat in the same worktree. It should let the new session pick up cleanly.

---

## TL;DR
PRISM = synthetic user-research tool (Next.js 14 / Zustand / Anthropic SDK). The current demo focus is a **Step 0 card that recreates an Adobe ADRS subscriber survey** ("New Creator Offer — USA"). Clicking the card loads a pre-baked 105-respondent run **in playback mode** — user lands at Step 1, clicks Continue through Steps 1→5, sees every cached output, **zero LLM calls**. Build is clean. Nothing committed.

## Worktree
- **Path**: `/Users/satviks/Desktop/prism-vx/.claude/worktrees/sharp-brahmagupta-07c445/`
- **Branch**: `claude/sharp-brahmagupta-07c445`
- **Dev server**: the user runs their own `npm run dev` on port 3000 against this worktree — don't spawn a competing one.
- **`.env.local`**: contains a working `ANTHROPIC_API_KEY`.

## The Firefly Creator Offer card (the demo)
- Snapshot: [public/use-cases/firefly-creator-offer.json](public/use-cases/firefly-creator-offer.json) (~862 KB; 105 respondents, 18 questions, 4 personas, full report with participantProfile + crossThemes + strategicTakeaways + confidence 72).
- Card source: first entry in `USE_CASES` in [src/components/steps/Step0Welcome.tsx](src/components/steps/Step0Welcome.tsx).
- Step runner: [scripts/co-run.mjs](scripts/co-run.mjs) — `node scripts/co-run.mjs <step>` (orchestrate|personas|instrument|simulate|synthesize|confidence|assemble). Intermediates in `scripts/co-data/*.json`.

### Methodology decisions that shaped the Creator Offer run (user wanted ADRS-faithful editing at each step)
- **Orchestrate**: studyType `attitudinal`. Live LLM output accepted.
- **Personas**: PRISM gave 3 clusters that didn't match ADRS's 41/59 Standalone-vs-Multi-Plan axis — **hand-authored 4 clusters** in `scripts/co-data/personas.json` (Standalone Biz Pro 24%, Standalone Hobbyist & Late Adopter 17%, Multi-Plan Photo Hobbyist 32%, Multi-Plan Creative Pro 27%). All skew 45+, mostly non-Creators, satisfaction gap encoded in predispositions.
- **Instrument**: **hand-authored 18 questions** in `scripts/co-data/instrument.json` covering ADRS's 30-Q battery. PRISM's `/api/instrument` kept failing Zod (new question types — matrix/scenario/yes_no_why — frequently emit incomplete payloads).
- **Simulate**: 21 batches × 5 = 105 respondents, hard-coded as-is. Distribution 25/18/34/28. Satisfaction came out Multi-Plan 73% (ADRS: 70% — spot-on), Standalone 37% (ADRS: 57% — PRISM's Laggard personas skewed harsher).
- **Synthesize**: prose strong; fixed 2 loose stats (67%→91% age, 3rd-party numbers); **hand-added participantProfile / crossThemes / strategicTakeaways** because the generic (non-ADRS) synthesis schema doesn't emit them.
- **Confidence**: 72 — legitimate (coherent findings, synthetic n=105, honest bias flags), NOT the old anchor bug.

## Playback mode (just shipped)
- New `playbackMode: boolean` in store (`src/lib/store.ts`).
- `loadRunSnapshot(state, { playback: true })` — used by Step 0 card click. Sets currentStep=1, stepStatuses {1:active, rest pending}, autoRunEnabled=false, seeds `streamingRespondents` from `panelResults.respondents`, seeds `simulationProgress.phase="complete"`.
- `advanceToStep` **skips clearing downstream outputs** when `state.playbackMode` is true — so the cached pipeline survives navigation.
- `ReportPanel` sections now gated by `currentStep` (personas needs ≥2, instrument ≥3, panelResults ≥4, report ≥5) so the right panel reveals progressively in playback. Harmless for normal runs.
- Saved Runs / fixtures still load normally (no opts → playback false → jump to snapshot's currentStep).

## Latest standalone changes also shipped
- **MC options now visible** in Step 3 instrument card (`Step3Instrument.tsx` QuestionRow renders multiple_choice options as chips, likert scale points, rating range+labels, ranking/allocation items).
- **Survey charts**: `src/components/charts/ParticipantProfileCharts.tsx` (Recharts) — cohort + age distribution bars, rendered in ReportPanel's participantProfile section. Variant studies still have their own charts; non-variant surveys now have charts too.

## Recent rounds (history)
- **Round 3** — prompts.ts question-type augmentation (10 new types per method), color overhaul (yellow + harvest removed, green + red palettes added, scarlet aliased to red), PDF standardization (pies + gauge + ASCII glyphs + spacing), PDF filename derivation, LLM quality mechanisms (validate-with-feedback retries, per-step temperatures, instrument coverage check, convergence flag, self-critique loop).
- **Round 4** — confidence anchor removed + worked examples added + temp 0.5; `perVariant` → `scope` migration in synthesize stats; removed `as never` cast.
- **Mid-rounds fixes** — synthesize crash on MaxDiff (Step5 passing wide `selectedMethod`); Step4 panel size mismatch (`=== "survey"` vs `!== "interview"`); language drift to Hindi-only responses; scope drift (off-topic price commentary); universal guardrails via `buildSimulatorRulesBlock` + `buildBatchRespondentSystemPrompt`.
- **Schema bug just before Creator Offer recreation**: `OrchestratorInterpretationSchema.variants` and `InstrumentSchema.variants` were `.optional()` — rejected LLM-emitted `variants: null`. Changed both to `.nullish()`. Without this, non-variant studies were 100% blocked.

## Architecture quick map
- `src/lib/prompts.ts` — every LLM prompt. Method-specific branches in `buildInstrumentPrompt`. `buildSimulatorRulesBlock` is the shared rules text used by both `buildRespondentSystemPrompt` (interview) and `buildBatchRespondentSystemPrompt` (survey).
- `src/lib/llm.ts` — `callLLM` with retry-with-feedback. `zodValidator` helper for routes.
- `src/lib/schemas.ts` — every Zod schema. The variants field is `.nullish()` on the orchestrator + instrument schemas.
- `src/lib/store.ts` — Zustand store with persist middleware. `advanceToStep` clears downstream by default unless `playbackMode`. `loadRunSnapshot` accepts optional `{ playback?: boolean }`.
- `src/lib/pdf.ts` — PDF + Markdown generation. `deriveReportFilename` derives slug from `interpretation.evaluationSubject`.
- `src/types/index.ts` — all types. `AppState` has `autoRunEnabled` and `playbackMode`.
- `src/components/panels/ReportPanel.tsx` — right-side report panel. Sections gated by `currentStep`. Renders `ParticipantProfileCharts` (new) plus the variant charts.
- `src/components/steps/Step0Welcome.tsx` — Step 0 card grid. `tryDemo` fetches snapshot then calls `loadRunSnapshot(state, { playback: true })`.
- `src/components/steps/Step1-5*.tsx` — pipeline steps. All gate their LLM calls on data-absence (`if(!personas) generatePersonas()` etc.), so in playback they never re-fetch.
- `src/components/charts/` — Recharts components: `VariantPerformanceChart`, `RatingDistributionChart`, **`ParticipantProfileCharts`** (new).

## Known gotchas
- The `/api/instrument` schema is fragile for new question types (matrix, scenario, yes_no_why, semantic_differential) — required fields the LLM frequently omits cause Zod failures and the repair-retry loop can make things worse. Hand-authoring is more reliable for now.
- `advanceToStep` clears downstream outputs by default — be careful editing it.
- `SynthesisResponseSchema` (generic / non-variant) does NOT include participantProfile / crossThemes / strategicTakeaways. Only the ADRS variant path schema has them. For survey reports those sections must be added externally.
- Default `autoRunEnabled` is `false` (user toggle in top bar).
- The user's localStorage may contain a prior playback state — if they reload mid-demo, the persist layer keeps them where they were. Tell them to hit **New** to reset.

## Pending / deferred (not blocking)
- Snapshots for the other 4 Step 0 cards (adobe-tagline / pricing-tier / feature-prio / concept-feedback). Their seed-Step-1 fallback works for live runs.
- Make the generic synthesis schema + prompt emit participantProfile / crossThemes / strategicTakeaways for survey studies (would avoid the hand-augmentation done for Creator Offer).
- Fix `/api/instrument` schema fragility for new question types (flagged in code review).
- Prompt caching across simulate batches — biggest cost lever (see `COST_ESTIMATE.md`).
- Refactor long components: `Step1Context.tsx` (994 LOC), `ReportPanel.tsx` (800+ LOC).
- Discriminated-union refactor for `ResearchMethod`-keyed routing (flagged as the categorical risk in the Round 4 code review).

## Cost reference
- `COST_ESTIMATE.md` and `COST_ESTIMATE-confluence.txt` in worktree root. **~$5.90/run at max context, ~$3.50–4 typical**, ~$24 worst-case theoretical ceiling. 100 runs/month ≈ $400-600. Prompt caching would cut input cost 30–40%.

## Plan files
- `/Users/satviks/.claude/plans/users-satviks-downloads-prism-report-17-starry-teapot.md` — Round 3+4 plans.

## Git status
Uncommitted set is large (Rounds 3+4 + Creator Offer + playback all unstaged) on `claude/sharp-brahmagupta-07c445`. **Don't commit without explicit ask.** Quick view:
```
git -C /Users/satviks/Desktop/prism-vx/.claude/worktrees/sharp-brahmagupta-07c445 status -s
```

## How to demo the card right now
1. Confirm dev server is up on localhost:3000.
2. If user is mid-something, hit **New** in the top bar to clear localStorage.
3. Step 0 → click **"Subscriber survey — Firefly Creator Offer"** (first card).
4. Lands at Step 1, interpretation visible. Click **Continue / Confirm** at each step.
5. Walk through 1 → 2 (4 personas) → 3 (18 questions with MC options) → 4 (105 respondent cards) → 5 (full report with cohort/age charts + confidence 72).
6. Zero API calls. The right-hand report panel reveals progressively.

## Style notes (user preferences picked up over the conversation)
- The user is overwhelmed and wants minimal interruptions. Make reasonable assumptions; only ask when an answer is load-bearing.
- They prefer being shown the inputs before any API spend (cost-conscious about LLM calls).
- They like concrete fixes over advisory recommendations.
- They notice product-fidelity details and call them out (variants, charts, MC options).
- Auto mode has been on for most of this session.

End of handoff.
