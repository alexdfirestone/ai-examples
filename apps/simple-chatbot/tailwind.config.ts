import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/streamdown/dist/**/*.js",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;
