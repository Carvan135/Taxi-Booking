import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        DEFAULT: "0.75rem",
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "#1E3A5F",
          foreground: "#F8FAFC",
        },
        secondary: {
          DEFAULT: "#2563EB",
          foreground: "#F8FAFC",
        },
        accent: {
          DEFAULT: "#F8FAFC",
          foreground: "#1E293B",
        },
        content: {
          DEFAULT: "#1E293B",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
