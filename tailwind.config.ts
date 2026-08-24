import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0284c7",
          600: "#0369a1",
          700: "#075985",
          800: "#0c4a6e",
          900: "#082f49",
        },
        savings: {
          50: "#ecfdf5",
          100: "#d1fae5",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
        },
        accent: {
          amber: "#f59e0b",
          coral: "#f97316",
        }
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(239, 68, 68, 0.6)", transform: "scale(1)" },
          "50%": { boxShadow: "0 0 0 14px rgba(239, 68, 68, 0)", transform: "scale(1.05)" },
        },
        wave: {
          "0%": { transform: "scaleY(0.4)" },
          "50%": { transform: "scaleY(1)" },
          "100%": { transform: "scaleY(0.4)" },
        }
      },
      animation: {
        "pulse-glow": "pulseGlow 1.6s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "wave-bar": "wave 1.2s ease-in-out infinite",
      }
    },
  },
  plugins: [],
};

export default config;
