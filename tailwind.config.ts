import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "blue-spruce": "var(--color-blue-spruce)",
        spruce: "var(--color-blue-spruce)",
        "navy-blue": "var(--color-navy-blue)",
        navy: "var(--color-navy-blue)",
        "brand-black": "var(--color-black)",
        turquoise: "var(--color-turquoise)",
        sky: "var(--color-sky)",
        "light-gray": "var(--color-light-gray)",
        midnight: "var(--color-midnight)",
        poppy: "var(--color-poppy)",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
      },
      fontFamily: {
        display: "var(--font-display)",
        stat: "var(--font-stat)",
        body: "var(--font-body)",
      },
    },
  },
  plugins: [animate],
} satisfies Config;
