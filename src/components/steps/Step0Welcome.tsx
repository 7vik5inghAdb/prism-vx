"use client";

import { useState } from "react";
import {
  ArrowRight,
  Sparkles,
  Scale,
  ListOrdered,
  Eye,
  ClipboardList,
  PencilLine,
  Loader2,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type {
  ResearchContext,
  ResearchMethod,
  Step,
  StepStatus,
} from "@/types";

interface UseCase {
  slug: string;
  title: string;
  blurb: string;
  studyTypeChip: string;
  icon: React.ElementType;
  accent: string;
  seedContext: ResearchContext;
  seedMethod?: ResearchMethod;
}

const USE_CASES: UseCase[] = [
  {
    slug: "firefly-creator-offer",
    title: "Subscriber survey — Firefly Creator Offer",
    blurb:
      "Recreation of an Adobe ADRS study: who subscribed to the new Firefly Creator Offer plans, why, and how satisfied they are. 105-respondent survey, Standalone vs Multi-Plan.",
    studyTypeChip: "Attitudinal survey",
    icon: ClipboardList,
    accent: "from-magenta/15 to-sky/10 border-magenta/30",
    seedContext: {
      hypothesis:
        "Adobe's new Firefly \"Creator Offer\" paid plans are successfully attracting the intended \"Creator\" audience — Enthusiastic Creative Hobbyists (ages 13-24) and Monetizing Social Creators — and the subscribers who signed up are satisfied with the generative-AI value the plan delivers.",
      researchQuestion:
        "Who is actually subscribing to the new Firefly Creator Offer plans, what motivated them to sign up, what creative work do they use Firefly for, and how satisfied are they? How do Firefly Standalone subscribers (Creator Offer only) differ from Multi-Plan subscribers (Creator Offer plus other Creative Cloud plans)?",
      productDescription:
        "Adobe Firefly \"Creator Offer\" — Adobe's new Firefly paid plans: Firefly Standard (FFST), Firefly Pro (FFPO), and Firefly Premium (FFPU). They can be purchased as a standalone Firefly subscription or alongside other Creative Cloud plans. Each plan provides access to Adobe's Firefly generative-AI model, monthly generative credits, generative features inside digital-imaging apps, high-precision AI editing, the Firefly web app and Boards, and recently-added third-party AI models (Gemini, Nano Banana, Flux, GPT-Image). Sold via direct-to-paid and free-to-paid funnels.",
      targetAudience:
        "USA-based, English-speaking subscribers to the new Firefly Creator Offer paid plans (FFST/FFPO/FFPU), including those who also hold other Creative Cloud plans. The base splits ~41% Firefly Standalone / ~59% Multi-Plan; from prior Firefly research it skews 45+ and toward Photo Hobbyists, Business Professionals, and Creative Professionals rather than the youth \"Creator\" segments.",
      objectives:
        "Profile who is subscribing vs Adobe's official Creator definitions; understand sign-up motivation and the projects they bought the plan for; measure satisfaction and the top value drivers and detractors; compare Firefly Standalone vs Multi-Plan subscribers; assess whether third-party models and credit packs are landing.",
    },
    seedMethod: "survey",
  },
  {
    slug: "adobe-tagline",
    title: "Tagline test — Adobe Express (India)",
    blurb:
      "Five tagline variants (Hindi & English) for a consumer creative tool. Compare resonance across four Indian audience cohorts.",
    studyTypeChip: "Variant comparison",
    icon: Sparkles,
    accent: "from-magenta/20 to-magenta/5 border-magenta/30",
    seedContext: {
      hypothesis:
        "A tagline that combines emotional resonance with practical clarity will outperform purely aspirational or purely functional taglines.",
      researchQuestion:
        "Which tagline messaging strategy best balances broad appeal, emotional resonance, and a compelling value proposition?",
      productDescription:
        "Adobe Express — a consumer-facing creative design tool for people with light creative needs.",
      targetAudience:
        "People in India who regularly use creative tools for light design needs. Four cohorts: Massy Consumer (51%), Small Business (32%), Students (17%), Creators (overlapping).",
      objectives:
        "Identify the most effective tagline messaging strategy for the Indian market.",
      variantTypeLabel: "Tagline",
      variants: [
        { id: "v1", description: "Magic of design. In your hands." },
        { id: "v2", description: "Ek click mein design" },
        { id: "v3", description: "Ab India karega design" },
        { id: "v4", description: "Now anyone can design" },
        { id: "v5", description: "Empowering Indians to design" },
      ],
      attachments: [],
    },
    seedMethod: "survey",
  },
  {
    slug: "pricing-tier",
    title: "Pricing trade-off — SaaS team plans",
    blurb:
      "Three pricing bundles for a project-management SaaS. Identify the highest-revenue plan via Conjoint trade-offs.",
    studyTypeChip: "Conjoint",
    icon: Scale,
    accent: "from-sky/20 to-sky/5 border-sky/30",
    seedContext: {
      hypothesis:
        "Mid-market teams will pay 30% more for a tier that bundles SSO and audit logs together, even if storage is identical to the lower tier.",
      researchQuestion:
        "Which pricing bundle structure (price × features) produces the strongest stated purchase intent in mid-market teams of 10–50?",
      productDescription:
        "A project-management SaaS used by software & operations teams; existing plans are Basic ($8/seat) and Pro ($24/seat).",
      targetAudience:
        "IT, ops, and engineering decision-makers at companies with 10–50 employees, currently using either a self-hosted tool or a competing SaaS.",
      objectives:
        "Choose the bundle structure for a new \"Team Plus\" tier to launch next quarter. Identify which features have the highest willingness-to-pay leverage.",
      variantTypeLabel: "Pricing bundle",
      variants: [
        {
          id: "v1",
          description:
            "$18/seat — Basic features + 100 GB storage + email support",
        },
        {
          id: "v2",
          description:
            "$24/seat — Basic + 250 GB + SSO + advanced reports + chat support",
        },
        {
          id: "v3",
          description:
            "$32/seat — Basic + 500 GB + SSO + audit logs + advanced reports + dedicated CSM",
        },
      ],
    },
    seedMethod: "conjoint",
  },
  {
    slug: "feature-prio",
    title: "Feature priority — MaxDiff",
    blurb:
      "Six candidate features for an internal analytics tool. Force-rank importance to find the top two to ship next.",
    studyTypeChip: "MaxDiff",
    icon: ListOrdered,
    accent: "from-green-500/20 to-green-500/5 border-green-500/30",
    seedContext: {
      hypothesis:
        "Self-serve dashboards and Slack alerts are the highest-value next features — even more than tighter spreadsheet exports.",
      researchQuestion:
        "Among six candidate features, which two would deliver the most value to data-savvy operators in mid-market companies?",
      productDescription:
        "An internal analytics tool used by ops, growth, and product teams to query their warehouse without SQL.",
      targetAudience:
        "Operators (ops, growth, product) at mid-market companies who use a BI tool weekly but aren't SQL experts.",
      objectives:
        "Pick the two features to commit to the next 6-week cycle. Defer or kill the rest.",
      variantTypeLabel: "Feature",
      variants: [
        { id: "v1", description: "Self-serve dashboard builder (drag-and-drop)" },
        { id: "v2", description: "Slack-based alert subscriptions" },
        { id: "v3", description: "Native spreadsheet export with formulas preserved" },
        { id: "v4", description: "AI-generated query explanations" },
        { id: "v5", description: "Shared workspaces with role-based permissions" },
        { id: "v6", description: "Mobile read-only views" },
      ],
    },
    seedMethod: "maxdiff",
  },
  {
    slug: "concept-feedback",
    title: "Concept test — new product page",
    blurb:
      "Two visual concepts for a redesigned product page. Get qualitative + quantitative feedback before engineering.",
    studyTypeChip: "Concept testing",
    icon: Eye,
    accent: "from-red-500/20 to-red-500/5 border-red-500/30",
    seedContext: {
      hypothesis:
        "A concept that leads with social proof above the fold will outperform a feature-grid layout on intent-to-purchase.",
      researchQuestion:
        "Which of these two product-page concepts is more likely to convert first-time visitors into a free trial?",
      productDescription:
        "An e-commerce subscription service for premium ground coffee, delivered monthly.",
      targetAudience:
        "US adults aged 25–55 who drink at least one cup of coffee daily and have purchased coffee online in the last 12 months.",
      objectives:
        "Pick the lead concept for engineering. Secondary: identify the strongest individual elements (testimonials, photography, pricing display, etc.).",
      variantTypeLabel: "Concept",
      variants: [
        {
          id: "v1",
          description:
            "Concept A — Social-proof hero (large testimonial quote + 4.8★ rating + cup photography) followed by 3-step explainer.",
        },
        {
          id: "v2",
          description:
            "Concept B — Feature-grid hero (6-tile grid of flavors, roast levels, origins, equipment, shipping schedule, gift options).",
        },
      ],
    },
    seedMethod: "concept_test",
  },
];

const COMPLETED_STATUSES: Record<Step, StepStatus> = {
  1: "completed",
  2: "completed",
  3: "completed",
  4: "completed",
  5: "completed",
};

export function Step0Welcome() {
  const {
    setContext,
    setInterpretation,
    setSelectedMethod,
    advanceToStep,
    loadRunSnapshot,
  } = useAppStore();
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Card click: try to load a cached snapshot. If the snapshot exists, drop the
  // user at a fully-rendered Step 5 report. If it doesn't exist (e.g. snapshots
  // haven't been generated yet), fall back to seeding Step 1 and letting the
  // pipeline run live.
  const tryDemo = async (useCase: UseCase) => {
    setLoadingSlug(useCase.slug);
    setError(null);

    try {
      const res = await fetch(`/use-cases/${useCase.slug}.json`, {
        cache: "no-store",
      });

      if (res.ok) {
        const data = (await res.json()) as { state: Parameters<typeof loadRunSnapshot>[0] };
        if (data?.state?.report) {
          // Playback: load every step's cached output but start the user at
          // Step 1 so they click through the whole pipeline — no LLM calls.
          loadRunSnapshot(data.state, { playback: true });
          return;
        }
      }
    } catch {
      // Network or parse error — fall through to seed mode.
    } finally {
      setLoadingSlug(null);
    }

    // Fallback: seed Step 1 with the hand-authored context. The user reviews
    // the pre-filled form and submits; from there, Step 2-5 progresses
    // manually unless they enable Auto in the top bar.
    loadRunSnapshot({
      id: `demo-${useCase.slug}`,
      name: useCase.title,
      currentStep: 1,
      stepStatuses: { 1: "active", 2: "pending", 3: "pending", 4: "pending", 5: "pending" },
      context: useCase.seedContext,
      interpretation: null,
      personas: null,
      selectedMethod: useCase.seedMethod ?? null,
      instrument: null,
      panelResults: null,
      report: null,
      surveyPanelSize: 100,
      interviewPanelSize: 3,
    });
  };

  const startBlank = () => {
    setContext({
      hypothesis: "",
      researchQuestion: "",
      productDescription: "",
      targetAudience: "",
      objectives: "",
    });
    setInterpretation(null);
    setSelectedMethod(null);
    advanceToStep(1);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-base font-bold text-ink-high">
          Welcome to PRISM
        </h2>
        <p className="text-[12px] text-ink-mid leading-relaxed">
          Synthetic user research for product decisions. Try a sample study below — or start a fresh one.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {USE_CASES.map((uc) => {
          const Icon = uc.icon;
          const loading = loadingSlug === uc.slug;
          return (
            <button
              key={uc.slug}
              onClick={() => tryDemo(uc)}
              disabled={loading || loadingSlug !== null}
              className={cn(
                "neu-card-sm text-left p-3 group relative overflow-hidden",
                "bg-gradient-to-br",
                uc.accent,
                "border transition-all",
                "hover:scale-[1.01] hover:shadow-lg",
                "disabled:opacity-60 disabled:hover:scale-100"
              )}
            >
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-md bg-bg-raised flex items-center justify-center flex-shrink-0">
                  <Icon className="w-3.5 h-3.5 text-ink-high" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[8.5px] font-bold uppercase tracking-wider text-ink-mid bg-bg-raised/70 px-1.5 py-0.5 rounded">
                      {uc.studyTypeChip}
                    </span>
                  </div>
                  <p className="text-[12px] font-bold text-ink-high mb-1 leading-tight">
                    {uc.title}
                  </p>
                  <p className="text-[10.5px] text-ink-mid leading-snug">
                    {uc.blurb}
                  </p>
                </div>
                <div className="flex-shrink-0 self-center">
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 text-ink-low animate-spin" />
                  ) : (
                    <ArrowRight className="w-3.5 h-3.5 text-ink-low group-hover:translate-x-0.5 group-hover:text-ink-high transition-all" />
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={startBlank}
        className="neu-card-sm w-full text-left p-3 border border-line hover:border-magenta/40 transition-all flex items-center gap-2.5 group"
      >
        <div className="w-7 h-7 rounded-md bg-bg-raised flex items-center justify-center flex-shrink-0">
          <PencilLine className="w-3.5 h-3.5 text-ink-mid" />
        </div>
        <div className="flex-1">
          <p className="text-[12px] font-bold text-ink-high">
            Start from scratch
          </p>
          <p className="text-[10.5px] text-ink-mid">
            Enter your own hypothesis, audience, and variants.
          </p>
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-ink-low group-hover:translate-x-0.5 group-hover:text-ink-high transition-all" />
      </button>

      {error && (
        <p className="text-[10.5px] text-scarlet bg-scarlet/10 border border-scarlet/30 rounded p-2">
          {error}
        </p>
      )}
    </div>
  );
}
