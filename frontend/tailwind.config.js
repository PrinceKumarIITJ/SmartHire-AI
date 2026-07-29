/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0d0f17",
        surface: "#161926",
        card: "#1e2235",
        primary: {
          DEFAULT: "#6366f1",
          hover: "#4f46e5",
          light: "#818cf8"
        },
        accent: {
          DEFAULT: "#ec4899",
          green: "#10b981",
          amber: "#f59e0b",
          red: "#ef4444"
        }
      }
    },
  },
  plugins: [],
}
