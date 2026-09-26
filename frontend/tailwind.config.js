/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        'none': '0',
        'sm': '0.25rem',     // 4px
        DEFAULT: '0.375rem', // 6px
        'md': '0.5rem',      // 8px (campuri / inputs / butoane)
        'lg': '0.625rem',    // 10px (butoane mari / select-uri)
        'xl': '0.75rem',     // 12px (carduri / blocuri medii)
        '2xl': '0.875rem',   // 14px (carduri KPI / sub-containere)
        '3xl': '1.125rem',   // 18px (containere principale / panouri mari)
        'full': '9999px',
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
      }
    },
  },
  plugins: [],
}
