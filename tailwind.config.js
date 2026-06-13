/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        paper: '#F7F5F0',
        card: '#FFFFFF',
        ink: '#1A1C22',
        'ink-soft': '#4A4E57',
        muted: '#898E98',
        line: '#E7E3DA',
        green: '#11795B',
        'green-soft': '#E6F1EC',
        amber: '#B8501C',
        'amber-soft': '#F7E8DC',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
