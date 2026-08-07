/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: '#0A0A0C',
        onyx: '#131316',
        graphite: '#1C1C21',
        graphite2: '#232329',
        bronze: '#8C6A1E',
        gold: '#D4AF37',
        champagne: '#F5D98B',
        ivory: '#EDE7D6',
        muted: '#8A857A',
        good: '#7BC49A',
        warn: '#E0B15A',
        bad: '#D08A7A',
      },
      fontFamily: {
        cinzel: ['Cinzel', 'serif'],
        cormorant: ['"Cormorant Garamond"', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        // Signature faces — used when someone types their signature.
        dancing: ['"Dancing Script"', 'cursive'],
        vibes: ['"Great Vibes"', 'cursive'],
      },
    },
  },
  plugins: [],
}
