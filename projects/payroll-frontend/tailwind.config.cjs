/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  daisyui: {
    themes: [
      'lofi',
      {
        zeril: {
          "primary": "#FAFAF7",
          "primary-content": "#0A0A0A",
          "secondary": "#1A1A1A",
          "secondary-content": "#FAFAF7",
          "accent": "#FAFAF7",
          "accent-content": "#0A0A0A",
          "neutral": "#1A1A1A",
          "neutral-content": "#FAFAF7",
          "base-100": "#0A0A0A",
          "base-200": "#111111",
          "base-300": "#1A1A1A",
          "base-content": "#FAFAF7",
          "info": "#38BDF8",
          "success": "#4ADE80",
          "warning": "#FBBF24",
          "error": "#F87171",
        },
      },
    ],
    logs: false,
  },
  plugins: [require('daisyui')],
}
