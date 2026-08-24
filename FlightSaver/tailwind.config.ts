import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brave: {
          50: "#faf5ff",
          100: "#f3e8ff",
          200: "#e9d5ff",
          300: "#d8b4fe",
          400: "#c084fc",
          500: "#a855f7",
          600: "#9333ea",
          700: "#7e22ce",
          800: "#6b21a8",
          900: "#581c87",
          950: "#2e1065",
        },
        fuchsiaAccent: {
          500: "#ec4899",
          600: "#db2777",
          700: "#be185d",
        },
        indigoAccent: {
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
        }
      },
    },
  },
  plugins: [],
};

export default config;
