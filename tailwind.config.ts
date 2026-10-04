import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        body: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
      },
      boxShadow: {
        'liquid-glow': '0 0 50px -10px rgba(56, 189, 248, 0.35)',
        'liquid-active': '0 0 35px 0 rgba(14, 165, 233, 0.45), inset 0 1px 2px rgba(255, 255, 255, 0.95)',
        'glass-inner': 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.75), inset 0 -1px 2px 0 rgba(255, 255, 255, 0.25)',
        'glass-elevated': '0 20px 40px -15px rgba(15, 23, 42, 0.08), 0 0 1px 1px rgba(255, 255, 255, 0.85)',
        'btn-shine': '0 4px 20px -2px rgba(14, 165, 233, 0.45), inset 0 1px 1px rgba(255, 255, 255, 0.7)',
        'voice-ring': '0 0 0 4px rgba(56, 189, 248, 0.25), 0 0 25px rgba(14, 165, 233, 0.55)',
        'pill-capsule': '0 25px 60px -10px rgba(56, 189, 248, 0.35), inset 0 2px 2px rgba(255, 255, 255, 0.9), inset 0 -3px 6px rgba(186, 230, 253, 0.6)',
        'card-glass': '0 16px 36px -10px rgba(30, 64, 175, 0.08), inset 0 1.5px 2px 0 rgba(255, 255, 255, 0.9)',
        'glass-edge': '0 8px 32px 0 rgba(31, 38, 135, 0.07), inset 0 1px 1px 0 rgba(255, 255, 255, 0.8), inset 0 -1px 2px 0 rgba(0, 0, 0, 0.04)',
        'glass-glow': '0 12px 40px -10px rgba(37, 99, 235, 0.18), inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.9)',
        'pill-active': '0 4px 14px 0 rgba(37, 99, 235, 0.35), inset 0 1px 0.5px rgba(255, 255, 255, 0.4)',
      },
    },
  },
  plugins: [],
};

export default config;
