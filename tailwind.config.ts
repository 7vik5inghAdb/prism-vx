import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // ── Brand palette ─────────────────────────────────────────────────
        // Reduced to: navy bg + magenta + cyan + green shades + red shades.
        // Yellow and harvest are GONE. Scarlet is now an alias for red to
        // keep existing `text-scarlet/*` classes resolving — semantic intent
        // (error/danger) is unchanged.
        sky: {
          DEFAULT: "#2CC5F7",
          50: "#0E2A3A",
          100: "#0F3A52",
          200: "#11567C",
          300: "#1380B3",
          400: "#1FA9DD",
          500: "#2CC5F7",
          600: "#5DD3F8",
          700: "#8FE0FB",
        },
        magenta: {
          DEFAULT: "#E753FE",
          50: "#2A0E32",
          100: "#3D1349",
          200: "#5C1D6F",
          300: "#8A2DA8",
          400: "#B240D8",
          500: "#D14CF0",
          600: "#E753FE",
          700: "#EC78FE",
          800: "#F09BFF",
          900: "#F5BEFF",
        },
        green: {
          DEFAULT: "#22C55E",
          50: "#052E16",
          100: "#0A3F1F",
          200: "#14532D",
          300: "#15803D",
          400: "#16A34A",
          500: "#22C55E",
          600: "#4ADE80",
          700: "#86EFAC",
          800: "#BBF7D0",
          900: "#DCFCE7",
        },
        red: {
          DEFAULT: "#EF4444",
          50: "#450A0A",
          100: "#5C1313",
          200: "#7F1D1D",
          300: "#B91C1C",
          400: "#DC2626",
          500: "#EF4444",
          600: "#F87171",
          700: "#FCA5A5",
          800: "#FECACA",
          900: "#FEE2E2",
        },
        // Scarlet kept as an alias of red (errors) so existing consumers keep
        // resolving without manual sweeps. Map onto the same hex values as red.
        scarlet: {
          DEFAULT: "#EF4444",
          50: "#450A0A",
          100: "#5C1313",
          300: "#B91C1C",
          500: "#EF4444",
          700: "#FCA5A5",
        },

        // Brand → maps to magenta (existing prism-* class usage stays valid)
        prism: {
          50: "#2A0E32",
          100: "#3D1349",
          200: "#5C1D6F",
          300: "#8A2DA8",
          400: "#B240D8",
          500: "#D14CF0",
          600: "#E753FE",
          700: "#EC78FE",
          800: "#F09BFF",
          900: "#F5BEFF",
          950: "#1A0820",
        },

        // Semantic dark-theme surfaces
        bg: {
          base: "rgb(var(--bg-base) / <alpha-value>)",
          deep: "rgb(var(--bg-deep) / <alpha-value>)",
          raised: "rgb(var(--bg-raised) / <alpha-value>)",
          elevated: "rgb(var(--bg-elevated) / <alpha-value>)",
          inset: "rgb(var(--bg-inset) / <alpha-value>)",
        },
        ink: {
          high: "rgb(var(--ink-high) / <alpha-value>)",
          mid: "rgb(var(--ink-mid) / <alpha-value>)",
          low: "rgb(var(--ink-low) / <alpha-value>)",
          dim: "rgb(var(--ink-dim) / <alpha-value>)",
        },
        line: {
          DEFAULT: "var(--line-subtle)",
          strong: "var(--line-strong)",
          accent: "rgba(231, 83, 254, 0.20)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Consolas", "monospace"],
      },
      boxShadow: {
        // Neumorphic raised surface
        "neu-sm": "3px 3px 6px rgba(0,0,0,0.55), -2px -2px 5px rgba(255,255,255,0.025)",
        neu: "5px 5px 12px rgba(0,0,0,0.6), -3px -3px 8px rgba(255,255,255,0.03)",
        "neu-lg": "8px 8px 20px rgba(0,0,0,0.7), -5px -5px 14px rgba(255,255,255,0.035)",

        // Neumorphic inset (pressed)
        "neu-inset": "inset 3px 3px 6px rgba(0,0,0,0.55), inset -2px -2px 4px rgba(255,255,255,0.03)",
        "neu-inset-lg": "inset 5px 5px 10px rgba(0,0,0,0.6), inset -3px -3px 8px rgba(255,255,255,0.035)",

        // Glow accents (one per palette color)
        "glow-magenta": "0 0 22px rgba(231, 83, 254, 0.45), 0 0 8px rgba(231, 83, 254, 0.25)",
        "glow-sky": "0 0 22px rgba(44, 197, 247, 0.40), 0 0 8px rgba(44, 197, 247, 0.20)",
        "glow-green": "0 0 22px rgba(34, 197, 94, 0.40), 0 0 8px rgba(34, 197, 94, 0.20)",
        "glow-red": "0 0 22px rgba(239, 68, 68, 0.40), 0 0 8px rgba(239, 68, 68, 0.20)",
        // Aliases preserved so legacy shadow utilities keep resolving — they
        // now point to red/green glows so the visual stays in the new palette.
        "glow-yellow": "0 0 22px rgba(34, 197, 94, 0.40), 0 0 8px rgba(34, 197, 94, 0.20)",
        "glow-orange": "0 0 22px rgba(239, 68, 68, 0.40), 0 0 8px rgba(239, 68, 68, 0.20)",
        "glow-scarlet": "0 0 22px rgba(239, 68, 68, 0.40), 0 0 8px rgba(239, 68, 68, 0.20)",

        // Soft outer glow for primary buttons
        "btn-magenta": "0 4px 12px rgba(231, 83, 254, 0.35), 0 2px 4px rgba(231, 83, 254, 0.2), inset 0 1px 0 rgba(255,255,255,0.18)",
      },
      backgroundImage: {
        // Tightened to the new 3-color palette: cyan → magenta → green.
        // Loses the rainbow but matches the "fewer colors" directive.
        "prism-gradient": "linear-gradient(90deg, #2CC5F7, #E753FE, #22C55E)",
        "prism-gradient-vert": "linear-gradient(180deg, #2CC5F7, #E753FE, #22C55E)",
        "magenta-gradient": "linear-gradient(135deg, #E753FE 0%, #B240D8 100%)",
        "sky-gradient": "linear-gradient(135deg, #2CC5F7 0%, #1380B3 100%)",
        "card-gradient": "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 100%)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-in": "slideIn 0.35s ease-out",
        shimmer: "shimmer 1.8s infinite",
        "glow-pulse": "glowPulse 2.5s ease-in-out infinite",
      },
      keyframes: {
        slideIn: {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        glowPulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
