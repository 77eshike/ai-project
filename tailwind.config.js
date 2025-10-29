// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#4a6cf7',
          purple: '#7b53c1',
          lightBlue: '#6e8efb',
          lightPurple: '#a777e3'
        }
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #4a6cf7 0%, #7b53c1 100%)',
        'gradient-button': 'linear-gradient(135deg, #6e8efb 0%, #a777e3 100%)'
      },
      animation: {
        'float-slow': 'float 15s ease-in-out infinite',
        'float-medium': 'float 10s ease-in-out infinite',
        'float-fast': 'float 8s ease-in-out infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'pulse-medium': 'pulse 2s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { 
            transform: 'translateY(0px) translateX(0px) rotate(0deg)',
            opacity: '0.3'
          },
          '33%': { 
            transform: 'translateY(-30px) translateX(15px) rotate(120deg)',
            opacity: '0.5'
          },
          '66%': { 
            transform: 'translateY(20px) translateX(-20px) rotate(240deg)',
            opacity: '0.4'
          }
        }
      }
    },
  },
  plugins: [],
}