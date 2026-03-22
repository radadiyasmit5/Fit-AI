/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#FF6B35",
        accent: {
          blue: "#0EA5E9",
          purple: "#8B5CF6",
          lime: "#AAFF00",
        },
        success: "#34C759",
        warning: "#FFD60A",
        error: "#FF453A",
        dark: {
          bg: "#0D0D0F",
          card: "#1C1C1E",
          surface: "#2C2C2E",
          border: "#3A3A3C",
          text: "#F2F2F7",
          muted: "#8E8E93",
        },
      },
    },
  },
  plugins: [],
};
