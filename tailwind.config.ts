import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        canvas: "#F4F5F9",
        surface: "#FFFFFF",
        slate: {
          850: "#172033",
        },
      },
      boxShadow: {
        soft: "0 2px 14px -2px rgba(15, 23, 42, 0.03)",
        card: "0 4px 24px -4px rgba(15, 23, 42, 0.04)",
        floating: "0 12px 36px -6px rgba(15, 23, 42, 0.14)",
      },
      borderRadius: {
        "2.5xl": "1.25rem", // 20px
        "3xl": "1.5rem",    // 24px
      },
    },
  },
  plugins: [],
};
export default config;
