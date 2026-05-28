/**
 * All LLM prompt templates for PRISM.
 * Tuned to produce ADRS (Adobe Design Research & Strategy)-quality outputs.
 * Concept-test studies (e.g. tagline A/B/C) get specialized handling via the
 * `variants` field on the orchestrator interpretation and instrument.
 */

import { getQuestionScope } from "@/types";
import type {
  ResearchContext,
  PersonaCluster,
  ResearchMethod,
  Question,
  ResearchInstrument,
  SurveyRespondent,
  InterviewRespondent,
  InstrumentVariant,
} from "@/types";

// ── Step 1: Orchestrator Interpretation ──────────────────────────────────────

export const ORCHESTRATOR_SYSTEM = `You are PRISM's research orchestrator — a senior product researcher. Your role is to interpret PM inputs and reflect back a structured, precise understanding of their research intent.

Be analytically sharp. Identify the study type (concept_test, attitudinal, behavioral, exploratory), the testable claim, audience cohorts, and what counts as evidence.

Detect when the PM is running a CONCEPT TEST — i.e., comparing multiple named variants (taglines, headlines, feature concepts, pricing options, visual designs, value propositions). When the PM lists multiple specific alternatives to evaluate, extract them as variants and pick a sensible label (Tagline, Concept, Headline, Pricing Option, etc.) based on what they actually are.

Stay grounded in what the PM actually wrote. Do not assume any specific industry, geography, product, or vertical unless the PM mentions it.

Always respond with valid JSON matching the specified schema.`;

export function buildOrchestratorPrompt(ctx: ResearchContext): string {
  const typeLabel = ctx.variantTypeLabel || ctx.variantsLabel || "Variant";
  const variantList = Array.isArray(ctx.variants) ? ctx.variants : [];
  const variantsHint =
    variantList.length > 0
      ? `\n\nThe PM has provided ${variantList.length} ${typeLabel.toLowerCase()}${variantList.length === 1 ? "" : "s"} to test:\n${variantList
          .map(
            (v, i) =>
              `${i + 1}. ${v.description}${v.image ? ` [+ image: ${v.image.name}]` : ""}`
          )
          .join(
            "\n"
          )}\nVariant type label: ${typeLabel}${variantList.some((v) => v.image) ? "\n(Some variants have visual content — personas will see the images during simulation.)" : ""}`
      : "";

  // Attach extracted text from PDFs/DOCX/TXT attachments. Images are sent as
  // separate vision content blocks, so we only mention them by name here.
  const docs = (ctx.attachments || []).filter((a) => a.kind !== "image");
  const images = (ctx.attachments || []).filter((a) => a.kind === "image");
  const imagesHint = images.length
    ? `\n\nThe PM has also attached ${images.length} reference image${images.length === 1 ? "" : "s"} (visible to you in this message): ${images.map((a) => a.name).join(", ")}`
    : "";
  const docsBlock = docs.length
    ? `\n\nADDITIONAL CONTEXT FROM ATTACHED DOCUMENTS:\n${docs
        .map(
          (a) =>
            `--- ${a.name} (${a.kind.toUpperCase()}) ---\n${a.content.slice(0, 8000)}${a.content.length > 8000 ? "\n[…truncated]" : ""}`
        )
        .join("\n\n")}`
    : "";

  const rqHint = ctx.researchQuestion?.trim()
    ? `\nResearch Question (what the PM wants to LEARN): ${ctx.researchQuestion}`
    : "";

  return `A product manager has submitted the following research context. Interpret it and return a structured understanding.

INPUT:
Hypothesis (what the PM BELIEVES): ${ctx.hypothesis}${rqHint}
Product/Feature: ${ctx.productDescription}
Target Audience: ${ctx.targetAudience}
Research Objectives: ${ctx.objectives}${variantsHint}${imagesHint}${docsBlock}

CLASSIFICATION GUIDE — choose the most specific studyType:
- variant_comparison: multiple named alternatives compared head-to-head (taglines, layouts, pricing options)
- positioning_test: testing messaging / brand positioning lines
- concept_validation: ONE concept or feature, testing desirability/viability
- workflow_evaluation: testing a multi-step user flow
- feature_assessment: evaluating a shipped or planned feature's reception
- attitudinal / behavioral / exploratory: general fallbacks if none of the above fit

Return a JSON object with this exact schema:
{
  "summary": "2-3 sentence overview. Name the study type explicitly and reference the actual product/audience the PM described — do NOT use placeholder product names from examples. Example phrasing: 'A positioning concept validation testing N variants for [the product the PM actually named] targeting [the audience the PM actually named]'.",
  "restatedHypothesis": "The PM's belief as a testable statement",
  "restatedResearchQuestion": "What the PM wants to LEARN (distinct from what they believe). If only a hypothesis is given, derive the implicit research question.",
  "restatedProduct": "What the product/feature is in precise terms",
  "restatedAudience": "Who the target audience is — name explicit cohorts if multiple are present",
  "restatedObjectives": ["objective 1", "objective 2", "...up to 5"],
  "researchFocus": "The single most critical question this research must answer",
  "potentialChallenges": ["challenge 1", "...up to 3"],
  "studyType": "variant_comparison | positioning_test | concept_validation | workflow_evaluation | feature_assessment | attitudinal | behavioral | exploratory",
  "evaluationSubject": "REQUIRED. What exactly is being tested in plain language, derived from PM input only — do not use placeholder product/geography. Format: '<N variant-type-label>s for <product the PM described> targeting <audience the PM described>' or similar.",
  "successCriteria": "REQUIRED. What 'good' looks like — the signal that would let the PM say 'yes ship' or 'yes proceed'",
  "variants": { "label": "Tagline | Concept | Headline etc.", "items": ["variant 1", "variant 2", ...] }   // OPTIONAL
}

The "variants" key is OPTIONAL — and this matters for routing the downstream pipeline correctly. Rules:
- OMIT the "variants" key entirely (do not emit it at all) when the study is attitudinal, behavioral, exploratory, profiling, or a single-concept evaluation with no named alternatives being compared. Do NOT emit "variants": null and do NOT emit "variants": [] or "variants": {} — just leave the key out of the JSON.
- INCLUDE "variants" ONLY when the input explicitly names two or more specific NAMED alternatives being compared head-to-head (taglines, pricing tiers, design concepts, feature variations, copy variants, etc.). When you include it, the items array must have 2-8 entries and the label must be the noun for what's being compared ("Tagline", "Concept", "Pricing tier", etc.).
- If you're uncertain whether something is a variant test, default to OMITTING the variants key. The synthesis pipeline picks the richer ADRS-style schema only when variants are present, so a false-positive variants block can corrupt the report.
Always populate evaluationSubject and successCriteria.

Use information from the attached documents and images to refine your understanding — but do not invent details that aren't grounded in the input.`;
}

// ── Step 2: Persona Generation ────────────────────────────────────────────────

export const PERSONA_SYSTEM = `You are a senior UX research strategist specializing in audience segmentation. Your job is to identify the meaningful dimensions along which a target audience varies — not to create fictional people, but to map the landscape of who might use or respond to a product.

Dimensions should be research-relevant: they should predict meaningfully different attitudes, behaviors, or needs. Avoid superficial demographic-only segmentation.

When the audience is described with explicit cohorts (named segments with proportions), use those cohorts as the first dimension and match their proportions in sampleSize. Then add 3-4 additional cross-cutting dimensions appropriate to the domain (could be age, geography, role seniority, technical sophistication, primary use case, language, organization size, etc. — pick what's actually relevant to the research, not a fixed template).

Adapt to the domain: B2B SaaS research needs different dimensions than consumer creative tools, which need different dimensions than enterprise security tools.

Always respond with valid JSON matching the specified schema.`;

export function buildPersonaPrompt(
  ctx: ResearchContext,
  interpretation: object
): string {
  const docs = (ctx.attachments || []).filter((a) => a.kind !== "image");
  const docsBlock = docs.length
    ? `\n\nADDITIONAL CONTEXT FROM ATTACHED DOCUMENTS:\n${docs
        .map(
          (a) =>
            `--- ${a.name} ---\n${a.content.slice(0, 6000)}${a.content.length > 6000 ? "\n[…truncated]" : ""}`
        )
        .join("\n\n")}`
    : "";
  return `Based on the following research context, generate audience dimension clusters. Each cluster represents a meaningfully distinct segment whose attitudes, language preferences, or design sophistication would shape their response to the research.

RESEARCH CONTEXT:
${JSON.stringify(interpretation, null, 2)}

Original target audience description:
${ctx.targetAudience}${docsBlock}

For audiences described with explicit cohorts in the input, match those exactly as cluster names. Distribute sampleSize to match any percentages mentioned. Otherwise, generate 3 distinct clusters that capture meaningful variance for THIS specific research.

Each cluster should have 3-5 dimensions appropriate to the domain. Pick dimensions that would predict meaningfully different responses to the research stimuli — don't apply a fixed template. Examples by domain:
- Consumer creative tools: skill level, primary use case, language comfort, age cohort
- B2B SaaS: company size, role seniority, technical sophistication, integration footprint
- Healthcare: patient type, condition severity, care setting, health literacy
- E-commerce: purchase frequency, price sensitivity, brand loyalty, channel preference

Choose what's actually relevant — don't force unrelated dimensions in.

Return a JSON object with this schema. Each cluster gets THREE layers:

L1 (Core): identity & dimensions
L2 (Validation Predispositions): what kind of EVALUATOR this cluster is — drives how they react to research stimuli
L3 (Jobs-to-be-Done): the underlying jobs they hire products for

{
  "clusters": [
    {
      "id": "cluster_1",
      "name": "Cluster name (matches PM cohort if given)",
      "description": "1-2 sentences on what makes this segment distinctive in this study",
      "dimensions": [
        { "name": "Dimension name", "description": "why this matters", "values": ["value 1", "value 2", "value 3"] }
      ],
      "narrativeProfile": "2-3 sentence narrative of a representative member: what they do, what they care about, what tools they currently use, how they'd approach this product",
      "sampleSize": 50,
      "validationPredispositions": {
        "adoptionPosture": "Innovator | Early Adopter | Pragmatist | Skeptic | Laggard",
        "riskTolerance": "Low | Medium | High",
        "switchingCost": "Low | Medium | High",
        "counterfactual": "What this cluster does TODAY instead of using the product — the thing the new option must beat",
        "acceptanceCriteria": "What signals 'yes, this is for me' (e.g. 'saves 30+ min', 'feels professional', 'my friends would react well')",
        "rejectionTriggers": "What signals 'no' (e.g. 'looks like a cliché', 'feels patronizing', 'too much learning curve')",
        "habitStrength": "Weak | Moderate | Strong"
      },
      "jobsToBeDone": {
        "functional": "When [situation], I want to [motivation], so I can [outcome]",
        "emotional": "Emotional payoff in one phrase (e.g. 'feel competent', 'feel in control')",
        "social": "Social payoff in one phrase (e.g. 'look professional to clients', 'fit in with peers')"
      }
    }
  ]
}

REQUIREMENTS:
- 3-5 clusters total
- Each cluster has 3-5 dimensions
- sampleSize values across all clusters MUST sum to 100
- DIVERSE adoption postures: don't make every cluster a Pragmatist. Mix in some Skeptics and Laggards.
- At least 30% of clusters (by sampleSize share) should have predispositions that suggest RESISTANCE or INDIFFERENCE — these are the hard-to-convert users real research surfaces. Do NOT make personas that conveniently align with the product's value prop.
- counterfactual is the MOST IMPORTANT L2 attribute — it anchors what any new option must beat.
- L3 jobs should be domain-specific and concrete. NOT generic ("I want a good product"). Make them specific.
- Clusters must be meaningfully distinct from each other.`;
}

// ── Step 3: Instrument Generation ────────────────────────────────────────────

export const INSTRUMENT_SYSTEM = `You are a senior research designer. You design rigorous, well-structured research instruments — surveys and interview guides — that surface genuine attitudinal and behavioral insights.

Critical design principles:
- STAY ON SCOPE. Generate questions ONLY about what the study is actually evaluating (from interpretation.evaluationSubject and the research objectives). If the study is about TAGLINES, do not include pricing/feature/support questions. If the study is about PRICING, do not include broad brand-affinity questions. Off-scope questions waste panel time and pollute the data.
- All question text MUST be in ENGLISH (the analyst language). Question content can REFERENCE native-language variants (e.g. a Hindi tagline) but the question stem itself stays English.
- Questions are unbiased and non-leading
- Mix of question types: never all open-ended, never all Likert
- For CONCEPT TESTS (variant comparison studies): mark the per-variant questions with "perVariant": true. These are asked once per variant. The instrument also has 1-2 cross-variant questions asked once after all variants are evaluated.
- A standard concept-test battery measures: resonance (rating), initial reaction (open), likes/dislikes (open), purchase/use intent (likert), relevance to self (likert), plus cross-variant: most-compelling pick and free-form ideal-message.
- Phrasing should fit the domain. "How interested would you be in trying this?" works for consumer; "How likely would you be to evaluate this for your team?" works for B2B. Pick what fits.

Always respond with valid JSON matching the specified schema.`;

/**
 * Study-type-aware question battery for concept-test surveys. Returns the
 * "Generate EXACTLY..." block + JSON schema example. Each battery is tuned to
 * eliminate redundancy between Q3/Q4/Q5 that the generic version produced.
 */
function getQuestionBatteryForStudyType(
  studyType: string | undefined,
  variantTypeLowercase: string,
  variantCount: number
): string {
  const jsonSchema = `Return JSON in this exact shape. Each question MUST include a "scope" field set to either "per_variant", "cross_variant", or "general". The new question types (matrix, semantic_differential, nps) have their own required fields shown below.
{
  "title": "...",
  "description": "1-2 sentences on what this instrument measures",
  "rationale": "Why this battery addresses the research objectives",
  "variants": {
    "label": "...",
    "items": [{"id": "v1", "text": "..."}, ...one entry per variant in given order...],
    "randomizeOrder": true
  },
  "questions": [
    {"id": "q1", "type": "rating", "scope": "per_variant", "text": "...", "min": 1, "max": 5, "minLabel": "...", "maxLabel": "..."},
    {"id": "q2", "type": "open_ended", "scope": "per_variant", "text": "...", "placeholder": "..."},
    {"id": "q3", "type": "likert", "scope": "per_variant", "text": "...", "scale": ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"]},
    {"id": "q4", "type": "likert", "scope": "per_variant", "text": "...", "scale": ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"]},
    {"id": "q5", "type": "semantic_differential", "scope": "per_variant", "text": "Rate this variant on each axis.", "pairs": [{"left": "Premium","right": "Basic"},{"left": "Authentic","right": "Forced"},{"left": "Inclusive","right": "Niche"}], "steps": 5},
    {"id": "q6", "type": "rating", "scope": "cross_variant", "text": "...", "min": 1, "max": ${variantCount}, "minLabel": "Variant 1", "maxLabel": "Variant ${variantCount}"},
    {"id": "q7", "type": "matrix", "scope": "cross_variant", "text": "Rate each variant on each attribute.", "items": ["<variant 1 text>","<variant 2 text>","..."], "dimensions": ["Clarity","Originality","Fit-to-Brand"], "scale": 5},
    {"id": "q8", "type": "nps", "scope": "cross_variant", "text": "How likely are you to recommend your top-ranked variant to a peer? (0-10)"},
    {"id": "q9", "type": "open_ended", "scope": "cross_variant", "text": "...", "placeholder": "..."}
  ]
}

Notes:
- Use \`scope: "per_variant"\` for questions asked once per variant. The simulator will iterate them across each variant automatically.
- Use \`scope: "cross_variant"\` for questions asked ONCE after all variants are evaluated.
- For visual-variant studies, REPLACE q7 (matrix) with the appropriate visual closing questions per the instructions above.
- For text-variant studies, INCLUDE q7 (matrix) so analysts get per-attribute breakdowns.
- semantic_differential pairs MUST have left and right labels and a numeric "steps" (3, 5, or 7).
- matrix requires "items" (rows — usually variant texts) and "dimensions" (columns — attribute names) plus a "scale" integer.
- nps takes no additional fields beyond text — answer will be 0-10.`;

  const isVisualVariant =
    studyType === "variant_comparison" &&
    (variantTypeLowercase.includes("image") ||
      variantTypeLowercase.includes("design") ||
      variantTypeLowercase.includes("asset") ||
      variantTypeLowercase.includes("visual") ||
      variantTypeLowercase.includes("layout") ||
      variantTypeLowercase.includes("creative"));

  if (isVisualVariant) {
    return `Generate EXACTLY 8-9 questions with NO redundancy between them:

PER-VARIANT (scope: "per_variant") — asked once per variant:
1. Rating 1-5: how visually appealing this version is
2. Open-ended: what SPECIFIC visual elements stand out — capture BOTH positive AND negative reactions in this one answer
3. Likert: "This version feels authentic and appropriate for the target audience (not stereotypical, not forced)" (Strongly Disagree → Strongly Agree)
4. Likert: "I would publish this version without manual revision" (Strongly Disagree → Strongly Agree)
5. semantic_differential (3 pairs, 5-point): for this variant, rate it on Premium↔Basic, Authentic↔Forced, Inclusive↔Niche. This surfaces aesthetic positioning that ratings + open-ended miss.

CROSS-VARIANT (scope: "cross_variant") — asked once after all variants seen:
6. Rating 1-${variantCount}: which version would you actually use in your work
7. nps: how likely are you to recommend the version you ranked #1 to a teammate or peer who needs similar work? (0-10)
8. Open-ended: at which version does the adaptation start to feel forced, unnecessary, or like it crosses a line? Be specific about WHERE the line is.
9. Open-ended: which single visual element matters MOST to you when judging whether a version feels right?

CRITICAL DESIGN RULES:
- Q3 (authenticity) and Q4 (publish-readiness) measure DIFFERENT things. Don't merge them.
- Q2 captures BOTH positives and negatives in one prompt — do NOT add a separate "dislikes" question.
- Q5 (semantic_differential) measures aesthetic POSITIONING per variant — different from authenticity or publish-readiness.
- Q7 (nps) measures advocacy intent — different from selection (Q6).
- Q8 surfaces the threshold where adaptation overshoots. Q9 surfaces priority. These are distinct cross-variant signals.

${jsonSchema}`;
  }

  // Default text-based variant comparison (taglines, copy, positioning)
  return `Generate EXACTLY 8-9 questions with NO redundancy between them:

PER-VARIANT (scope: "per_variant") — asked once per variant:
1. Rating 1-5: how much this ${variantTypeLowercase} resonates with you personally
2. Open-ended: initial GUT REACTION to this specific ${variantTypeLowercase} — what does it make you think or feel, in 1-2 sentences?
3. Open-ended: structured analysis — what works AND what doesn't work about this specific ${variantTypeLowercase}?
4. Likert: "This ${variantTypeLowercase} would make me actually try the product" (Strongly Disagree → Strongly Agree)
5. Likert: "This ${variantTypeLowercase} feels like it was written for someone like me" (Strongly Disagree → Strongly Agree)

CROSS-VARIANT (scope: "cross_variant") — asked once after all variants seen:
6. Rating 1-${variantCount}: which ${variantTypeLowercase} would compel YOU most to act
7. matrix (variant × attribute): rate each variant on three independent attributes — Clarity (is the meaning obvious?), Originality (does it stand apart from competitor messaging?), Fit-to-Brand (does it sound like the product?). Use a 1-5 scale per cell.
8. nps: how likely are you to recommend the variant you ranked #1 to a peer/colleague? (0-10)
9. Open-ended: if none captured what would actually motivate you, what would the ideal ${variantTypeLowercase} say?

CRITICAL DESIGN RULES:
- Q2 (gut reaction) and Q3 (structured analysis) measure DIFFERENT things — gut vs considered. Don't merge.
- Q4 measures intent-to-act. Q5 measures relevance-to-self. These are distinct.
- Q7 (matrix) breaks the single-rating axis (Q1) into discrete attributes — surfaces why a variant ranks where it does on Clarity vs Originality vs Fit. Do NOT collapse with Q1.
- Q8 (nps) measures advocacy — different from intent-to-act (Q4).

MATRIX FORMAT: use the variant items as rows and the attributes as columns. Items array should reproduce the variant items.

${jsonSchema}`;
}

export function buildInstrumentPrompt(
  ctx: ResearchContext,
  interpretation: { studyType?: string; variants?: { label: string; items: string[] } } & object,
  personas: PersonaCluster[],
  method: ResearchMethod
): string {
  const isInterview = method === "interview";
  const studyType = (interpretation as { studyType?: string }).studyType;
  const isConceptTestStudy =
    studyType === "concept_test" ||
    studyType === "variant_comparison" ||
    studyType === "positioning_test";
  const hasVariants = !!(interpretation as { variants?: object }).variants;
  const isConceptTest =
    (isConceptTestStudy || method === "concept_test") && hasVariants;

  // ── Method-specific instrument templates ─────────────────────────────────
  // MaxDiff, KANO, and Conjoint each get a tailored battery so the LLM emits
  // an instrument matched to that method's analytical structure. Concept
  // Testing reuses the existing concept-test battery just below (handles its
  // variants).
  if (method === "maxdiff") {
    return `Design a MaxDiff (Best-Worst Scaling) survey instrument.

RESEARCH INTERPRETATION:
${JSON.stringify(interpretation, null, 2)}

PERSONA CLUSTERS:
${personas.map((p) => `- ${p.name}: ${p.description}`).join("\n")}

RESEARCH OBJECTIVES:
${ctx.objectives}

OBJECTIVE: Surface a reliable preference hierarchy by forcing trade-offs.

Generate EXACTLY 4-5 questions:
1. A forced_ranking question over 5-8 items derived from the research objectives. Items should be DISTINCT and equally plausible (features, attributes, value-props, etc.).
2. A multiple_choice (single) question asking which item is most important in their daily work.
3. A word_association question on the TOP-ranked item asking for 4-5 single-word emotional reactions — surfaces intensity signals that ranking alone misses (excitement, skepticism, relief, etc.).
4. An open_ended question on what would change their ranking.
5. (Optional) Another open_ended on the second-most-preferred item and why.

Return a JSON object with this schema:
{
  "title": "MaxDiff: <subject>",
  "description": "1-2 sentences on what this measures",
  "rationale": "Why forced ranking reveals true priority",
  "questions": [
    {"id": "q1", "type": "forced_ranking", "scope": "general", "text": "...", "items": ["item 1","item 2","item 3","item 4","item 5"]},
    {"id": "q2", "type": "multiple_choice", "scope": "general", "text": "...", "options": ["item 1","item 2","..."], "multiSelect": false},
    {"id": "q3", "type": "word_association", "scope": "general", "text": "When you think about your top-ranked item, what 4 single words come to mind?", "stimuli": ["<top-ranked item>"], "wordCount": 4},
    {"id": "q4", "type": "open_ended", "scope": "general", "text": "..."}
  ]
}`;
  }

  if (method === "kano") {
    return `Design a KANO Analysis instrument.

RESEARCH INTERPRETATION:
${JSON.stringify(interpretation, null, 2)}

PERSONA CLUSTERS:
${personas.map((p) => `- ${p.name}: ${p.description}`).join("\n")}

RESEARCH OBJECTIVES:
${ctx.objectives}

OBJECTIVE: Classify features as Must-have, Performance, Delighter, Indifferent, or Reverse via paired functional/dysfunctional questions.

Pick 3-5 FEATURES from the research objectives. For each feature, produce TWO Likert questions:
- Functional: "How would you feel if [feature] EXISTED?"
- Dysfunctional: "How would you feel if [feature] did NOT exist?"

Use this exact KANO scale on EVERY Likert: ["I would like it", "I expect it", "I am neutral", "I can tolerate it", "I would dislike it"].

After the paired likert questions, add ONE closing semantic_differential that captures the EMOTIONAL TRAJECTORY across the features. Use 2-3 adjective pairs like Frustrating↔Delightful, Boring↔Exciting, Cluttered↔Clean.

Return a JSON object with this schema:
{
  "title": "KANO Analysis: <subject>",
  "description": "1-2 sentences",
  "rationale": "Why paired functional/dysfunctional reveals true expectations",
  "questions": [
    {"id": "q1_func", "type": "likert", "scope": "general", "text": "How would you feel if <Feature 1> EXISTED?", "scale": ["I would like it","I expect it","I am neutral","I can tolerate it","I would dislike it"]},
    {"id": "q1_dys", "type": "likert", "scope": "general", "text": "How would you feel if <Feature 1> did NOT exist?", "scale": ["I would like it","I expect it","I am neutral","I can tolerate it","I would dislike it"]},
    /* …paired pair per feature… */
    {"id": "qN", "type": "semantic_differential", "scope": "general", "text": "Imagining the product with all these features as you'd prefer them, how does it feel on each axis?", "pairs": [{"left": "Frustrating", "right": "Delightful"}, {"left": "Boring", "right": "Exciting"}, {"left": "Cluttered", "right": "Clean"}], "steps": 5}
  ]
}`;
  }

  if (method === "conjoint") {
    return `Design a simplified conjoint-style trade-off instrument.

RESEARCH INTERPRETATION:
${JSON.stringify(interpretation, null, 2)}

PERSONA CLUSTERS:
${personas.map((p) => `- ${p.name}: ${p.description}`).join("\n")}

RESEARCH OBJECTIVES:
${ctx.objectives}

OBJECTIVE: Force the synthetic panel to reveal priorities by choosing between bundles AND to surface the attribute hierarchy that explains those choices.

Generate this exact structure (7-10 questions total):
1. ONE allocation question FIRST: distribute 10 points across 3-4 attribute categories (e.g. Price, Feature richness, Performance, Support). This baseline reveals priorities BEFORE any bundle anchors their thinking.
2. 5-7 multiple_choice trade-off questions. Each presents a head-to-head between 2-3 PLAUSIBLE bundles (a bundle = an attribute combination, e.g. "Feature X + price A" vs "Feature Y + price B"). Avoid obviously-dominated options.
3. ONE forced_ranking question over the top 5 deal-breaker attributes — ordered from most-deal-breaking to least.
4. ONE open_ended on which attribute they'd never compromise on, and why.

Return a JSON object with this schema:
{
  "title": "Conjoint Trade-off: <subject>",
  "description": "1-2 sentences",
  "rationale": "Why choice scenarios surface true priorities, anchored by an allocation baseline and a deal-breaker hierarchy",
  "questions": [
    {"id": "q1", "type": "allocation", "scope": "general", "text": "You have 10 points to distribute across these attributes. Spend them based on how much each matters to your purchase decision.", "items": ["Price","Feature richness","Performance","Support"], "totalPoints": 10},
    {"id": "q2", "type": "multiple_choice", "scope": "general", "text": "Which would you prefer?", "options": ["Bundle A: <attributes>","Bundle B: <attributes>"], "multiSelect": false},
    /* …5-7 such trade-off scenarios… */
    {"id": "qR", "type": "forced_ranking", "scope": "general", "text": "Rank these from most to least likely to make you walk away from a deal.", "items": ["<attr 1>","<attr 2>","<attr 3>","<attr 4>","<attr 5>"]},
    {"id": "qN", "type": "open_ended", "scope": "general", "text": "Which single attribute would you never compromise on, and why?"}
  ]
}`;
  }

  if (isConceptTest && method !== "interview") {
    const variants = (interpretation as { variants: { label: string; items: string[] } }).variants;
    const lower = variants.label.toLowerCase();
    const battery = getQuestionBatteryForStudyType(
      studyType,
      lower,
      variants.items.length
    );
    return `Design a SURVEY-based concept test instrument testing ${variants.items.length} ${lower} variants.

VARIANTS TO TEST:
${variants.items.map((v, i) => `${i + 1}. "${v}"`).join("\n")}
Variant label: ${variants.label}

PERSONA CLUSTERS:
${personas.map((p) => `- ${p.name}: ${p.description}`).join("\n")}

RESEARCH OBJECTIVES:
${ctx.objectives}

${battery}

The variants array MUST list exactly: ${variants.items.map((v, i) => `{"id":"v${i + 1}","text":"${v}"}`).join(", ")}
The variants.label MUST be exactly: "${variants.label}"`;
  }

  // Generic (non-concept-test) instrument
  const questionCount = isInterview ? "8-12" : "12-16";
  const focusNote = isInterview
    ? "For interviews, use longer-form questions that elicit narrative. Lean on open_ended for the core depth, but include 1-2 PROJECTIVE techniques to surface tacit beliefs: sentence_completion ('When I think about <topic>, I usually feel ___') or scenario ('Imagine you're pitching this to your team Monday morning — what's the first sentence?'). These often surface things direct questioning never does."
    : "For surveys, mix structured items (likert, rating, nps) with choice-based items (multiple_choice, forced_ranking) for behavioral signal, and 2-3 open_ended for qualitative texture. Add a single matrix question when comparing attributes across items — it's more compact than many separate ratings.";

  return `Design a ${method} instrument for the following research.

RESEARCH INTERPRETATION:
${JSON.stringify(interpretation, null, 2)}

PERSONA CLUSTERS:
${personas.map((p) => `- ${p.name}: ${p.description}`).join("\n")}

METHOD: ${method.toUpperCase()}
${focusNote}

QUESTION TYPE PALETTE (all 13 are valid — pick the BEST tool for each measurement):
- likert: agreement / sentiment on a labelled 5-point scale
- rating: numeric scale (1-5, 1-10, 0-100) — use when magnitude matters
- nps: 0-10 likelihood-to-recommend — use ONCE per study for overall advocacy
- open_ended: free-text — for "why" and qualitative texture (use sparingly outside interviews)
- multiple_choice: closed-list with optional multi-select — for behaviors, demographics, scenarios
- forced_ranking: order an item set — use when relative priority matters more than absolute scores
- allocation: distribute N points across items — surfaces priority WEIGHTS, not just order
- semantic_differential: rate on adjective pairs — for emotional/positioning measurement
- matrix: rate multiple items across multiple dimensions in one grid — compact attribute comparison
- sentence_completion: projective stem like "When I __, I usually ___" — surfaces tacit beliefs
- word_association: 3-5 single-word reactions to a stimulus — captures intensity/emotion
- scenario: prompt for a short first-person narrative — for vignettes and behavioral imagination
- yes_no_why: closed decision plus a one-sentence reason — for clear pivot moments

Generate ${questionCount} questions. Each question MUST include a "scope" field ("general" if no variants, or "per_variant" / "cross_variant" if variants exist).

Return a JSON object with this schema:
{
  "title": "Research instrument title",
  "description": "1-2 sentences on what this instrument measures",
  "rationale": "Why these questions were chosen",
  "questions": [
    { "id": "q1", "type": "likert", "scope": "general", "text": "...", "scale": ["Strongly Disagree","Disagree","Neutral","Agree","Strongly Agree"] },
    { "id": "q2", "type": "rating", "scope": "general", "text": "...", "min": 1, "max": 10, "minLabel": "Not at all", "maxLabel": "Extremely" },
    { "id": "q3", "type": "open_ended", "scope": "general", "text": "...", "placeholder": "..." }
  ]
}

For surveys, aim ~40% likert/rating, ~15% choice-based (multiple_choice / forced_ranking / allocation / matrix), ~15% open_ended, and 1 nps for advocacy. For interviews, aim ~20% structured (likert/rating), ~65% open_ended + projective (sentence_completion, scenario, word_association), ~15% other.

WELL-FORMED QUESTION EXAMPLES (these are the question types most often mis-formed — match the shape EXACTLY for each type):

matrix — rate multiple items across multiple dimensions on the same scale. Required: items (array), dimensions (array), scale (5 or 7).
{"id":"q5","type":"matrix","scope":"cross_variant","text":"Rate each variant on each attribute.","items":["Variant A","Variant B","Variant C"],"dimensions":["Clarity","Originality","Trust"],"scale":5}

semantic_differential — bipolar adjective pairs on a 5- or 7-step scale. Required: pairs (array of {left,right}), steps (5 or 7).
{"id":"q6","type":"semantic_differential","scope":"per_variant","text":"Rate this tagline on the following dimensions:","pairs":[{"left":"Premium","right":"Basic"},{"left":"Authentic","right":"Forced"},{"left":"Modern","right":"Dated"}],"steps":5}

scenario — situate respondent in a concrete moment, then ask what they'd do. Required: scenarioText (string), followUp (string).
{"id":"q7","type":"scenario","scope":"general","text":"Picture this scenario and react:","scenarioText":"You see this tagline on a billboard on your commute. You're not familiar with the brand.","followUp":"What's your first thought, and would you remember the brand name tomorrow?"}

yes_no_why — binary decision with a one-sentence reason. Required: requireWhy (boolean).
{"id":"q8","type":"yes_no_why","scope":"per_variant","text":"Based only on this tagline, would you tap to learn more about the app?","requireWhy":true}

word_association — N single words in response to a stimulus. Required: stimuli (array of stimuli), wordCount (1-10).
{"id":"q9","type":"word_association","scope":"per_variant","text":"List 3 single words that come to mind when you read this tagline:","stimuli":["the tagline being shown"],"wordCount":3}

sentence_completion — projective stem(s) to surface tacit beliefs. Required: stems (array of strings).
{"id":"q10","type":"sentence_completion","scope":"general","text":"Complete each sentence quickly without overthinking:","stems":["When I see a tagline in Hindi, I usually feel ___","If a design app promises 'one click', I assume ___","A tagline that mentions Indians specifically makes me think ___"]}

allocation — distribute a pot of points across items. Required: items (array), totalPoints (int).
{"id":"q11","type":"allocation","scope":"cross_variant","text":"You have 100 points. Allocate them across the variants based on how likely each is to make you try the app.","items":["Variant A","Variant B","Variant C","Variant D","Variant E"],"totalPoints":100}

forced_ranking — order items by preference. Required: items (array).
{"id":"q12","type":"forced_ranking","scope":"cross_variant","text":"Rank the variants from most to least compelling.","items":["Variant A","Variant B","Variant C","Variant D","Variant E"]}

CHECKLIST (verify each emitted question against this — these are the most common validation failures):
- matrix → did you include items, dimensions, AND scale?
- semantic_differential → did you include pairs (array of {left, right}) AND steps?
- scenario → did you include BOTH scenarioText AND followUp?
- yes_no_why → did you include requireWhy?
- word_association → did you include stimuli AND wordCount?
- sentence_completion → did you include stems as an array (not a single string)?
- allocation → did you include totalPoints?
- All questions → did you include id, text, type, AND scope?`;
}

// ── Step 4: Panel Simulation ──────────────────────────────────────────────────

/**
 * Shared rule block used by BOTH the per-respondent interview system prompt
 * AND the per-batch survey system prompt. Returns just the rules text so each
 * caller can prepend its own framing. Keeping a single source ensures any
 * future rule change applies universally across question types and methods.
 */
function buildSimulatorRulesBlock(options?: {
  evaluationSubject?: string;
  studyType?: string;
  audienceSummary?: string;
}): string {
  const scope = options?.evaluationSubject
    ? `\n\nSTAY ON TOPIC — THE STUDY IS EVALUATING: ${options.evaluationSubject}\nYour responses must focus on THIS subject. Do NOT volunteer opinions on aspects outside the scope — for example:\n- If the study tests TAGLINES, comment on tagline wording, tone, fit; do NOT comment on app pricing, support, features, or business model.\n- If the study tests a FEATURE, comment on the feature; do NOT critique unrelated parts of the product.\n- If the study tests PRICING, comment on the price tiers; do NOT volunteer feature wish-lists.\nIf a question pulls you off-topic, answer ONLY the question — do not add unsolicited commentary on unrelated aspects.${options?.studyType ? `\nStudy type: ${options.studyType}.` : ""}`
    : "";
  const audience = options?.audienceSummary
    ? `\nAudience context (for tone/voice calibration only — NOT to introduce off-topic commentary): ${options.audienceSummary}`
    : "";

  return `LANGUAGE — RESPOND PRIMARILY IN ENGLISH:
Your answers will be synthesized by an English-speaking analyst. Respond in English regardless of the audience's native language.
- If your persona is a natural bilingual (e.g. Hindi-English in India, Spanglish on the US border) you MAY include 1-2 native-language words or short phrases for authenticity within an otherwise English answer (e.g. "Feels really apna, like it's for us").
- NEVER produce a full sentence, paragraph, or transcript in a non-English language.
- An exception: if the question explicitly asks you to translate, recite, or react to native-language content (e.g. a Hindi tagline), you may quote that content verbatim — but your commentary on it stays in English.

CRITICAL — REACT TO WHAT YOU'RE SHOWN:
The user message contains the EXACT content you are evaluating (variants, concepts, features, etc.) listed verbatim and/or attached as images. You CAN see them. NEVER say "I haven't been shown the [variant] yet" or "you haven't provided it" — they ARE in the prompt. React to the SPECIFIC text/content you see.${scope}${audience}

CRITICAL — RESIST NARRATIVE CONVERGENCE (applies to ALL question types: likert, rating, ranking, allocation, semantic-differential, matrix, nps, open-ended, etc.):
Real respondents do NOT all reach the same conclusion. Real data is MESSY.

When evaluating multiple variants or items, AVOID these convergence patterns:
- Monotonic progression (1→2→3→4→5 ratings as variants get "more adapted" or "fancier")
- All respondents picking the same winner / same #1 in rankings / same top option in NPS
- Predictable rating arcs that match the obvious "best variant"
- All respondents distributing allocation points the same way

INSTEAD, exhibit these REAL patterns:
- Some respondents prefer the SIMPLEST option (V1/baseline) because it feels honest or familiar
- Some respondents reject the MOST adapted version as overdone, uncanny, or trying-too-hard
- Some respondents are inconsistent — give 4 to one variant, 2 to a similar one, can't quite explain why
- Ratings cluster tightly (e.g. 3.4–3.9 range) more often than they spread (2.0–5.0)
- A FEW respondents (10–15%) should explicitly DISAGREE with the dominant pattern in the panel
- In rankings/allocation, ~15% should rank the "obvious loser" in their top half — for reasons rooted in their persona, not contrarianism

REALISTIC RATING DISTRIBUTIONS (target what real survey panels actually produce — your batch's ratings should aggregate into shapes like these, not into hard polarisation):
- A "winner" variant: ~25-35% rate 5, ~30-40% rate 4, ~20% rate 3, ~10-15% rate 2, ~5% rate 1. Mean lands ~3.7-4.0.
- A "middle-pack" variant: ~10-15% rate 5, ~25-30% rate 4, ~30-35% rate 3, ~15-20% rate 2, ~5-10% rate 1. Mean ~3.0-3.5.
- A "loser" variant: ~5% rate 5, ~10-15% rate 4, ~25% rate 3, ~30-35% rate 2, ~15-20% rate 1. Mean ~2.4-2.8.
AVOID: any single variant in your batch getting only 5s or only 1s; >60% rating 5 or >50% rating 1 across the panel. Real panels almost never produce these distributions even for genuinely great or terrible options.
For forced-choice "which variant most makes you want to try the app" — picks should spread roughly 30/25/20/15/10 across 5 options, NOT 70/15/10/5/0. Even a "loser" variant attracts ~5-10% of forced-choice picks from edge-case respondents.

YOUR PERSONA'S PREDISPOSITION MATTERS (shapes WHAT you care about and WHY you rate the way you do — NOT a uniform discount applied to every score):
- If your persona is a SKEPTIC or LAGGARD: you're harder to impress on speculative features but rate REAL benefits highly when you see them. You don't apply a flat 0.5-1.0 penalty across the board — that produces unrealistic uniformly-low averages. Instead, rate things that genuinely address your concerns at 4 or 5; rate things that ignore your concerns at 2 or 3. Your skepticism shows up as which arguments persuade you, not as a universal discount.
- If your persona has HIGH switching cost or STRONG habit: rate familiar/baseline options slightly higher than experimental ones (often by 0.5-1 rating); rank them higher; allocate more points to them.
- If your persona's counterfactual is "I do this manually" or "I use a competing tool": compare every variant to what you currently produce or use. Variants that don't meaningfully beat your status quo earn a 3; ones that DO earn a 4 or 5.
- If your persona is risk-averse: prefer middle-ground variants over extreme adaptations; allocate points conservatively — but rate moderately, not punitively.
- IMPORTANT: a persona with strong dislikes for ONE specific theme (e.g. "preachy nationalism") should rate variants that hit that theme lower (1-2 lower than they'd otherwise give), but should NOT downgrade unrelated variants. The dislike is a per-stimulus reaction, not a panel-wide mood.

REALISM RULES (apply to every answer regardless of question type):
1. STAY IN CHARACTER. A skeptic doesn't suddenly become enthusiastic. A cautious corporate user doesn't endorse the most aggressive variant.

2. BE SPECIFIC AND NATURAL. Real respondents give specific, messy answers. No marketing-speak. No "this demonstrates real cultural intelligence" — that's analyst commentary, not respondent reaction.

3. VARY RESPONSE LENGTH WILDLY (open-ended/scenario/sentence_completion answers).
   - 30% of responses: 5–15 words
   - 50% of responses: 20–40 words
   - 20% of responses: 40–80 words
   - NEVER all polished mini-essays. Real respondents are often brief.

4. 10% OF RESPONSES should be "I don't know," "doesn't really matter to me," "this all looks the same to me," or similar. That's realistic.

5. CONTRADICT YOURSELF OCCASIONALLY. Rate a variant 4 but say "I dunno, it's fine I guess." Real people are inconsistent.

6. CULTURALLY GROUNDED — but RESIST CLICHÉS. Don't reference "ma" or "negative space" unless your persona is a design expert. Most respondents don't have art-school vocabulary.

7. NEGATIVE FEEDBACK IS SPECIFIC AND OCCASIONAL. Don't make EVERY response negative. Don't make EVERY response positive. Real panels are roughly 30% positive, 30% negative, 40% mixed.

8. WORD ASSOCIATIONS, SENTENCE COMPLETIONS, SCENARIOS: keep these grounded in the study subject. Don't free-associate into unrelated topics. Keep word_association to single, plain words (not phrases). Keep sentence_completion to ≤15 words. Keep scenario answers in first person and inside the study's frame.`;
}

/**
 * Per-respondent system prompt used by the INTERVIEW path (1 respondent per
 * LLM call). For the batched SURVEY path use buildBatchRespondentSystemPrompt
 * — same rules, different framing.
 */
export function buildRespondentSystemPrompt(
  personaProfile: string,
  clusterName: string,
  method: ResearchMethod,
  options?: {
    /** What's being tested — taglines, features, prices, etc. — from
     *  interpretation.evaluationSubject. Used to enforce on-topic responses. */
    evaluationSubject?: string;
    /** interpretation.studyType (e.g. "variant_comparison", "concept_test"). */
    studyType?: string;
    /** A 1-sentence summary of context.targetAudience used to scope the
     *  bilingual / cultural code-mix rules per study. */
    audienceSummary?: string;
  }
): string {
  return `You are simulating a real person responding to a user research study.

${buildSimulatorRulesBlock(options)}

YOUR PERSONA:
Cluster: ${clusterName}
Profile: ${personaProfile}

${method === "interview" ? "Give detailed, narrative answers. Speak in first person. Stay within the study scope as defined above." : "Give realistic, varied responses. Stay in character. Stay within the study scope as defined above."}`;
}

/**
 * Batch system prompt for the survey path. The per-respondent profiles ARE in
 * the user prompt (buildSurveyBatchPrompt); this just sets the framing + the
 * shared rules. Previously this path used a weak 1-line system prompt that
 * bypassed all anti-convergence / language / scope guardrails — restored here.
 */
export function buildBatchRespondentSystemPrompt(
  batchSize: number,
  hasImages: boolean,
  options?: {
    evaluationSubject?: string;
    studyType?: string;
    audienceSummary?: string;
  }
): string {
  return `You are simulating ${batchSize} DISTINCT survey respondents in a single batch. Each respondent's persona profile is listed in the user prompt — stay in character for EACH of them independently. Respondents have authentic, varied opinions — not all positive, not all negative, not all converging on the same answer.${hasImages ? " Some variants are images attached to this message; react to them visually." : ""}

${buildSimulatorRulesBlock(options)}

OUTPUT: for each respondent in the order given, produce one entry in the JSON array. Each respondent's answers must read as a coherent, in-character voice — different from the other respondents' voices.`;
}


export function buildSurveyBatchPrompt(
  questions: Question[],
  variants: InstrumentVariant[] | undefined,
  respondentProfiles: Array<{ id: string; profile: string; clusterName: string }>,
  /**
   * Ordered list of variant IDs whose IMAGES are attached to this message
   * (in the same order as the image content blocks). Used to label each
   * attached image as "Variant N's image" in the prompt text.
   */
  imageVariantIds?: string[]
): string {
  const hasVariants = variants && variants.length > 0;
  const imageIdSet = new Set(imageVariantIds ?? []);

  // Build the question matrix to ask
  let questionBlock = "";
  if (hasVariants) {
    const perVariantQs = questions.filter(
      (q) => getQuestionScope(q) === "per_variant"
    );
    const crossQs = questions.filter(
      (q) => getQuestionScope(q) !== "per_variant"
    );

    // For each variant, either show its text OR point at the attached image
    const variantLines = variants.map((v, i) => {
      if (imageIdSet.has(v.id)) {
        const imgIdx = (imageVariantIds ?? []).indexOf(v.id) + 1;
        return `Variant ${i + 1} [id: ${v.id}]: SEE IMAGE #${imgIdx} attached to this message. Description (for context only — DO NOT parrot back): "${v.text}"`;
      }
      return `Variant ${i + 1} [id: ${v.id}]:\n"${v.text}"`;
    });

    questionBlock = `## VARIANTS YOU ARE EVALUATING (${variants.length} total — these are LITERAL items you must react to)

${variantLines.join("\n\n")}

${imageIdSet.size > 0 ? `IMAGE GUIDANCE: ${imageIdSet.size} variant${imageIdSet.size === 1 ? " is" : "s are"} attached as image${imageIdSet.size === 1 ? "" : "s"} to this message. Look at the IMAGE itself and react as your persona would react VISUALLY (composition, colour, cultural cues, what catches the eye, what feels off). Don't quote the description back — it's context, not what the audience sees.\n\n` : ""}CRITICAL: You are NOT being asked about abstract variants — you are reacting to these specific items. For text variants, reference the specific words/phrases in your answers. For image variants, reference specific visual elements you see (a layout choice, a colour, an object). Do NOT say "I haven't seen the variant" — they are RIGHT HERE.

## PER-VARIANT QUESTIONS (each is asked once per variant)
${perVariantQs.map((q) => formatQuestion(q)).join("\n\n")}

## CROSS-VARIANT QUESTIONS (asked once after all variants are seen)
${crossQs.map((q) => formatQuestion(q)).join("\n\n")}`;
  } else {
    questionBlock = `## QUESTIONS
${questions.map((q) => formatQuestion(q)).join("\n\n")}`;
  }

  const profileList = respondentProfiles
    .map((r, i) => `Respondent ${i + 1} (ID: ${r.id}, Cluster: ${r.clusterName}):\n${r.profile}`)
    .join("\n\n---\n\n");

  const variantInstructions = hasVariants
    ? `\nFor each respondent:
- Randomize the order in which you mentally evaluate the variants (don't always start with variant 1)
- For each PER-VARIANT question, provide one answer per variant — include "variantId" in each answer object (use the exact id shown above like "${variants![0].id}")
- For each CROSS-VARIANT question, provide a single answer (no variantId)
- Quote or paraphrase the SPECIFIC text/words of each variant in your open-ended answers ("the 'Ek click mein design' one sounds…", not "this tagline sounds…")
- Authentic reactions: include cultural specifics, language reactions, gut associations`
    : "";

  return `You are simulating ${respondentProfiles.length} survey respondents. Each has a distinct profile.

PROFILES:
${profileList}

${questionBlock}
${variantInstructions}

Return a JSON array:
[
  {
    "respondentId": "the respondent ID",
    "answers": [
      ${
        hasVariants
          ? `{"questionId": "q1", "variantId": "v1", "answer": 4},
      {"questionId": "q1", "variantId": "v2", "answer": 2},
      ...one entry per (per-variant question × variant)...
      {"questionId": "q6", "answer": 3},
      {"questionId": "q7", "answer": "Free-text final response..."}`
          : `{"questionId": "q1", "answer": "Strongly Agree"},
      {"questionId": "q2", "answer": 7},
      {"questionId": "q3", "answer": "Detailed open-ended response..."}`
      }
    ]
  }
]

CRITICAL FORMAT RULES:
- For Likert: answer must be one of the exact scale labels
- For Rating: answer must be a number within the specified range
- For Open-ended PER-VARIANT: 20-60 words MAX. Not an essay — real survey respondents are brief.
- For Open-ended CROSS-VARIANT (no variantId): 30-80 words MAX.
- For Forced Ranking / Allocation / Semantic Differential / Multi-select MC / Matrix / Sentence Completion / Word Association / Yes-No-Why: the answer field must be a JSON-STRINGIFIED payload (one literal string, including the brackets and quotes) following the format hint at the end of the question. Example for ranking: answer = '["Item B","Item A","Item C"]'.
- For Single-select MC: answer is the exact option label string.
- For NPS: answer is a single integer 0-10.
- For Scenario: answer is a single open-text response (no JSON wrapping).
- Some respondents may give 5-10 word answers. That's realistic. Do not pad.
- Each respondent's answers must be consistent with their persona AND meaningfully different from other respondents
- Open-ended answers must include real specifics from the persona's life (tools, places, frustrations, reference points)
- DO NOT repeat the variant text back at length. Reference it briefly ("the 'Magic of design' one") and react.`;
}

function formatQuestion(q: Question): string {
  switch (q.type) {
    case "likert":
      return `[${q.id}] [LIKERT] ${q.text}\nScale: ${q.scale.join(" | ")}`;
    case "rating":
      return `[${q.id}] [RATING ${q.min}-${q.max}] ${q.text}\n(${q.minLabel} → ${q.maxLabel})`;
    case "open_ended":
      return `[${q.id}] [OPEN] ${q.text}`;
    case "forced_ranking":
      return `[${q.id}] [RANKING] ${q.text}\nItems: ${q.items
        .map((it, i) => `${i + 1}. ${it}`)
        .join("; ")}\nAnswer with a JSON-stringified array of the items in order from MOST to LEAST preferred (use the exact item labels).`;
    case "allocation":
      return `[${q.id}] [ALLOCATION ${q.totalPoints} pts] ${q.text}\nItems: ${q.items.join(
        " | "
      )}\nAnswer with a JSON-stringified object mapping each item label to integer points; the points MUST sum to exactly ${q.totalPoints}.`;
    case "semantic_differential":
      return `[${q.id}] [SEM DIFF ${q.steps}-pt] ${q.text}\nPairs:\n${q.pairs
        .map((p, i) => `  ${i + 1}. ${p.left} ←——→ ${p.right}`)
        .join(
          "\n"
        )}\nAnswer with a JSON-stringified object mapping the 0-based pair index to an integer position 1-${q.steps} (1 = closest to LEFT, ${q.steps} = closest to RIGHT).`;
    case "multiple_choice":
      return `[${q.id}] [MC ${q.multiSelect ? "multi" : "single"}] ${q.text}\nOptions: ${q.options
        .map((o, i) => `(${i + 1}) ${o}`)
        .join("  ")}\n${
        q.multiSelect
          ? "Answer with a JSON-stringified array of the option label strings you select."
          : "Answer with the EXACT option label string of your single choice."
      }`;
    case "matrix":
      return `[${q.id}] [MATRIX ${q.scale}-pt] ${q.text}\nItems: ${q.items.join(" | ")}\nDimensions: ${q.dimensions.join(
        " | "
      )}\nAnswer with a JSON-stringified object whose keys are "item|dimension" (literal pipe) and whose values are integers 1-${q.scale}.`;
    case "sentence_completion":
      return `[${q.id}] [SENTENCE COMPLETION] ${q.text}\nStems:\n${q.stems
        .map((s, i) => `  ${i + 1}. ${s}`)
        .join(
          "\n"
        )}\nAnswer with a JSON-stringified object mapping the 0-based stem index to your brief in-character completion (≤15 words each).`;
    case "word_association":
      return `[${q.id}] [WORD ASSOCIATION] ${q.text}\nStimuli: ${q.stimuli.join(
        " | "
      )}\nAnswer with a JSON-stringified object mapping each stimulus to an array of EXACTLY ${q.wordCount} single-word reactions.`;
    case "scenario":
      return `[${q.id}] [SCENARIO] ${q.text}\nScene: ${q.scenarioText}\nFollow-up: ${q.followUp}\nAnswer with a single open-text response in first person (30-80 words).`;
    case "yes_no_why":
      return `[${q.id}] [YES/NO${q.requireWhy ? "+WHY" : ""}] ${q.text}\nAnswer with a JSON-stringified object {"decision": "yes" | "no"${q.requireWhy ? `, "why": "1-2 sentence reason in your voice"` : ""}}.`;
    case "nps":
      return `[${q.id}] [NPS 0-10] ${q.text}\nAnswer with a single integer 0-10 (0 = not at all likely to recommend, 10 = extremely likely).`;
    default: {
      const _exhaustive: never = q;
      return `[?] [UNKNOWN] ${JSON.stringify(_exhaustive)}`;
    }
  }
}

export function buildInterviewPrompt(
  questions: Question[],
  personaProfile: string,
  clusterName: string,
  variants?: InstrumentVariant[],
  imageVariantIds?: string[]
): string {
  const hasVariants = variants && variants.length > 0;
  const imageIdSet = new Set(imageVariantIds ?? []);

  let variantBlock = "";
  if (hasVariants) {
    const variantLines = variants!.map((v, i) => {
      if (imageIdSet.has(v.id)) {
        const imgIdx = (imageVariantIds ?? []).indexOf(v.id) + 1;
        return `Variant ${i + 1} [${v.id}]: SEE IMAGE #${imgIdx} attached. Description (context): "${v.text}"`;
      }
      return `Variant ${i + 1} [${v.id}]: "${v.text}"`;
    });

    variantBlock = `## VARIANTS YOU ARE EVALUATING (${variants!.length} total)

${variantLines.join("\n\n")}

CRITICAL: These ARE the items you are reacting to. They are listed above (and any image variants are attached to this message). Do NOT say "I haven't been shown the variant" or "you haven't provided it" — they are RIGHT HERE. Reference specific elements in your answers by their content or visible details.

`;
  }

  const questionList = questions
    .map((q, i) => `Q${i + 1}: ${q.text}`)
    .join("\n");

  return `You are a research participant being interviewed. Your persona is described in your system prompt.

${variantBlock}INTERVIEW QUESTIONS (answer each as yourself, referencing the specific variants where relevant):
${questionList}

Return a JSON object:
{
  "transcript": [
    { "question": "exact question text", "answer": "your detailed in-character response" }
  ]
}

For each answer:
- Speak naturally in first person
- Give substantive, thoughtful responses (4-8 sentences)
- Reference SPECIFIC variants by their content or visible elements when relevant
- Include specific examples from your experience where relevant
- Express uncertainty, nuance, or mixed feelings where authentic

Cluster: ${clusterName}
Profile: ${personaProfile.slice(0, 400)}`;
}

// ── Step 5: Synthesis ─────────────────────────────────────────────────────────

export const SYNTHESIS_SYSTEM = `You are a senior UX research analyst writing for a product manager who has to make a decision tomorrow.

LANGUAGE: Write the entire report in ENGLISH. You may quote native-language phrases from respondents verbatim where they appeared — but your analyst voice (executive summary, narrative, recommendations, takeaways) is English throughout.

SCOPE: The report must focus on what was studied. If the study tested taglines, do not write paragraphs on pricing, business model, or unrelated features — even if a few respondents drifted there. Flag drift as "off-scope respondent commentary, excluded" rather than synthesizing it into findings.

Every insight must answer: "So what should the PM do?"

BAD: "Users rated the feature 3.2/5"
GOOD: "Lukewarm reception (3.2/5) — insufficient to justify launch. Refine before shipping, or narrow to the segment that scored higher (Creators, 4.1)."

USE DECISION-FRAME LANGUAGE:
- Ship / Don't ship / Ship with caveats
- Proceed with confidence / Proceed with caution / Revisit
- Prioritize X over Y because [reason]
- The risk of shipping without addressing this: [specific risk]

AVOID research jargon. NEVER say "statistically significant", "p-value", "n=", "effect size". Instead use: strong signal, directional, split verdict, clear preference, marginal difference, no clear winner.

Your reports must:
1. LET THE DATA LEAD. If there is no clear winner, say that explicitly. Do not force narratives the data doesn't support.
2. USE EXACT NUMBERS. Every claim references specific respondent counts, percentages, ratings. "Several respondents" → unacceptable. "10 respondents (16%)" → required.
3. QUOTE RESPONDENTS DIRECTLY. Quotes are real quotes from the panel, not paraphrases. They feel like real people — colloquial, specific.
4. IDENTIFY TENSIONS AND TRADE-OFFS in cross-thematic analysis (aspiration vs. clarity, simplicity vs. credibility, broad reach vs. targeted resonance).
5. STRATEGIC TAKEAWAYS ARE ACTIONABLE. "Position the product as enhancing existing skill rather than replacing it" beats "consider the audience".
6. PROFESSIONAL TONE. Formal but readable. No hedging with "perhaps" or "it seems". Direct analytical claims.
7. ADAPT TO STUDY TYPE. The section headers, framing, and recommendation phrasing must fit what's actually being tested (taglines, features, flows, pricing, etc.).
8. Always respond with valid JSON matching the specified schema.`;

export function buildSynthesisPrompt(
  method: ResearchMethod,
  panelData: SurveyRespondent[] | InterviewRespondent[] | unknown[],
  instrument: ResearchInstrument,
  personas: PersonaCluster[],
  interpretation: object,
  ctx: ResearchContext,
  variantStats?: Array<{
    variantId: string;
    variantText: string;
    n: number;
    avgRating: number | null;
    // Renamed from intentPositivePct → interestPercent so the precomputed
    // shape matches the synthesis prompt + VariantPerformanceSchema. With
    // the mismatch the LLM would see an unknown key and emit interestPercent=0.
    interestPercent: number | null;
    // ratingDistribution is now an ARRAY of {rating, count, percent} matching
    // VariantPerformanceSchema directly. Previously a Record<string,number>
    // which forced the LLM to translate (and often fail validation).
    ratingDistribution: Array<{
      rating: number;
      count: number;
      percent: number;
    }>;
  }> | null
): string {
  const hasVariants = !!instrument.variants;
  // Use compact JSON (no indent) — saves ~30% on tokens for large arrays
  const panelSummary =
    method === "survey"
      ? `SURVEY RESPONSES (${panelData.length} respondents, slim format — join answers to questions via qid and instrument.questions; join to variants via vid and instrument.variants.items; join to clusters via cluster name and personas):\n${JSON.stringify(panelData)}`
      : `INTERVIEW TRANSCRIPTS (${panelData.length} respondents):\n${JSON.stringify(panelData)}`;

  // Quant pre-computation block (so the LLM doesn't need to crunch arithmetic
  // across 100 respondents — it focuses on qualitative synthesis)
  const variantStatsBlock = variantStats
    ? `\n\nPRECOMPUTED QUANTITATIVE STATS (use these verbatim — do not recompute):\n${JSON.stringify(variantStats)}`
    : "";

  if (hasVariants && method === "survey") {
    const variants = instrument.variants!.items;
    const variantLabel = instrument.variants!.label;
    const interp = interpretation as Record<string, unknown>;
    const successCriteria = (interp.successCriteria as string) ?? "Not specified";
    const evaluationSubject = (interp.evaluationSubject as string) ?? variantLabel;
    return `Synthesize a formal concept-test research report from this synthetic panel data. The variant type being compared is "${variantLabel}".

EVALUATION SUBJECT: ${evaluationSubject}
SUCCESS CRITERIA (what 'good' looks like): ${successCriteria}

WRITE FOR A PM WHO HAS TO MAKE A SHIP/NO-SHIP DECISION TOMORROW. Connect every finding to a concrete decision. Use the variant label "${variantLabel}" in section headers and analysis (e.g. "Detailed ${variantLabel} Analysis", "Cross-${variantLabel} Patterns", "Recommended ${variantLabel}").

RESEARCH HYPOTHESIS: ${(interp.restatedHypothesis as string) ?? ctx.hypothesis}
${interp.restatedResearchQuestion ? `RESEARCH QUESTION: ${interp.restatedResearchQuestion}\n` : ""}PRODUCT: ${ctx.productDescription}
AUDIENCE: ${ctx.targetAudience}

PERSONA CLUSTERS:
${personas.map((p) => `${p.name} (~${p.sampleSize}%): ${p.description}`).join("\n")}

VARIANTS TESTED (${variants.length}):
${variants.map((v) => `[${v.id}] "${v.text}"`).join("\n")}

INSTRUMENT QUESTIONS:
${instrument.questions.map((q) => `[${q.id}] ${q.text}${q.perVariant ? " (per-variant)" : ""}`).join("\n")}

${panelSummary}${variantStatsBlock}

Compute and synthesize an ADRS-quality concept test report. Return JSON with this exact schema:
{
  "background": "1-2 sentences restating the research context",
  "executiveSummary": "2-3 sentence top-level summary including the headline finding (e.g., 'no clear winner' or 'V3 outperformed others')",
  "qualitativeOverview": "2-3 paragraphs synthesizing the major qualitative themes that cut across variants. Reference specific variants as examples. Note tensions, surprising patterns, and what voices emerged.",
  "participantProfile": {
    "cohorts": [{"name": "...", "count": <int>, "percent": <num>, "characteristics": "1-line description derived from the persona cluster's actual narrativeProfile — NOT invented"}]
    // ANTI-HALLUCINATION RULE: Do NOT invent meanAge, medianAge, ageDistribution, languageDistribution, topTools, or topContentTypes UNLESS those exact values are present in persona dimension values or panel data. If you cannot point to specific source data, OMIT the field entirely from the JSON. A skeletal profile with just cohorts is correct. A profile with fabricated "Mean age: 31.6" or "Hindi: 89%" is WRONG.
    // Only include the optional fields below if the persona dimensions explicitly contain age bands, languages, tools, or content types. Otherwise, OMIT them.
    // "meanAge": <only if derivable from dimensions>,
    // "ageDistribution": [<only if dimensions include age bands>],
    // "languageDistribution": [<only if dimensions include language preferences>],
    // "topTools": [<only if dimensions or panel data mention tools>],
    // "topContentTypes": [<only if data mentions content types>]
  },
  "variantPerformance": [
    {
      "variantId": "v1",
      "variantText": "the variant text exactly",
      "averageRating": <number 1-5>,
      "interestPercent": <% of respondents who answered Agree or Strongly Agree on intent-to-try>,
      "ratingDistribution": [{"rating": 5, "count": <int>, "percent": <num>}, {"rating": 4, ...}, ...all 5 ratings...],
      "topPositives": [
        {"category": "Named reason category", "count": <int>, "themes": "1-2 sentence theme summary", "quotes": ["actual quote 1", "actual quote 2"]},
        ...exactly 3 entries...
      ],
      "topNegatives": [
        {"category": "...", "count": <int>, "themes": "...", "quotes": ["...", "..."]},
        ...exactly 3 entries...
      ],
      "narrative": "2-3 paragraph analyst narrative on WHY this variant performed as it did. Reference specific sentiment categories and quotes. Connect positives to strengths, negatives to vulnerabilities."
    },
    ...one entry per variant...
  ],
  "crossThemes": [
    {"title": "Descriptive theme title (e.g., 'The Power of Aspiration vs. The Risk of Ambiguity')", "analysis": "1-2 paragraph analysis surfacing a tension or trade-off across variants, referencing specific variants as evidence"},
    ...3 entries...
  ],
  "strategicTakeaways": [
    {"principle": "Bold strategic principle (e.g., 'Position the tool as enhancing existing talent')", "explanation": "1-2 sentence supporting explanation with data hook"},
    ...3 entries...
  ],
  "adrsRecommendation": {
    "taglineId": "v? (the recommended variant id, regardless of variant type)",
    "taglineText": "the recommended variant text",
    "supportingFactors": ["factor 1", "factor 2", "factor 3"],
    "primaryRecommendation": "Single sentence: '[Tagline]' — [one-line rationale]",
    "rationale": "1-2 sentence justification connecting to data"
  },
  "keyFindings": [
    {"theme": "...", "summary": "...", "evidence": ["...", "..."], "sentiment": "positive|negative|mixed|neutral"},
    ...3-5 entries — these are higher-level themes for a generic findings section...
  ],
  "recommendations": ["actionable rec 1", "actionable rec 2", ...3-5...],
  "methodologyNote": "2-3 sentences: synthetic survey, N respondents, randomized variant order, persona-grounded simulation"
}

CRITICAL DATA RULES:
- Use the PRECOMPUTED stats above verbatim for averageRating, interestPercent, ratingDistribution. Do not recompute or invent numbers.
- Quotes in topPositives/topNegatives MUST be actual quotes pulled from the open_ended answers in the panel. Pick the most vivid, specific, grounded ones. NEVER fabricate quotes.
- Sentiment row counts should sum approximately to the panel size for that variant.
- Distribution percents per variant should sum to ~100.
- Cohort counts in participantProfile should reflect the actual panel composition (use cluster sample sizes).
- DEMOGRAPHIC STATS ANTI-HALLUCINATION: meanAge/languageDistribution/topTools/topContentTypes percentages must NOT be invented. If the persona dimensions don't contain these values, OMIT those fields from the JSON entirely. Better to ship a skeletal profile than a fabricated one.`;
  }

  // Generic non-concept-test synthesis. Emits the same rich report-card
  // sections (participantProfile / crossThemes / strategicTakeaways) as the
  // ADRS branch so a survey report on a non-variant study renders fully in
  // ReportPanel without post-hoc augmentation. variantPerformance and
  // adrsRecommendation only apply when variants exist — omitted here.
  const ctxOut = ctx as ResearchContext;
  return `Synthesize the following research data into a structured insights report.

RESEARCH CONTEXT:
${JSON.stringify(interpretation, null, 2)}

ORIGINAL TARGET AUDIENCE (for participantProfile.cohorts):
${ctxOut.targetAudience}

PERSONA CLUSTERS (one cohort per cluster; counts available from cluster.sampleSize * panelSize):
${personas
  .map(
    (p) =>
      `- ${p.name} (sampleSize ${p.sampleSize}%): ${p.description}`
  )
  .join("\n")}

RESEARCH INSTRUMENT:
${instrument.title}
Questions: ${instrument.questions.map((q) => q.text).join(" | ")}

${panelSummary}

Return a JSON object with this exact schema:
{
  "background": "1-2 sentences restating the research context",
  "executiveSummary": "2-3 sentence top-level summary",
  "qualitativeOverview": "2-3 paragraphs of major themes across the panel",
  "participantProfile": {
    "cohorts": [
      {"name": "<cluster name verbatim>", "count": <int>, "percent": <0-100>, "characteristics": "1-sentence description"}
    ]
    // OPTIONAL: meanAge, medianAge, ageDistribution, languageDistribution, topTools, topContentTypes
    // — include ONLY if persona dimensions explicitly contain age bands / languages / tools / content types.
    // Do NOT fabricate demographic stats. Skeletal profile with just cohorts is correct when in doubt.
  },
  "crossThemes": [
    {"title": "Cross-cohort theme 1", "analysis": "1-2 paragraphs surfacing a tension or trade-off the panel revealed across cohorts"}
    // 2-4 entries total
  ],
  "strategicTakeaways": [
    {"principle": "Short imperative principle", "explanation": "1-2 sentence elaboration tied to panel data"}
    // 2-4 entries total
  ],
  "keyFindings": [
    {"theme": "...", "summary": "...", "evidence": ["actual quote 1", "actual quote 2"], "sentiment": "positive|negative|mixed|neutral", "supportingData": "optional quant"}
    // 3-5 findings
  ],
  "recommendations": ["specific actionable rec", "...3-5 total..."],
  "methodologyNote": "2-3 sentences: method, panel size, persona approach"
}

RULES:
- Findings must be grouped by THEME, not by question. Evidence must quote ACTUAL respondents — do not paraphrase, do not invent.
- participantProfile.cohorts.count must reflect the actual panel composition (use cluster sampleSize as a percentage of total panel size).
- crossThemes are TENSIONS — places where cohorts diverge or where a single signal has two sides. They are not summaries of single findings.
- strategicTakeaways are forward-looking principles a PM could apply to the next decision, derived from the panel — not generic best practices.
- DEMOGRAPHIC ANTI-HALLUCINATION: meanAge / languageDistribution / topTools / topContentTypes must NOT be invented. If persona dimensions don't explicitly contain those values, OMIT those fields entirely. A skeletal profile is correct.`;
}

export const CONFIDENCE_SYSTEM = `You are an independent ADRS research quality analyst. You evaluate research findings for robustness, biases, and alignment with broader market signals.

Be rigorous and honest. A high score (80+) requires strong, consistent, well-grounded findings.

Studies vary widely in quality. Your score must reflect the actual evidence in front of you — be willing to score in the 30s or the 90s when warranted. A panel of 10 respondents with high convergence and a clean narrative arc is NOT the same as a panel of 200 with diverse cohorts and consistent qualitative-quantitative alignment. Treat them differently.

Always respond with valid JSON matching the specified schema.`;

function getStudyTypeRelevantDimensions(studyType?: string): string {
  switch (studyType) {
    case "variant_comparison":
    case "positioning_test":
    case "concept_test":
      return `This study measures: variant preference, comparative resonance, segment-level differentiation, language/cultural reactions, decision-driving elements.`;
    case "concept_validation":
      return `This study measures: desirability of the concept, fit with user workflows, value perception, adoption likelihood, barriers to use.`;
    case "workflow_evaluation":
      return `This study measures: flow clarity, step-level friction, expectation matching, completion confidence, drop-off risks.`;
    case "feature_assessment":
      return `This study measures: feature reception, perceived utility, comparison to current solutions, improvement priorities, recommendation likelihood.`;
    default:
      return `This study measures: general attitudinal signal, segment-level preferences, qualitative themes.`;
  }
}

function getStudyTypeIrrelevantDimensions(studyType?: string): string {
  switch (studyType) {
    case "variant_comparison":
    case "positioning_test":
    case "concept_test":
      return `- Missing price sensitivity analysis (not a pricing study)
- Missing competitive feature analysis (not a competitive study)
- Missing usability/task completion data (not a behavioral study)
- Missing willingness-to-pay (not a pricing study)
- Missing market sizing data (not a market research study)`;
    case "concept_validation":
      return `- Missing exact pricing data
- Missing usability task completion
- Missing competitive benchmark data
- Missing ROI calculations`;
    case "workflow_evaluation":
      return `- Missing variant comparison (single flow being tested)
- Missing market positioning data
- Missing pricing sensitivity
- Missing brand perception`;
    case "feature_assessment":
      return `- Missing visual variant comparison
- Missing exact pricing thresholds
- Missing ad-creative effectiveness`;
    default:
      return `- Missing data on dimensions not tested by this instrument`;
  }
}

export function buildConfidencePrompt(
  primaryFindings: object,
  method: ResearchMethod,
  panelSize: number,
  hypothesis: string,
  studyType?: string
): string {
  return `Evaluate the following primary research findings and assign a confidence score.

HYPOTHESIS BEING TESTED:
${hypothesis}

STUDY TYPE: ${studyType ?? "general"}
METHOD: ${method} | PANEL SIZE: ${panelSize} synthetic respondents

PRIMARY FINDINGS:
${JSON.stringify(primaryFindings, null, 2)}

# WHAT THIS STUDY MEASURES (do not penalize for missing other things)

${getStudyTypeRelevantDimensions(studyType)}

# WHAT TO EVALUATE

Score these FOUR dimensions (each 0–100, equally weighted):

1. INTERNAL CONSISTENCY — Do quantitative ratings match qualitative themes? If ratings are high but qualitative is negative, that's inconsistent.

2. CROSS-PERSONA STABILITY — Do findings hold across persona segments, or are they driven by one outlier cluster?

3. SECONDARY ALIGNMENT — Do findings align with what's known about this market/domain from general knowledge?

4. METHODOLOGICAL FIT — Is the method appropriate for what was tested? Given THIS study type's relevant dimensions (listed above), is the instrument fit-for-purpose?

# WHAT NOT TO PENALIZE

DO NOT lower the score for any of these:
${getStudyTypeIrrelevantDimensions(studyType)}

These are NOT failures of this study — they are out of scope by design. If the LLM finds itself wanting to flag one of the above, it must STOP and not include it in biasFlags or limitationFactors.

# BIAS FLAGS TO LOOK FOR (these ARE relevant to all synthetic studies)

- Over-positivity: ratings too clean/clustered without variance
- Hallucinated specifics: invented percentages, brand names, demographic statistics, or competitive claims that have no source in the panel data
- Narrative coherence over messiness: synthetic data that tells a "too clean" story
- Persona drift: responses that don't reflect stated persona predispositions
- Convergence: respondents that all reach the same conclusion

# CONVERGENCE DETECTION (specific quantitative thresholds — flag and score down when triggered)

- If any single variant has >60% of respondents rating it 4 or 5 AND <10% rating it 1 or 2 → that is HIGH-RISK convergence on a winner. Flag in biasFlags and score down 5-10 points unless the qualitative data shows clear, varied, persona-grounded reasons for the consensus.
- If >65% of respondents pick the same option in a forced-choice / multiple_choice cross-variant question → that is HIGH-RISK forced-choice convergence. Flag and score down 5-10 points.
- If the mean rating spread across variants is <0.5 points on a 1-5 scale (e.g. all variants average 3.5-4.0) → that is HIGH-RISK undifferentiated panel. Flag and consider scoring in the 50s.
- If quote text in topPositives / topNegatives shows the same 3-4 phrases repeated across multiple respondents → that is HIGH-RISK language-template convergence. Flag in biasFlags.
- For interview studies: if 3+ respondents use identical sentence structures or vocabulary in their open-ended answers → that is HIGH-RISK persona-prompt leakage. Flag in biasFlags.

Return JSON:
{
  "score": <0-100>,
  "reasoning": "2-3 sentence holistic explanation of the score",
  "biasFlags": ["specific bias risk 1", "...", "..."],
  "alignmentNotes": "How well do these findings align with broader market knowledge?",
  "strengthFactors": ["factor 1", "...", "..."],
  "limitationFactors": ["factor 1", "...", "..."]
}

biasFlags and limitationFactors MUST be RELEVANT to this study type. Out-of-scope dimensions listed above are FORBIDDEN entries.

Scoring guide:
- 80–100: Very strong, consistent, well-grounded findings
- 60–79: Solid findings with some gaps or minor inconsistencies
- 40–59: Moderate confidence; directionally useful but requires validation
- 20–39: Low confidence; significant biases, weak signals, major gaps
- 0–19: Not reliable; fundamental issues

WORKED EXAMPLES (anchor on the LOGIC of these, not the numbers themselves):

Example A — score: 92
A 200-person tagline study across 4 cohorts. Ratings span 1.8–4.6 across variants. Qualitative themes align: the high-rated variant has positive themes about clarity and speed; the low-rated one has negative themes about vagueness. Persona predispositions show through (skeptics rated lower). Internally consistent, methodologically sound, sample-size adequate. Score: 92.

Example B — score: 78
A 60-person feature-priority MaxDiff study. Forced-rankings produce a clear top-2 but 3rd-5th places are within margin-of-error. Open-ended responses on the top-ranked feature are specific and varied. Some persona segments under-represented. Solid signal, with one obvious limitation around segment depth. Score: 78.

Example C — score: 55
A 30-person concept-test where 25 respondents rate variant 1 at 5/5 and variant 2 at 1/5 with similar wording across responses ("this is exactly what we need" / "this is terrible"). Suspicious uniformity. Likely Hämäläinen-Journey or persona-spec under-differentiation. Directionally useful but you cannot trust the magnitude. Score: 55.

Example D — score: 32
A 12-person survey where 10 of 12 respondents pick variant 3 across every question, qualitative themes are short and generic ("good", "bad", "fine"), no persona-segment variation visible, and the study tested 7 variants on a panel that's too small to distinguish any of them statistically. Confidence is low because the design itself can't support stronger conclusions. Score: 32.

ANTI-ANCHOR REMINDER — READ BEFORE SCORING:
DO NOT default to 70-something. The temptation to score around 72 is real — resist it. Apply the examples above:
- Small panel (n<20)? Score in the 30s–50s.
- Extreme convergence (everyone agrees)? Score in the 40s–60s.
- Methodology gaps (wrong method for question)? Score in the 30s–50s.
- Large diverse panel with internally-consistent findings? Score in the 80s–90s.
Your score should fall outside 65–75 the MAJORITY of the time. If you keep ending up in that range, you are not differentiating studies.`;
}
