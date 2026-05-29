export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        display: [
          "Manrope",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
      },
      screens: {
        xs: "475px",
      },
      colors: {
        primary: {
          50: "#e8f2ff",
          400: "#4d9fff",
          500: "#0077ed",
          600: "#0066cc",
          700: "#0058b0",
        },
        dark: {
          bg: "#0a0a0f",
          surface: "#111118",
          card: "#16161f",
          border: "#1e1e2a",
          hover: "#1c1c28",
          muted: "#2a2a38",
        },
      },
      keyframes: {
        "slide-in": {
          "0%": { opacity: "0", transform: "translateX(100%)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
      animation: {
        "slide-in": "slide-in 0.25s ease-out",
      },
    },
  },
  plugins: [],
};
