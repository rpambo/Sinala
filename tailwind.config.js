/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        sinala: {
          navy: '#0a122a',
          blue: '#536ae8',
          cyan: '#20b9ca',
          teal: '#42d4c3',
          surface: '#f7f9fb',
          text: '#17213a',
        },
      },
    },
  },
  plugins: [],
};
