/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        unpaid: { bg: "#DCEAFE", text: "#1D4ED8" },
        paid: { bg: "#D5F2E3", text: "#15803D" },
        warn: { bg: "#FEF3C7", text: "#92400E" },
        danger: { bg: "#FDE2E1", text: "#B91C1C" },
      },
      borderRadius: { pill: "999px" },
    },
  },
  plugins: [],
};
