import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Brand palette (provided by user)
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
        yellow: {
          DEFAULT: "#FEFC2F",
          50: "#3A380A",
          100: "#5C5A12",
          300: "#C9C424",
          500: "#FEFC2F",
          700: "#FFFD7B",
        },
        harvest: {
          DEFAULT: "#F57A00",
          50: "#3A1D00",
          100: "#5C2D00",
          300: "#B85B00",
          500: "#F57A00",
          700: "#F89D45",
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
        scarlet: {
          DEFAULT: "#F5371F",
          50: "#3A0E08",
          100: "#5C160C",
          300: "#B82817",
          500: "#F5371F",
          700: "#F76858",
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
          base: "#020d20",
          deep: "#010818",
          raised: "#0A1838",
          elevated: "#122046",
          inset: "#050f24",
        },
        ink: {
          high: "#F0F4FF",
          mid: "#B5C0DD",
          low: "#7986A8",
          dim: "#4A5478",
        },
        line: {
          DEFAULT: "rgba(255, 255, 255, 0.06)",
          strong: "rgba(255, 255, 255, 0.10)",
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
        "glow-yellow": "0 0 22px rgba(254, 252, 47, 0.30), 0 0 8px rgba(254, 252, 47, 0.15)",
        "glow-orange": "0 0 22px rgba(245, 122, 0, 0.40), 0 0 8px rgba(245, 122, 0, 0.20)",
        "glow-scarlet": "0 0 22px rgba(245, 55, 31, 0.40), 0 0 8px rgba(245, 55, 31, 0.20)",

        // Soft outer glow for primary buttons
        "btn-magenta": "0 4px 12px rgba(231, 83, 254, 0.35), 0 2px 4px rgba(231, 83, 254, 0.2), inset 0 1px 0 rgba(255,255,255,0.18)",
      },
      backgroundImage: {
        "prism-gradient": "linear-gradient(90deg, #2CC5F7, #FEFC2F, #F57A00, #E753FE, #F5371F)",
        "prism-gradient-vert": "linear-gradient(180deg, #2CC5F7, #FEFC2F, #F57A00, #E753FE, #F5371F)",
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
