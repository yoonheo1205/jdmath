/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./**/*.{js,ts,jsx,tsx}", // Include root-level files (App.tsx, components/, etc.)
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

